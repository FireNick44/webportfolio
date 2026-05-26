// Flask shape variants. The "rect" entry preserves the existing bottle visual
// EXACTLY; "round" + "cone" are drafts adapted from the 2024 portfolio's other
// flask SVGs (borders thinned from strokeWidth 3 → 1.5 to match the rest of the
// rack). Each shape exposes the geometry FlaskSVG needs to swap one for another
// without changing the chain/physics wiring: viewBox, glass body path, water
// path, water-line clip Y (the surface the liquid counter-rotates around), icon
// position, rotation pivot, cork + band, and sheen highlights.

export type FlaskShape = "rect" | "round" | "cone";

export const FLASK_SHAPES: readonly FlaskShape[] = ["rect", "round", "cone"];

export interface FlaskShapeDef {
  viewBox: string;
  glass: { d: string; transform?: string };
  water: { d: string; transform?: string };
  /** Water surface Y in viewBox coords — the clip rect's top edge. */
  clipY: number;
  /** Pivot the liquid + icon counter-rotate around (≈ body centre). */
  pivot: { x: number; y: number };
  /** Where the skill icon sits in viewBox coords. */
  iconBox: { x: number; y: number; w: number; h: number };
  cork: { x: number; y: number; w: number; h: number };
  /** Darker overlay path on top of the cork (depth shading). */
  corkOverlay: { d: string; transform: string };
  band: { d: string; transform: string };
  /** Two glass-sheen highlights drawn over the icon. `gradient: true` uses the
   *  shared gradId3 fill; otherwise a flat white-alpha fill. */
  sheens: { d: string; transform?: string; gradient?: boolean }[];
  /** Optional body-shading path drawn between glass body and icon (subtle
   *  left-side highlight, ported from the 2024 SVGs). Fills with the dedicated
   *  shade gradient (vertical white-alpha → transparent). */
  bodyShade?: { d: string; transform?: string };
  /** Body-local px to shift the chain's flask-attachment up by (negative = up).
   *  Some shapes (cone, with its longer cork+neck) need this so the chain ends
   *  at the cork top rather than partway down the cork. Multiplied by `scale`. */
  chainAttachOffsetPx?: number;
}

const STROKE = 1;

export const FLASK_SHAPE_DEFS: Record<FlaskShape, FlaskShapeDef> = {
  // Current rectangular bottle — unchanged geometry.
  rect: {
    viewBox: "0 0 139 180",
    glass: {
      d: "M74.714,171H61.122C6.651,171.239,7,140.671,7,135.148V16H4a4,4,0,0,1-4-4V4A4,4,0,0,1,4,0H135a4,4,0,0,1,4,4v8a4,4,0,0,1-4,4h-3V135.148c0,5.5.242,35.849-56.61,35.851Z",
      transform: "translate(0, 9)",
    },
    water: {
      d: "M15.01,49.439H116v84.446c0,4.873.2,31.843-46.287,31.631H58.731C14.718,165.728,15,138.758,15,133.885Z",
      transform: "translate(4, 2.483)",
    },
    clipY: 65,
    pivot: { x: 69.5, y: 90 },
    iconBox: { x: 34, y: 62, w: 70, h: 70 },
    cork: { x: 17, y: 0, w: 105, h: 33 },
    corkOverlay: {
      d: "M3,0h99a3,3,0,0,1,3,3V9.019L0,8.987S0,4.274,0,3A3,3,0,0,1,3,0Z",
      transform: "translate(17, 0)",
    },
    band: { d: "M7,16V13H126v3Z", transform: "translate(3, 9)" },
    sheens: [
      {
        d: "M62.567,71.2s4.588-43.336-11.624-60.058S0,1.481,0,1.481,23.391,6.4,40.481,22.282C47.368,28.682,56.959,42.241,62.567,71.2Z",
        transform: "translate(125.448, 109.577) rotate(90)",
      },
      {
        d: "M68.132,24.612c1.4-6.2-12.111-5.589-35.888-3.41s-47.7,4.728-46.834,10.69S66.734,30.813,68.132,24.612Z",
        transform: "translate(49.692, 66.147) rotate(96)",
        gradient: true,
      },
    ],
  },

  // Round-bottom flask: narrow neck, spherical body. Adapted from the 2024 SVG.
  round: {
    viewBox: "0 0 157 202",
    glass: {
      d: "M54.9111 10.4998H101.814C103.195 10.4998 104.314 11.6197 104.314 13.0007V21.0007C104.314 22.3805 103.196 23.4997 101.814 23.4998H95.9512V49.8386L97.0889 50.1208C130.493 58.4264 155.225 88.4379 155.226 124.17C155.226 166.316 120.823 200.501 78.3633 200.501C35.9029 200.501 1.5 166.316 1.5 124.17C1.50018 88.4351 26.2283 58.4236 59.6367 50.1199L60.7754 49.8376V23.4998H54.9111C53.5304 23.4998 52.4113 22.381 52.4111 21.0007V13.0007C52.4111 11.6192 53.5305 10.4998 54.9111 10.4998Z",
    },
    water: {
      d: "M78.363 189C69.6739 189 61.2449 187.294 53.3098 183.931C45.6456 180.683 38.7623 176.032 32.8513 170.108C26.9404 164.185 22.2996 157.287 19.0579 149.606C15.7017 141.655 14 133.208 14 124.5C14 117.654 15.0646 110.914 17.1643 104.468C19.1954 98.2322 22.1647 92.3552 25.9897 87.0001H130.735C134.561 92.3558 137.53 98.2327 139.561 104.468C141.66 110.914 142.725 117.654 142.725 124.5C142.725 133.208 141.023 141.655 137.667 149.606C134.425 157.287 129.785 164.185 123.874 170.108C117.963 176.032 111.08 180.683 103.416 183.931C95.4807 187.294 87.0518 189 78.363 189Z",
    },
    // Water lowered (87→105) + icon raised (92→85) so the icon's top peaks
    // clearly above the surface, matching the rect's "icon-pops-out" feel.
    clipY: 105,
    pivot: { x: 78.5, y: 105 },
    iconBox: { x: 43, y: 85, w: 70, h: 70 },
    cork: { x: 64.86, y: 0, w: 27, h: 33 },
    corkOverlay: {
      d: "M3,0h21a3,3,0,0,1,3,3V9.019L0,8.987S0,4.274,0,3A3,3,0,0,1,3,0Z",
      transform: "translate(64.86, 0)",
    },
    band: { d: "M0,3V0H32.24V3Z", transform: "translate(62.24, 22)" },
    sheens: [
      {
        d: "M77.5 191.446C77.5 191.446 105.811 191.313 124.691 177.674C143.572 164.035 145.5 130.346 145.5 130.346C145.5 130.346 130 154.346 114.5 167.946C99 181.546 77.5 191.446 77.5 191.446Z",
      },
      {
        d: "M33.7272 82.2469C39.0459 78.7678 46.6069 81.0824 49.3192 87.1743C52.0314 93.2662 48.8585 99.0978 42.8094 102.646C36.7602 106.194 29.6683 103.223 26.956 97.131C24.2437 91.0392 28.4086 85.726 33.7272 82.2469Z",
      },
    ],
  },

  // Conical / Erlenmeyer-style flask: narrow neck, triangle expanding to a flat
  // square base. Adapted from the 2024 SVG.
  cone: {
    viewBox: "0 0 125 201",
    glass: {
      d: "M41 10.5H85C86.3811 10.5002 87.5 11.6202 87.5 13V21C87.4998 22.3808 86.3808 23.4998 85 23.5H80.5V50.0928L81.0127 50.541L123.5 87.6855V191C123.5 195.695 119.694 199.5 115 199.5H10C5.30601 199.5 1.50011 195.695 1.5 191V87.6855L44.9873 49.666L45.5 49.2178V23.5H41C39.6192 23.4998 38.5002 22.3808 38.5 21V13C38.5 11.6202 39.6189 10.5002 41 10.5Z",
    },
    water: {
      d: "M12 95H113V183C113 187.418 109.418 191 105 191H20C15.5817 191 12 187.418 12 183V95Z",
    },
    // Water lowered (95→120). Icon sits a touch lower in the cone body so it
    // doesn't crowd the cork/neck up top.
    clipY: 120,
    pivot: { x: 62.5, y: 120 },
    iconBox: { x: 27, y: 98, w: 70, h: 70 },
    cork: { x: 50, y: 0, w: 26, h: 33 },
    corkOverlay: {
      d: "M3,0h20a3,3,0,0,1,3,3V9.019L0,8.987S0,4.274,0,3A3,3,0,0,1,3,0Z",
      transform: "translate(50, 0)",
    },
    band: { d: "M0,3V0H32V3Z", transform: "translate(47, 22)" },
    sheens: [
      {
        d: "M49.2744 193.547C49.2744 193.547 109.746 195.243 113.16 192.092C116.573 188.941 117.275 135.445 117.275 135.445C117.275 135.445 115.264 164.575 99.7744 180.445C86.7744 192.092 77.5189 188.339 49.2744 193.547Z",
      },
    ],
    // Left-side highlight from the 2024 cone SVG — the gradient that was
    // dropped when porting; brings the body shading back.
    bodyShade: {
      d: "M50.9057 40.5561C50.3344 41.7636 51.2434 50.307 49.9311 52.8022C48.6187 55.2973 9.49454 86.1679 7.82376 91.734C6.15299 97.3 5.81046 189.556 7.72244 192.355C9.63443 195.154 45.2038 194.035 45.2038 194.035V90.0693L58.2714 52.8022V39.5068C58.2714 39.5068 51.477 39.3486 50.9057 40.5561Z",
    },
    // Cone's cork sits taller in the viewBox than the rect's, so the default
    // chain-attachment point (top of body hitbox) lands ~75% down the cork.
    // Lift the constraint point by 22 body-local px so the chain visually
    // ends near the TOP of the cork.
    chainAttachOffsetPx: -22,
  },
};

export const FLASK_GLASS_STROKE = STROKE;

/** Override a CSS rgb/rgba colour string's alpha. The flask palette stores
 *  colours as "rgba(R, G, B, 0.7)"; the technical panel can live-tune water
 *  opacity by overriding the alpha here at render time. */
export function withAlpha(rgba: string, alpha: number): string {
  const m = rgba.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgba;
  const parts = m[1].split(",").map((s) => s.trim());
  if (parts.length < 3) return rgba;
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}
