import Matter from "matter-js";

// On drag release we keep the held flask's CAT_CHAIN bit masked off for a beat
// — the bottle is usually still INSIDE a chain it just passed through. Flipping
// chain collision back on immediately wedges it on the swing-back. The queue
// here holds released bodies until their bounds clear every chain segment (or
// the 3s safety cap fires), then restores the saved mask.

interface PendingEntry {
  body: Matter.Body;
  savedMask: number;
  expiresAt: number;
}

export interface DragMaskRestoreQueue {
  /** Push a release onto the queue. */
  push(body: Matter.Body, savedMask: number, ttlMs?: number): void;
  /** Remove any pending entries for `body` (e.g. when re-grabbed). */
  cancelFor(body: Matter.Body): void;
  /** Drain handler — register on engine "afterUpdate". */
  onAfterUpdate(): void;
  /** Empty the queue (e.g. on unmount). */
  clear(): void;
}

export function createDragMaskRestoreQueue(
  engine: Matter.Engine,
  defaultTtlMs = 3000,
): DragMaskRestoreQueue {
  const queue: PendingEntry[] = [];

  return {
    push(body, savedMask, ttlMs = defaultTtlMs) {
      queue.push({ body, savedMask, expiresAt: performance.now() + ttlMs });
    },
    cancelFor(body) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].body === body) queue.splice(i, 1);
      }
    },
    onAfterUpdate() {
      if (queue.length === 0) return;
      const allBodies = Matter.Composite.allBodies(engine.world);
      const aliveSet = new Set(allBodies);
      const chainBodies = allBodies.filter(
        (b) => b.label && b.label.startsWith("chain-segment-"),
      );
      const now = performance.now();
      for (let i = queue.length - 1; i >= 0; i--) {
        const p = queue[i];
        if (!aliveSet.has(p.body)) {
          queue.splice(i, 1);
          continue;
        }
        const overlapsChain = chainBodies.some((c) =>
          Matter.Bounds.overlaps(c.bounds, p.body.bounds),
        );
        if (!overlapsChain || now > p.expiresAt) {
          p.body.collisionFilter.mask = p.savedMask;
          const plugin = p.body.plugin as { savedDragMask?: number } | undefined;
          if (plugin) plugin.savedDragMask = undefined;
          queue.splice(i, 1);
        }
      }
    },
    clear() {
      queue.length = 0;
    },
  };
}
