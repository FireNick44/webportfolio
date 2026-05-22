import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { createCursorBody } from "../physics/cursorBody";
import { shouldShake } from "../physics/shake";
import { SHAKE_IMPULSE, SHAKE_COOLDOWN_MS } from "../physics/constants";
import type { FlaskFieldLoop } from "../physics/flaskFieldLoop";

export function useMousePhysics(
  engine: Matter.Engine,
  containerRef: React.RefObject<HTMLDivElement | null>,
  loop: FlaskFieldLoop,
  isMobile: boolean
) {
  const constraintRef = useRef<Matter.Constraint | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getWorldPos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Desktop only: a sensor body follows the cursor for bump detection.
    // Mobile has no hover, so it is drag-only (isMobile gate).
    const cursor = isMobile ? null : createCursorBody();
    if (cursor) Matter.Composite.add(engine.world, cursor);

    // Per-flask shake cooldown, keyed by body id.
    const lastShake = new Map<number, number>();

    const shakeFlask = (flask: Matter.Body) => {
      const now = performance.now();
      if (!shouldShake(lastShake.get(flask.id), now, SHAKE_COOLDOWN_MS)) return;
      lastShake.set(flask.id, now);
      Matter.Sleeping.set(flask, false);
      // One-shot horizontal "nuke" -> L<->R shake; chain + damping settle it.
      const dir = Math.random() < 0.5 ? -1 : 1;
      Matter.Body.setVelocity(flask, {
        x: dir * SHAKE_IMPULSE,
        y: flask.velocity.y,
      });
      loop.wake();
    };

    const onCollision = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        let flask: Matter.Body | null = null;
        if (pair.bodyA.label === "cursor" && pair.bodyB.label === "flask") {
          flask = pair.bodyB;
        } else if (
          pair.bodyB.label === "cursor" &&
          pair.bodyA.label === "flask"
        ) {
          flask = pair.bodyA;
        }
        if (flask && !flask.isStatic) shakeFlask(flask);
      }
    };
    if (cursor) Matter.Events.on(engine, "collisionStart", onCollision);

    const startDrag = (clientX: number, clientY: number) => {
      loop.wake(); // resume a suspended loop so the drag constraint integrates
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
        const pos = getWorldPos(clientX, clientY);
        // Move the cursor sensor and wake the loop — a suspended engine can't
        // detect a bump because it isn't running collision detection.
        if (cursor) {
          Matter.Body.setPosition(cursor, pos);
          loop.wake();
        }
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
      loop.wake();
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
        const pos = getWorldPos(e.touches[0].clientX, e.touches[0].clientY);
        constraintRef.current.pointA = pos;
        loop.wake();
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
      if (cursor) {
        Matter.Events.off(engine, "collisionStart", onCollision);
        Matter.Composite.remove(engine.world, cursor);
      }
      if (constraintRef.current) {
        Matter.Composite.remove(engine.world, constraintRef.current);
      }
    };
  }, [engine, containerRef, loop, isMobile]);
}
