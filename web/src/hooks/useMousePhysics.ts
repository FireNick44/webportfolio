import Matter from "matter-js";
import { useEffect, useRef } from "react";

import { CAT_CHAIN, CAT_MOUSE, CAT_WALL } from "@/physics/constants";
import { useAppStore } from "@/store/useAppStore";

// How near a press must land to grab a flask/chain when it doesn't land directly
// on one.
const GRAB_RADIUS = 56;

// Cap how far the drag target may sit ahead of the grabbed body. A fast/far yank
// otherwise overstretches the stiff length-0 rope and the solver explodes
// (links spinning around themselves). The body still chases the cursor — it just
// trails by at most this, pulling steadily instead of snapping.
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
 * (or catch a chain link anywhere along the rope) and drag it; release to let it
 * swing. No ambient cursor-repel — just click/tap-and-drag.
 *
 * Uses Pointer Events so one path covers mouse + touch and we get `pointercancel`
 * for free (the browser fires it when it takes a touch over as a scroll — exactly
 * when we want to drop the drag). The drag is also dropped on tab-switch, window
 * blur and scroll, so a half-finished drag never "sticks" with weird behaviour.
 */
export function useMousePhysics(
  engine: Matter.Engine,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const constraintRef = useRef<Matter.Constraint | null>(null);
  // Touch gesture lock: on touch we DON'T grab on pointerdown — we record the
  // start point and wait for the first move to read intent (horizontal → drag,
  // vertical → let the page scroll). Stays null on mouse (no scroll conflict).
  const pendingRef = useRef<{ x0: number; y0: number } | null>(null);
  // "Collide" interaction mode: a small static body follows the cursor and
  // pushes flasks/chains around (no grab). Null in "drag" mode (the default).
  const cursorBodyRef = useRef<Matter.Body | null>(null);
  // Last-known cursor velocity (Matter units = pixels per ~16.67 ms step) and
  // the timestamp of the previous pointermove. Set on each pointermove in
  // collide mode; read by the collisionStart listener to boost any flask the
  // cursor body just touched, so a fast sweep imparts real momentum instead
  // of the static-teleport "flicker" (the solver previously only saw overlap
  // separation, not motion). Matches the "if I move fast, push hard" feel.
  const cursorVelRef = useRef({ x: 0, y: 0 });
  const cursorLastTimeRef = useRef(0);
  // Last-known cursor in VIEWPORT coords. The scroll listener uses this to
  // re-place the cursor body when the user scrolls without moving the mouse
  // (the rack is sticky — its rect can shift relative to the cursor even
  // though the cursor didn't physically move).
  const cursorLastClientRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getWorldPos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Bodies released from a drag with their CAT_CHAIN bit masked off — held
    // here until they bounds-clear every chain segment (or expire). Iterated
    // each Matter step by onAfterUpdateMaskRestore below.
    const pendingMaskRestores: {
      body: Matter.Body;
      savedMask: number;
      expiresAt: number;
    }[] = [];

    const isGrabbable = (b: Matter.Body) =>
      !b.isStatic &&
      (b.label === "flask" || b.label.startsWith("chain-segment-"));

    const pickGrabbable = (pos: { x: number; y: number }) => {
      const bodies = Matter.Composite.allBodies(engine.world);
      const hits = Matter.Query.point(bodies, pos).filter(isGrabbable);
      // Prefer a flask directly under the pointer, else any link under it.
      const exactFlask = hits.find((b) => b.label === "flask");
      if (exactFlask) return exactFlask;
      if (hits.length) return hits[0];
      // Otherwise the nearest grabbable within reach, biased toward flasks.
      let nearest: Matter.Body | null = null;
      let nearestScore = GRAB_RADIUS;
      for (const b of bodies) {
        if (!isGrabbable(b)) continue;
        const d = Math.hypot(b.position.x - pos.x, b.position.y - pos.y);
        const score = b.label === "flask" ? d * 0.6 : d;
        if (score < nearestScore) {
          nearestScore = score;
          nearest = b;
        }
      }
      return nearest;
    };

    const startDrag = (clientX: number, clientY: number) => {
      const pos = getWorldPos(clientX, clientY);
      const body = pickGrabbable(pos);
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
      // playful bump-around behaviour you wanted stays intact). Saved on the
      // body's plugin so endDrag can restore exactly. Skipped when the advanced
      // "keep chain collision during drag" knob is on — that's the playground
      // mode where wedges become a feature you can experiment with.
      if (!useAppStore.getState().dragKeepsChainCollision) {
        // Save the ORIGINAL mask only on the first grab — if the same body is
        // re-grabbed while a previous release-restore is still pending (swing
        // hasn't cleared chain overlap yet), keep the original savedMask so the
        // eventual restore lands on the right value.
        const plugin = (body.plugin ?? {}) as Record<string, unknown>;
        if (typeof plugin.savedDragMask !== "number") {
          plugin.savedDragMask = body.collisionFilter.mask ?? 0xffffffff;
          body.plugin = plugin;
        }
        body.collisionFilter.mask =
          (body.collisionFilter.mask ?? 0xffffffff) & ~CAT_CHAIN;
        // Re-grabbing pre-empts any pending restore for the same body.
        for (let i = pendingMaskRestores.length - 1; i >= 0; i--) {
          if (pendingMaskRestores[i].body === body) pendingMaskRestores.splice(i, 1);
        }
      }

      const constraint = Matter.Constraint.create({
        pointA: pos,
        bodyB: body,
        pointB: { x: pos.x - body.position.x, y: pos.y - body.position.y },
        // Soft pull: a near-rigid drag (0.9) shock-loads the stiff length-0 rope
        // when you yank a long upper chain far, making it flicker and never
        // settle. Elastic follow keeps the solver stable; the flask lags the
        // cursor a touch, which reads correctly for something on a chain.
        // Damping bumped 0.18 → 0.30: takes a hair more energy out of each
        // step so the bottom-link oscillation at the maxReach boundary settles
        // faster (flicker tuning — small feel change, won't slow normal pulls).
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
          // Flask: chain-reach clamp is the proper bound — don't ALSO apply the
          // per-frame yank cap, that was throttling the drag to a few pixels of
          // stretch. The maxReach circle is the only safety the rope needs.
          const adx = target.x - p.anchor.x;
          const ady = target.y - p.anchor.y;
          const ad = Math.hypot(adx, ady);
          if (ad > p.maxReach) {
            target.x = p.anchor.x + (adx / ad) * p.maxReach;
            target.y = p.anchor.y + (ady / ad) * p.maxReach;
          }
        } else {
          // No flask metadata (chain-link grab) — keep the per-frame cap so the
          // rope can't be yanked too fast on a direct link grab.
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
        // immediately wedges it on the swing-back. Hand it to the pending
        // queue; afterUpdate restores once bounds no longer overlap any chain
        // segment (or the 3s safety cap fires).
        const heldBody = constraintRef.current.bodyB;
        const heldPlugin = heldBody?.plugin as
          | { savedDragMask?: number }
          | undefined;
        if (heldBody && typeof heldPlugin?.savedDragMask === "number") {
          pendingMaskRestores.push({
            body: heldBody,
            savedMask: heldPlugin.savedDragMask,
            expiresAt: performance.now() + 3000,
          });
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
      const body = pickGrabbable(getWorldPos(clientX, clientY));
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
      // Collide mode: park the cursor body at the current cursor position so it
      // bumps anything it overlaps. We snap to off-screen when the pointer
      // leaves the rack so the body doesn't sit on the edge wedging flasks.
      if (useAppStore.getState().interactionMode === "collide") {
        cursorLastClientRef.current = { x: e.clientX, y: e.clientY };
        syncCursorBody(e.timeStamp || performance.now());
        return;
      }
      if (constraintRef.current) {
        moveDrag(e.clientX, e.clientY);
        return;
      }
      // Touch gesture lock: resolve a pending touch once it's moved past the slop.
      const p = pendingRef.current;
      if (p) {
        const dx = e.clientX - p.x0;
        const dy = e.clientY - p.y0;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < TOUCH_SLOP) return; // still ambiguous
        if (Math.abs(dx) > Math.abs(dy) * TOUCH_AXIS_BIAS) {
          // Horizontal intent → commit the drag. Grab at the ORIGINAL touch point
          // so the flask doesn't snap to the finger, then follow to the current.
          pendingRef.current = null;
          startDrag(p.x0, p.y0);
          moveDrag(e.clientX, e.clientY);
        } else {
          // Vertical intent → it's a scroll. Abandon the grab and let the browser
          // pan (touch-action: pan-y); the scroll/pointercancel handlers also fire.
          pendingRef.current = null;
        }
        return;
      }
      // The hover affordance ("grab" cursor over the rack) is now a static
      // `cursor-grab` Tailwind class on the container (see PhysicsScene.tsx) —
      // dropping the per-mousemove Matter.Query.point + style-write reclaimed
      // ~30-40 ms frames during hover sweeps. The rack is interactive everywhere
      // anyway (pickGrabbable's GRAB_RADIUS near-miss catches presses in the
      // gaps), so showing "grab" across the whole section is also more honest.
      // No further work on mouse move when not dragging.
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") endDrag();
    };
    // Critical: the decorative backdrop is an <img>, which is draggable by
    // default — without this, pressing it starts a native image drag-and-drop
    // that fires pointercancel and kills the flask drag before it can follow.
    const onDragStart = (e: Event) => e.preventDefault();

    // Recompute the cursor body's container-local position from the last-known
    // viewport-cursor pos, gating out the top + bottom wave bands (where the
    // visible affordance is dressed up as decoration, not interaction). Called
    // both from pointermove AND from the scroll listener below — scroll alone
    // can shift the rack's rect relative to the cursor without firing
    // pointermove, which used to leave the body lagging behind.
    const syncCursorBody = (timeMs: number) => {
      const b = cursorBodyRef.current;
      if (!b) return;
      const rect = container.getBoundingClientRect();
      const { x: cx, y: cy } = cursorLastClientRef.current;
      const waveH = Math.max(56, Math.min(130, 0.08 * window.innerWidth));
      const active =
        cx >= rect.left && cx <= rect.right &&
        cy >= rect.top + waveH && cy <= rect.bottom - waveH;
      if (active) {
        const cur = { x: cx - rect.left, y: cy - rect.top };
        const dt =
          cursorLastTimeRef.current > 0
            ? Math.max(1, timeMs - cursorLastTimeRef.current)
            : 1000 / 60;
        cursorVelRef.current = {
          x: ((cur.x - b.position.x) / dt) * (1000 / 60),
          y: ((cur.y - b.position.y) / dt) * (1000 / 60),
        };
        cursorLastTimeRef.current = timeMs;
        Matter.Body.setPosition(b, cur);
      } else {
        Matter.Body.setPosition(b, { x: -9999, y: -9999 });
        cursorVelRef.current = { x: 0, y: 0 };
        cursorLastTimeRef.current = 0;
      }
    };

    // Cursor-pusher body lifecycle: a small static circle parked off-screen
    // until pointermove brings it into the rack. Static + setPosition each
    // frame makes other bodies feel a solid moving obstacle. Created on demand
    // when interactionMode flips to "collide", torn down when it flips back.
    const ensureCursorBody = () => {
      if (cursorBodyRef.current) return;
      const b = Matter.Bodies.circle(-9999, -9999, 24, {
        isStatic: true,
        collisionFilter: {
          // Use CAT_MOUSE so flasks (whose mask already includes CAT_MOUSE) get
          // pushed; walls (mask CAT_LAYER only) are unaffected — the pusher
          // doesn't collide with the rack's bounding walls, just the contents.
          category: CAT_MOUSE,
          mask: 0xffff & ~CAT_WALL,
          group: 0,
        },
        label: "cursor-pusher",
      });
      cursorBodyRef.current = b;
      Matter.Composite.add(engine.world, b);
    };
    const removeCursorBody = () => {
      if (!cursorBodyRef.current) return;
      Matter.Composite.remove(engine.world, cursorBodyRef.current);
      cursorBodyRef.current = null;
    };
    if (useAppStore.getState().interactionMode === "collide") ensureCursorBody();
    const unsubMode = useAppStore.subscribe((s, prev) => {
      if (s.interactionMode === prev.interactionMode) return;
      // Any in-flight drag must end before switching modes (constraints would
      // otherwise linger; mode flip while holding a flask is undefined).
      endDrag();
      if (s.interactionMode === "collide") ensureCursorBody();
      else removeCursorBody();
    });

    // Momentum transfer: on every collisionStart involving the cursor body,
    // boost the other body's velocity by a fraction of the current cursor
    // velocity. The vertical component is damped because flasks should swing
    // sideways more than bounce, and gravity already supplies the down force.
    // The engine's afterUpdate cap (MAX_BODY_SPEED in usePhysicsEngine) catches
    // any extreme value the solver wouldn't otherwise like.
    const PUSH_X = 0.85;
    const PUSH_Y = 0.35;
    const onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
      const pusher = cursorBodyRef.current;
      if (!pusher) return;
      const vel = cursorVelRef.current;
      // No real cursor motion → nothing to add (avoids zapping idle flasks).
      if (Math.hypot(vel.x, vel.y) < 0.3) return;
      for (const pair of event.pairs) {
        const other =
          pair.bodyA === pusher
            ? pair.bodyB
            : pair.bodyB === pusher
              ? pair.bodyA
              : null;
        if (!other || other.isStatic || other.label !== "flask") continue;
        Matter.Sleeping.set(other, false);
        Matter.Body.setVelocity(other, {
          x: other.velocity.x + vel.x * PUSH_X,
          y: other.velocity.y + vel.y * PUSH_Y,
        });
      }
    };
    Matter.Events.on(engine, "collisionStart", onCollisionStart);

    // Pending-restore drain: once a released body's bounds no longer overlap
    // ANY chain segment (or the 3 s timeout fires), restore its original mask
    // so it bumps chains again. Early-out when the queue is empty keeps the
    // steady-state cost ~zero.
    const onAfterUpdateMaskRestore = () => {
      if (pendingMaskRestores.length === 0) return;
      const allBodies = Matter.Composite.allBodies(engine.world);
      const aliveSet = new Set(allBodies);
      const chainBodies = allBodies.filter(
        (b) => b.label && b.label.startsWith("chain-segment-"),
      );
      const now = performance.now();
      for (let i = pendingMaskRestores.length - 1; i >= 0; i--) {
        const p = pendingMaskRestores[i];
        if (!aliveSet.has(p.body)) {
          pendingMaskRestores.splice(i, 1);
          continue;
        }
        const overlapsChain = chainBodies.some((c) =>
          Matter.Bounds.overlaps(c.bounds, p.body.bounds),
        );
        if (!overlapsChain || now > p.expiresAt) {
          p.body.collisionFilter.mask = p.savedMask;
          const plugin = p.body.plugin as { savedDragMask?: number } | undefined;
          if (plugin) plugin.savedDragMask = undefined;
          pendingMaskRestores.splice(i, 1);
        }
      }
    };
    Matter.Events.on(engine, "afterUpdate", onAfterUpdateMaskRestore);

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("dragstart", onDragStart);
    // Track move/end on window so a drag that wanders off the rack still follows
    // and always releases. scroll/blur/cancel/hidden all drop a stuck drag.
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    // Scroll behaviour depends on mode: drag → cancel any active drag (avoids a
    // stuck constraint as the page scrolls under the cursor); collide → re-sync
    // the cursor body so it tracks the rack rect (rack is sticky, but scrolling
    // past the sticky range still shifts the rect under a stationary cursor).
    const onScroll = () => {
      if (useAppStore.getState().interactionMode === "collide") {
        syncCursorBody(performance.now());
      } else {
        endDrag();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      Matter.Events.off(engine, "collisionStart", onCollisionStart);
      Matter.Events.off(engine, "afterUpdate", onAfterUpdateMaskRestore);
      unsubMode();
      removeCursorBody();
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
