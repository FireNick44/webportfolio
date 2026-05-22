import { cn } from "@/lib/utils";

/**
 * The animated "bubbles" background reused from Noel's original portfolio
 * (src/svg/intro-bg.svg) — full colour, embedded via <img> so its SMIL
 * animation runs (it does not as a CSS background).
 */
export function BubblesBackdrop({
  className,
  intensity = "full",
}: {
  className?: string;
  intensity?: "subtle" | "full";
}) {
  const op = intensity === "subtle" ? "opacity-70" : "opacity-100";

  return (
    <div aria-hidden className={cn("overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/intro-bg.svg"
        alt=""
        className={cn("absolute inset-0 h-full w-full object-cover", op)}
      />
    </div>
  );
}
