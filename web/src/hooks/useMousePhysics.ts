import { useEffect, useRef } from "react";
import Matter from "matter-js";

// How near a press must land to grab a flask/chain when it doesn't land directly
// on one.
const GRAB_RADIUS = 56;

// Cap how far the drag target may sit ahead of the grabbed body. A fast/far yank
// otherwise overstretches the stiff length-0 rope and the solver explodes
// (links spinning around themselves). The body still chases the cursor — it just
// trails by at most this, pulling steadily instead of snapping.
const MAX_DRAG_REACH = 100;

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getWorldPos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

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
      const constraint = Matter.Constraint.create({
        pointA: pos,
        bodyB: body,
        pointB: { x: pos.x - body.position.x, y: pos.y - body.position.y },
        // Soft pull: a near-rigid drag (0.9) shock-loads the stiff length-0 rope
        // when you yank a long upper chain far, making it flicker and never
        // settle. Elastic follow keeps the solver stable; the flask lags the
        // cursor a touch, which reads correctly for something on a chain.
        stiffness: 0.22,
        damping: 0.18,
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
        Matter.Composite.remove(engine.world, constraintRef.current);
        constraintRef.current = null;
      }
      // Drop back to the hover state; the next move re-applies "grab" if the
      // pointer is still over a grabbable.
      container.style.cursor = "";
    };

    const onPointerDown = (e: PointerEvent) => startDrag(e.clientX, e.clientY);
    const onPointerMove = (e: PointerEvent) => {
      if (constraintRef.current) {
        moveDrag(e.clientX, e.clientY);
        return;
      }
      // Hover affordance (mouse only — touch has no hover): show "grab" wherever
      // a press would actually catch a flask or chain, default elsewhere. Bounds-
      // checked first so we don't query the rack on every move across the page.
      if (e.pointerType !== "mouse") return;
      const rect = container.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) {
        if (container.style.cursor) container.style.cursor = "";
        return;
      }
      // Hover "grab" only DIRECTLY over a flask/chain (exact hit, no near-miss
      // radius) so the affordance is deliberate, not "grab everywhere". A press
      // in the near-miss gap still grabs and flips to "grabbing" (see startDrag).
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const onBody = Matter.Query.point(
        Matter.Composite.allBodies(engine.world),
        pos
      ).some(isGrabbable);
      container.style.cursor = onBody ? "grab" : "";
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") endDrag();
    };
    // Critical: the decorative backdrop is an <img>, which is draggable by
    // default — without this, pressing it starts a native image drag-and-drop
    // that fires pointercancel and kills the flask drag before it can follow.
    const onDragStart = (e: Event) => e.preventDefault();

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("dragstart", onDragStart);
    // Track move/end on window so a drag that wanders off the rack still follows
    // and always releases. scroll/blur/cancel/hidden all drop a stuck drag.
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    window.addEventListener("scroll", endDrag, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", endDrag);
      window.removeEventListener("scroll", endDrag);
      document.removeEventListener("visibilitychange", onVisibility);
      endDrag();
    };
  }, [engine, containerRef]);
}
