import { cn } from "@/lib/utils";

type GlowPos = "tl" | "tr" | "bl" | "br" | "center";

// Soft, theme-aware atmosphere for a section: an accent-coloured radial glow
// (follows --accent, so it shifts with theme presets) plus subtle film grain.
// Drop into any `position: relative` section; it's purely decorative.
const POS: Record<GlowPos, React.CSSProperties> = {
  tl: { top: "-12rem", left: "-12rem" },
  tr: { top: "-12rem", right: "-12rem" },
  bl: { bottom: "-12rem", left: "-12rem" },
  br: { bottom: "-12rem", right: "-12rem" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

export function Atmosphere({
  className,
  glow = "tr",
  intensity = 0.1,
  grain = true,
}: {
  className?: string;
  glow?: GlowPos | false;
  intensity?: number;
  grain?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {glow && (
        <div
          className="absolute h-[36rem] w-[36rem] rounded-full blur-[130px]"
          style={{
            ...POS[glow],
            background:
              "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
            opacity: intensity,
          }}
        />
      )}
      {grain && <div className="grain absolute inset-0" />}
    </div>
  );
}
