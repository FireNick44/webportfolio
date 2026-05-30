// Per-frame DOM sync for a physics flask + its swinging chain links. Lifted
// out of FlaskChain.tsx so the component owns lifecycle/refs and this module
// owns the fiddly transform-write deadband logic.
//
// Background: Matter's rigid length-0 constraints keep bodies micro-jittering
// sub-pixel forever (they never go below the motion sleep threshold), so a
// naive every-frame rewrite would emit ~11k identical-looking
// `transform`s/sec on a visually idle rack. The deadband + tilt-write epsilons
// here cut that to ~19 writes/sec when idle, since the water and icon live
// inside <clipPath>s — rewriting their transform forces a re-clip + re-raster
// of the flask's whole layer texture, the dominant per-frame paint cost.

import type Matter from "matter-js";

import type { ChainResult } from "./createChainBodies";
import type { FlaskResult } from "./createFlaskBody";
import {
  CHAIN_SEGMENT_WIDTH,
  FLASK_HEIGHT,
  FLASK_WIDTH,
  MAX_LIQUID_TILT_DEG,
} from "./constants";
import { FLASK_SHAPE_DEFS, type FlaskShape } from "./flaskShapes";

// Min tilt change (deg) before we rewrite the clipped water / icon transforms.
// Below this the visual change is sub-pixel, so skipping the write keeps an
// awake-but-steady flask from re-rasterising its clipped interior every frame.
export const LIQUID_WRITE_EPSILON = 0.1;
export const ICON_WRITE_EPSILON = 0.1;
// Min position/angle change before we rewrite a chain link or flask wrapper's
// `transform`. Sub-pixel/sub-degree ε is imperceptible; bounded lag.
export const TRANSFORM_PX_EPSILON = 0.3;
export const TRANSFORM_DEG_EPSILON = 0.15;

export type TransformCache = { x: number; y: number; a: number };

export interface SyncDeadbandRefs {
  /** Per-link last-written transform (sparse, indexed by physics link index). */
  lastChainTransforms: (TransformCache | undefined)[];
  /** Last-written transform on the flask wrapper. */
  lastFlaskTransform: TransformCache | undefined;
  /** Last-written tilt for the water <clipPath>. */
  lastLiquidDeg: number;
  /** Last-written tilt for the icon <clipPath>. */
  lastIconDeg: number;
  /** Spring state (angle + velocity) for the icon's delayed overshoot. */
  iconAngle: number;
  iconVel: number;
}

export interface SyncContext {
  bodies: { chain: ChainResult; flask: FlaskResult };
  chainEls: (HTMLDivElement | null)[];
  flaskEl: HTMLDivElement | null;
  liquidRectEl: SVGRectElement | null;
  iconEl: SVGGElement | null;
  staticCount: number;
  scale: number;
  shape: FlaskShape;
  deadband: SyncDeadbandRefs;
}

/** Sync chain link wrappers from their Matter bodies, gated on the sub-pixel
 *  deadband. Static-top links occupy the earlier refs and are positioned once;
 *  physics body i maps to chain-link `staticCount + i`. */
function syncChainLinks(ctx: SyncContext) {
  const { bodies, chainEls, staticCount, scale, deadband } = ctx;
  const { chain } = bodies;
  for (let i = 0; i < chain.segments.length; i++) {
    const el = chainEls[staticCount + i];
    if (!el) continue;
    const seg = chain.segments[i];
    const h = chain.segmentHeights[i]; // UNSCALED — sizes the wrapper box
    const x = seg.position.x - CHAIN_SEGMENT_WIDTH / 2;
    const y = seg.position.y - h / 2;
    const angleDeg = seg.angle * (180 / Math.PI);
    const last = deadband.lastChainTransforms[i];
    if (
      !last ||
      Math.abs(x - last.x) >= TRANSFORM_PX_EPSILON ||
      Math.abs(y - last.y) >= TRANSFORM_PX_EPSILON ||
      Math.abs(angleDeg - last.a) >= TRANSFORM_DEG_EPSILON
    ) {
      deadband.lastChainTransforms[i] = { x, y, a: angleDeg };
      el.style.transform = `translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${scale})`;
    }
  }
}

/** Sync the flask wrapper transform + the inner water/icon tilt. Returns the
 *  flask body's clamped tilt so the caller (or here) can chain icon spring. */
function syncFlaskBody(ctx: SyncContext): { fb: Matter.Body; clampedDeg: number } | null {
  const { bodies, flaskEl, liquidRectEl, scale, shape, deadband } = ctx;
  const { flask } = bodies;
  const fb = flask.body;
  if (!flaskEl) {
    // Compute clampedDeg even without an element so the icon spring can stay
    // live (it doesn't depend on flaskEl being present).
    const angleDeg = fb.angle * (180 / Math.PI);
    const normDeg = (((-angleDeg + 180) % 360) + 360) % 360 - 180;
    const clampedDeg = Math.max(
      -MAX_LIQUID_TILT_DEG,
      Math.min(MAX_LIQUID_TILT_DEG, normDeg),
    );
    return { fb, clampedDeg };
  }

  const x = fb.position.x - FLASK_WIDTH / 2;
  const y = fb.position.y - FLASK_HEIGHT / 2;
  const angleDeg = fb.angle * (180 / Math.PI);
  const lastF = deadband.lastFlaskTransform;
  if (
    !lastF ||
    Math.abs(x - lastF.x) >= TRANSFORM_PX_EPSILON ||
    Math.abs(y - lastF.y) >= TRANSFORM_PX_EPSILON ||
    Math.abs(angleDeg - lastF.a) >= TRANSFORM_DEG_EPSILON
  ) {
    deadband.lastFlaskTransform = { x, y, a: angleDeg };
    flaskEl.style.transform = `translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${scale})`;
  }

  // Counter-rotate the liquid so its surface stays level — but NORMALISE to
  // [-180,180] first. Matter accumulates fb.angle unbounded; a flip/spin would
  // otherwise leave clampedDeg pinned at the limit forever.
  const normDeg = (((-angleDeg + 180) % 360) + 360) % 360 - 180;
  const clampedDeg = Math.max(
    -MAX_LIQUID_TILT_DEG,
    Math.min(MAX_LIQUID_TILT_DEG, normDeg),
  );
  const pivot = FLASK_SHAPE_DEFS[shape].pivot;
  if (Math.abs(clampedDeg - deadband.lastLiquidDeg) >= LIQUID_WRITE_EPSILON) {
    deadband.lastLiquidDeg = clampedDeg;
    liquidRectEl?.setAttribute(
      "transform",
      `rotate(${clampedDeg}, ${pivot.x}, ${pivot.y})`,
    );
  }
  return { fb, clampedDeg };
}

/** Step the icon's delayed-overshoot spring toward the liquid angle and write
 *  its transform when the rendered angle has actually moved. The maths is
 *  cheap and always runs (keeps the spring live); only the DOM write is
 *  gated so the spring stops repainting once it damps out. */
function stepIconSpring(ctx: SyncContext, target: number) {
  const { iconEl, shape, deadband } = ctx;
  const dt = 1 / 60;
  const stiffness = 4.5;
  const damping = 0.55;
  const spring = (target - deadband.iconAngle) * stiffness;
  const damp = -deadband.iconVel * damping;
  deadband.iconVel += (spring + damp) * dt * 60;
  deadband.iconAngle += deadband.iconVel * dt;
  if (Math.abs(deadband.iconAngle - deadband.lastIconDeg) >= ICON_WRITE_EPSILON) {
    deadband.lastIconDeg = deadband.iconAngle;
    const pivot = FLASK_SHAPE_DEFS[shape].pivot;
    iconEl?.setAttribute(
      "transform",
      `rotate(${deadband.iconAngle}, ${pivot.x}, ${pivot.y})`,
    );
  }
}

/** One per-frame DOM sync pass for a physics flask. Skips entirely when the
 *  flask body is sleeping (nothing moved). */
export function syncFlaskFrame(ctx: SyncContext) {
  if (ctx.bodies.flask.body.isSleeping) return;
  syncChainLinks(ctx);
  const flaskState = syncFlaskBody(ctx);
  if (flaskState) stepIconSpring(ctx, flaskState.clampedDeg);
}
