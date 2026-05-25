import { useEffect, useRef } from "react";
import Matter from "matter-js";

// How near a press must land to grab a flask/chain when it doesn't land directly
// on one.
const GRAB_RADIUS = 56;

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
      // Wake the rack so the grabbed link's neighbours + flask follow.
      for (const b of Matter.Composite.allBodies(engine.world)) {
        if (!b.isStatic) Matter.Sleeping.set(b, false);
      }
      const constraint = Matter.Constraint.create({
        pointA: pos,
        bodyB: body,
        pointB: { x: pos.x - body.position.x, y: pos.y - body.position.y },
        stiffness: 0.9,
        damping: 0.2,
        length: 0,
        render: { visible: false },
      });
      constraintRef.current = constraint;
      Matter.Composite.add(engine.world, constraint);
    };

    const moveDrag = (clientX: number, clientY: number) => {
      if (!constraintRef.current) return;
      if (constraintRef.current.bodyB) {
        Matter.Sleeping.set(constraintRef.current.bodyB, false);
      }
      constraintRef.current.pointA = getWorldPos(clientX, clientY);
    };

    const endDrag = () => {
      if (constraintRef.current) {
        Matter.Composite.remove(engine.world, constraintRef.current);
        constraintRef.current = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => startDrag(e.clientX, e.clientY);
    const onPointerMove = (e: PointerEvent) => {
      if (constraintRef.current) moveDrag(e.clientX, e.clientY);
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
