import { useEffect, useRef } from "react";
import Matter from "matter-js";

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

    const startDrag = (clientX: number, clientY: number) => {
      const pos = getWorldPos(clientX, clientY);
      const bodies = Matter.Composite.allBodies(engine.world);
      const found = Matter.Query.point(bodies, pos);

      const flask = found.find((b) => b.label === "flask" && !b.isStatic);
      if (!flask) return;

      Matter.Sleeping.set(flask, false);

      const constraint = Matter.Constraint.create({
        pointA: pos,
        bodyB: flask,
        pointB: {
          x: pos.x - flask.position.x,
          y: pos.y - flask.position.y,
        },
        stiffness: 0.2,
        damping: 0.3,
        length: 0,
        render: { visible: false },
      });
      constraintRef.current = constraint;
      Matter.Composite.add(engine.world, constraint);
      container.style.cursor = "grabbing";
    };

    const moveDrag = (clientX: number, clientY: number) => {
      if (!constraintRef.current) {
        // Update cursor: show grab when hovering over a flask
        const pos = getWorldPos(clientX, clientY);
        const bodies = Matter.Composite.allBodies(engine.world);
        const found = Matter.Query.point(bodies, pos);
        const overFlask = found.some(
          (b) => b.label === "flask" && !b.isStatic
        );
        container.style.cursor = overFlask ? "grab" : "";
        return;
      }
      const pos = getWorldPos(clientX, clientY);
      constraintRef.current.pointA = pos;
    };

    const endDrag = () => {
      if (constraintRef.current) {
        Matter.Composite.remove(engine.world, constraintRef.current);
        constraintRef.current = null;
      }
      container.style.cursor = "";
    };

    const onMouseDown = (e: MouseEvent) => startDrag(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && constraintRef.current) {
        const pos = getWorldPos(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        constraintRef.current.pointA = pos;
      }
    };
    const onTouchEnd = () => endDrag();

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", endDrag);
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("mouseleave", endDrag);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      if (constraintRef.current) {
        Matter.Composite.remove(engine.world, constraintRef.current);
      }
    };
  }, [engine, containerRef]);
}
