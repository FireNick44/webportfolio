import { WaveDivider } from "@/components/ui/WaveDivider";
import { ByeSand } from "@/components/layout/ByeSand";

export function ClassicBackdrop() {
  return (
    <>
      {/* Darker "ocean" bubbles ending — reuses the hero bubbles, dimmed. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/svg/intro-bg.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      </div>

      <WaveDivider
        fill="var(--background)"
        flip
        className="absolute inset-x-0 top-0 z-[1]"
      />

      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-[clamp(70px,10vw,140px)] w-full" />
    </>
  );
}
