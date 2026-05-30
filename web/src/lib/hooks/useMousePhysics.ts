import Matter from "matter-js";
import { useEffect, useRef } from "react";

import { CAT_CHAIN } from "@/lib/physics/constants";
import { createCursorPusher } from "@/lib/physics/cursorPusher";
import { createDragMaskRestoreQueue } from "@/lib/physics/dragMaskRestore";
import { pickGrabbable } from "@/lib/physics/grabSelection";
import { useAppStore } from "@/lib/store/useAppStore";

// Cap how far the drag target may sit ahead of the grabbed body. A fast/far yank
// otherwise overstretches the stiff length-0 rope and the solver explodes
// (links spinning around themselves). The body still chases the cursor — it
// just trails by at most this, pulling steadily instead of snapping.
const MAX_DRAG_REACH = 100;

// Touch only: pixels a finger must travel before we resolve drag-vs-scroll.
// Below this on release → a tap (nudge). Past it, the dominant axis decides:
// horizontal commits a drag, vertical lets the page scroll (touch-action pan-y).
const TOUCH_SLOP = 14;
// Horizontal bias: a vertical-intended swipe with slight horizontal jitter
// should resolve as scroll, not falsely commit a drag. Require dx to dominate
// dy by 30 % before we lock in a drag; otherwise it's a scroll.
const TOUCH_AXIS_BIAS = 1.3;
// Sideways velocity a tap imparts, so a pure tap still makes a flask swing.
const TAP_NUDGE_VX = 3;

/**
 * Drag interaction for the flask rack on BOTH desktop and touch: press a flask
 * (or catch a chain link anywhere along the rope) and drag it; release to let
 * it swing. No ambient cursor-repel — just click/tap-and-drag.
 *
 * Uses Pointer Events so one path covers mouse + touch and we get
 * `pointercancel` for free (the browser fires it when it takes a touch over as
 * a scroll — exactly when we want to drop the drag). The drag is also dropped
 * on tab-switch, window blur and scroll, so a half-finished drag never "sticks"
 * with weird behaviour.
 *
 * Three concerns are split into helper modules under lib/physics:
 *  - `grabSelection`     — pickGrabbable / isGrabbable / GRAB_RADIUS
 *  - `dragMaskRestore`   — deferred-mask queue (chain pass-through on release)
 *  - `cursorPusher`      — "collide" mode's pusher body + momentum transfer
 */
export function useMousePhysics(
  engine: Matter.Engine,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const constraintRef = useRef<Matter.Constraint | null>(null);
  // Touch gesture lock: on touch we DON'T grab on pointerdown — we record the
  // start point and wait for the first move to read intent (horizontal → drag,
  // vertical → let the page scroll). Stays null on mouse (no scroll conflict).
  const pendingRef = useRef<{ x0: number; y0: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getWorldPos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const maskRestores = createDragMaskRestoreQueue(engine);
    const pusher = createCursorPusher(engine, () =>
      container.getBoundingClientRect(),
    );

    const startDrag = (clientX: number, clientY: number) => {
      const pos = getWorldPos(clientX, clientY);
      const body = pickGrabbable(engine.world, pos);
      if (!body) return;
      // Wake ONLY the grabbed body. Matter propagates wake to constraint
      // neighbours automatically once forces start moving the rope, so the
      // grabbed flask + its chain wake naturally — the rest of the rack stays
      // asleep instead of all 130 bodies running physics until they re-settle
      // (which was the visible spike on grab/jump).
      Matter.Sleeping.set(body, false);

      // Drag pass-through (mask & ~CAT_CHAIN): stop the held body from wedging
      // on rigid chain ropes (the actual cause of "gets stuck moving through
      // another chain"), while keeping its collision with other FLASKS (so the
      // playful bump-around behaviour stays intact). Saved on the body's
      // plugin so endDrag can restore exactly. Skipped when the advanced
      // "keep chain collision during drag" knob is on — that's the playground
      // mode where wedges become a feature you can experiment with.
      if (!useAppStore.getState().dragKeepsChainCollision) {
        // Save the ORIGINAL mask only on the first grab — if the same body is
        // re-grabbed while a previous release-restore is still pending (swing
        // hasn't cleared chain overlap yet), keep the original savedMask so
        // the eventual restore lands on the right value.
        const plugin = (body.plugin ?? {}) as Record<string, unknown>;
        if (typeof plugin.savedDragMask !== "number") {
          plugin.savedDragMask = body.collisionFilter.mask ?? 0xffffffff;
          body.plugin = plugin;
        }
        body.collisionFilter.mask =
          (body.collisionFilter.mask ?? 0xffffffff) & ~CAT_CHAIN;
        // Re-grabbing pre-empts any pending restore for the same body.
        maskRestores.cancelFor(body);
      }

      const constraint = Matter.Constraint.create({
        pointA: pos,
        bodyB: body,
        pointB: { x: pos.x - body.position.x, y: pos.y - body.position.y },
        // Soft pull: a near-rigid drag (0.9) shock-loads the stiff length-0
        // rope when you yank a long upper chain far, making it flicker and
        // never settle. Elastic follow keeps the solver stable; the flask lags
        // the cursor a touch, which reads correctly for something on a chain.
        // Damping 0.18 → 0.30: takes a hair more energy out of each step so
        // the bottom-link oscillation at the maxReach boundary settles faster
        // (small feel change, won't slow normal pulls).
        stiffness: 0.22,
        damping: 0.3,
        length: 0,
        render: { visible: false },
      });
      constraintRef.current = constraint;
      Matter.Composite.add(engine.world, constraint);
      container.style.cursor = "grabbing";
    };

    const moveDrag = (clientX: number, clientY: number) => {
      const c = constraintRef.current;
      if (!c) return;
      const target = getWorldPos(clientX, clientY);
      const body = c.bodyB;
      if (body) {
        Matter.Sleeping.set(body, false);
        // Hard cap on chain reach: clamp the target so the flask's drag target
        // can't sit further from its anchor than the chain's natural length.
        // This is the REAL fix for the "stretch past a threshold → every link
        // flickers" bug — the rigid length-0 rope is simply never overstretched.
        // FlaskChain sets body.plugin.{anchor,maxReach} on creation.
        const p = body.plugin as
          | { anchor?: { x: number; y: number }; maxReach?: number }
          | undefined;
        if (p?.anchor && typeof p.maxReach === "number") {
          // Flask: chain-reach clamp is the proper bound — don't ALSO apply
          // the per-frame yank cap, that was throttling the drag to a few
          // pixels of stretch. The maxReach circle is the only safety the
          // rope needs.
          const adx = target.x - p.anchor.x;
          const ady = target.y - p.anchor.y;
          const ad = Math.hypot(adx, ady);
          if (ad > p.maxReach) {
            target.x = p.anchor.x + (adx / ad) * p.maxReach;
            target.y = p.anchor.y + (ady / ad) * p.maxReach;
          }
        } else {
          // No flask metadata (chain-link grab) — keep the per-frame cap so
          // the rope can't be yanked too fast on a direct link grab.
          const dx = target.x - body.position.x;
          const dy = target.y - body.position.y;
          const d = Math.hypot(dx, dy);
          if (d > MAX_DRAG_REACH) {
            target.x = body.position.x + (dx / d) * MAX_DRAG_REACH;
            target.y = body.position.y + (dy / d) * MAX_DRAG_REACH;
          }
        }
      }
      c.pointA = target;
    };

    const endDrag = () => {
      if (constraintRef.current) {
        // Defer the mask restore: the released bottle is usually still inside
        // a chain it just passed through during the drag. Restoring CAT_CHAIN
        // immediately wedges it on the swing-back. afterUpdate restores once
        // bounds no longer overlap any chain segment (or the 3s safety cap).
        const heldBody = constraintRef.current.bodyB;
        const heldPlugin = heldBody?.plugin as
          | { savedDragMask?: number }
          | undefined;
        if (heldBody && typeof heldPlugin?.savedDragMask === "number") {
          maskRestores.push(heldBody, heldPlugin.savedDragMask);
        }
        Matter.Composite.remove(engine.world, constraintRef.current);
        constraintRef.current = null;
      }
      // Abort any unresolved touch gesture too (covers scroll/cancel/blur).
      pendingRef.current = null;
      // Drop back to the hover state; the next move re-applies "grab" if the
      // pointer is still over a grabbable.
      container.style.cursor = "";
    };

    // Tap (touch, no real movement): give the nearest flask a small sideways
    // shove so a tap still reads as "poke it", since the gesture lock won't
    // grab on a motionless touch.
    const tapNudge = (clientX: number, clientY: number) => {
      const body = pickGrabbable(engine.world, getWorldPos(clientX, clientY));
      if (!body) return;
      Matter.Sleeping.set(body, false);
      const dir = Math.random() < 0.5 ? -1 : 1;
      Matter.Body.setVelocity(body, { x: dir * TAP_NUDGE_VX, y: body.velocity.y });
    };

    const onPointerUp = (e: PointerEvent) => {
      const p = pendingRef.current;
      if (p && !constraintRef.current) {
        const moved = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
        if (moved < TOUCH_SLOP) tapNudge(p.x0, p.y0);
      }
      endDrag();
    };

    const onPointerDown = (e: PointerEvent) => {
      // Collide mode: no grab — the cursor body is what pushes things around.
      if (useAppStore.getState().interactionMode === "collide") return;
      if (e.pointerType === "mouse") {
        // Mouse: no scroll conflict — grab immediately for instant response.
        startDrag(e.clientX, e.clientY);
      } else {
        // Touch/pen: defer. Record the start; the first move decides drag vs scroll.
        pendingRef.current = { x0: e.clientX, y0: e.clientY };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      // Collide mode: park the cursor body at the current cursor position so
      // it bumps anything it overlaps. We snap to off-screen when the pointer
      // leaves the rack so the body doesn't sit on the edge wedging flasks.
      if (useAppStore.getState().interactionMode === "collide") {
        pusher.recordPointerMove(
          e.clientX,
          e.clientY,
          e.timeStamp || performance.now(),
        );
        return;
      }
      if (constraintRef.current) {
        moveDrag(e.clientX, e.clientY);
        return;
      }
      // Touch gesture lock: resolve a pending touch once it's past the slop.
      const p = pendingRef.current;
      if (p) {
        const dx = e.clientX - p.x0;
        const dy = e.clientY - p.y0;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < TOUCH_SLOP) return; // still ambiguous
        if (Math.abs(dx) > Math.abs(dy) * TOUCH_AXIS_BIAS) {
          // Horizontal intent → commit the drag. Grab at the ORIGINAL touch
          // point so the flask doesn't snap to the finger, then follow to the
          // current.
          pendingRef.current = null;
          startDrag(p.x0, p.y0);
          moveDrag(e.clientX, e.clientY);
        } else {
          // Vertical intent → it's a scroll. Abandon the grab and let the
          // browser pan (touch-action: pan-y); the scroll/pointercancel
          // handlers also fire.
          pendingRef.current = null;
        }
        return;
      }
      // The hover affordance ("grab" cursor over the rack) is now a static
      // `cursor-grab` Tailwind class on the container (see PhysicsScene.tsx) —
      // dropping the per-mousemove Matter.Query.point + style-write reclaimed
      // ~30-40 ms frames during hover sweeps. The rack is interactive
      // everywhere anyway (pickGrabbable's GRAB_RADIUS near-miss catches
      // presses in the gaps), so showing "grab" across the whole section is
      // also more honest. No further work on mouse move when not dragging.
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") endDrag();
    };
    // Critical: the decorative backdrop is an <img>, which is draggable by
    // default — without this, pressing it starts a native image drag-and-drop
    // that fires pointercancel and kills the flask drag before it can follow.
    const onDragStart = (e: Event) => e.preventDefault();

    // Initial pusher state matches the store; subscribe to flips so mode
    // toggles create/remove the body.
    if (useAppStore.getState().interactionMode === "collide") {
      pusher.setActive(true);
    }
    const unsubMode = useAppStore.subscribe((s, prev) => {
      if (s.interactionMode === prev.interactionMode) return;
      // Any in-flight drag must end before switching modes (constraints would
      // otherwise linger; mode flip while holding a flask is undefined).
      endDrag();
      pusher.setActive(s.interactionMode === "collide");
    });

    // Pending-restore drain: register on every Matter step. The handler
    // early-outs when the queue is empty, so steady-state cost ~zero.
    const onAfterUpdate = () => maskRestores.onAfterUpdate();
    Matter.Events.on(engine, "afterUpdate", onAfterUpdate);

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("dragstart", onDragStart);
    // Track move/end on window so a drag that wanders off the rack still
    // follows and always releases. scroll/blur/cancel/hidden all drop a stuck
    // drag.
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    // Scroll behaviour depends on mode: drag → cancel any active drag (avoids
    // a stuck constraint as the page scrolls under the cursor); collide →
    // re-sync the cursor body so it tracks the rack rect (rack is sticky, but
    // scrolling past the sticky range still shifts the rect under a stationary
    // cursor).
    const onScroll = () => {
      if (useAppStore.getState().interactionMode === "collide") {
        pusher.syncFromScroll(performance.now());
      } else {
        endDrag();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      Matter.Events.off(engine, "afterUpdate", onAfterUpdate);
      unsubMode();
      pusher.dispose();
      maskRestores.clear();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", endDrag);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      endDrag();
    };
  }, [engine, containerRef]);
}
