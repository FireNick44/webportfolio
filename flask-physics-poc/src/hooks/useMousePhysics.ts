import { useEffect } from "react";
import Matter from "matter-js";
import { CAT_MOUSE, MOUSE_MASK, MOUSE_BODY_RADIUS } from "../physics/constants";

export function useMousePhysics(
  engine: Matter.Engine,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hoverBody = Matter.Bodies.circle(
      -200,
      -200,
      MOUSE_BODY_RADIUS,
      {
        isStatic: true,
        collisionFilter: {
          category: CAT_MOUSE,
          mask: MOUSE_MASK,
        },
        render: { visible: false },
        label: "mouse-hover",
      }
    );
    Matter.Composite.add(engine.world, hoverBody);

    const moveHover = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      Matter.Body.setPosition(hoverBody, {
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      Matter.Sleeping.set(hoverBody, false);
    };

    const onMouseMove = (e: MouseEvent) => moveHover(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        moveHover(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onLeave = () => {
      Matter.Body.setPosition(hoverBody, { x: -200, y: -200 });
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("mouseleave", onLeave);
      Matter.Composite.remove(engine.world, hoverBody);
    };
  }, [engine, containerRef]);
}
