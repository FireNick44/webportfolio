import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { CAT_MOUSE, MOUSE_MASK } from "@/physics/constants";

const GRAB_RADIUS = 56;
// Desktop cursor "shove" circle. Kept near pointer-size so it nudges flasks
// rather than bulldozing them (the flask hitbox is ~75px wide).
const REPEL_RADIUS = 22;

/**
 * Two interaction modes, chosen by device:
 *  • Desktop (fine pointer / mouse): an invisible circle follows the cursor and
 *    physically shoves the flasks out of the way — no clicking needed.
 *  • Touch (coarse pointer / no hover, incl. iPad): grab-and-drag a flask.
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

    const pointerFine =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // ── Desktop: cursor-repel circle ──────────────────────────────────────
    if (pointerFine) {
      const cursor = Matter.Bodies.circle(-3000, -3000, REPEL_RADIUS, {
        isStatic: true,
        collisionFilter: { category: CAT_MOUSE, mask: MOUSE_MASK },
        label: "mouse-repel",
      });
      Matter.Composite.add(engine.world, cursor);

      const onMove = (e: MouseEvent) => {
        const pos = getWorldPos(e.clientX, e.clientY);
        Matter.Body.setPosition(cursor, pos);
        // Wake flasks within reach so they react to the cursor.
        const bodies = Matter.Composite.allBodies(engine.world);
        for (const b of bodies) {
          if (b.label !== "flask" || !b.isSleeping) continue;
          const d = Math.hypot(b.position.x - pos.x, b.position.y - pos.y);
          if (d < REPEL_RADIUS + 120) Matter.Sleeping.set(b, false);
        }
      };
      const park = () =>
        Matter.Body.setPosition(cursor, { x: -3000, y: -3000 });

      container.addEventListener("mousemove", onMove);
      container.addEventListener("mouseleave", park);

      return () => {
        container.removeEventListener("mousemove", onMove);
        container.removeEventListener("mouseleave", park);
        Matter.Composite.remove(engine.world, cursor);
      };
    }

    // ── Touch: drag a flask ───────────────────────────────────────────────
    const pickFlask = (pos: { x: number; y: number }) => {
      const bodies = Matter.Composite.allBodies(engine.world);
      const exact = Matter.Query.point(bodies, pos).find(
        (b) => b.label === "flask" && !b.isStatic
      );
      if (exact) return exact;
      let nearest: Matter.Body | null = null;
      let nearestDist = GRAB_RADIUS;
      for (const b of bodies) {
        if (b.label !== "flask" || b.isStatic) continue;
        const d = Math.hypot(b.position.x - pos.x, b.position.y - pos.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = b;
        }
      }
      return nearest;
    };

    const startDrag = (clientX: number, clientY: number) => {
      const pos = getWorldPos(clientX, clientY);
      const flask = pickFlask(pos);
      if (!flask) return;
      Matter.Sleeping.set(flask, false);
      const constraint = Matter.Constraint.create({
        pointA: pos,
        bodyB: flask,
        pointB: { x: pos.x - flask.position.x, y: pos.y - flask.position.y },
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

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0)
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0)
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      if (constraintRef.current) {
        Matter.Composite.remove(engine.world, constraintRef.current);
      }
    };
  }, [engine, containerRef]);
}
