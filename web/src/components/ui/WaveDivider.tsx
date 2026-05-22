// Animated wave divider reused from Noel's original portfolio (morphing SMIL
// path, like the old #byeWave). Two layered waves drift at different speeds.
// Pure SMIL — no JS needed, so it works as a server component.

const FRONT_A =
  "M0,40 C180,80 360,0 540,40 C720,80 900,10 1080,45 C1260,80 1380,30 1440,45 L1440,132 L0,132 Z";
const FRONT_B =
  "M0,55 C180,18 360,92 540,55 C720,18 900,86 1080,50 C1260,14 1380,72 1440,55 L1440,132 L0,132 Z";
const BACK_A =
  "M0,62 C200,30 400,92 620,60 C840,28 1040,86 1240,56 C1340,42 1400,56 1440,60 L1440,132 L0,132 Z";
const BACK_B =
  "M0,46 C200,82 400,20 620,52 C840,84 1040,24 1240,56 C1340,70 1400,48 1440,46 L1440,132 L0,132 Z";

export function WaveDivider({
  fill = "var(--background)",
  flip = false,
  className,
  height = "clamp(56px, 8vw, 130px)",
}: {
  fill?: string;
  flip?: boolean;
  className?: string;
  height?: string;
}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{ lineHeight: 0, transform: flip ? "scaleY(-1)" : undefined }}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height, overflow: "visible" }}
      >
        <path fill={fill} fillOpacity={0.45}>
          <animate
            attributeName="d"
            dur="13s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
            values={`${BACK_A};${BACK_B};${BACK_A}`}
          />
        </path>
        <path fill={fill}>
          <animate
            attributeName="d"
            dur="9s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
            values={`${FRONT_A};${FRONT_B};${FRONT_A}`}
          />
        </path>
      </svg>
    </div>
  );
}
