import type { Dictionary } from "@/i18n/types";
import { Reveal } from "@/components/ui/Reveal";
import { SkillsTable } from "@/components/sections/SkillsTable";
import { AboutPhoto } from "@/components/sections/AboutPhoto";

export default function About({ dict }: { dict: Dictionary }) {
  return (
    <section
      id="me"
      className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 sm:py-36"
    >
      <Reveal>
        <span className="lab-label">{dict.about.label}</span>
      </Reveal>

      <div className="mt-10 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          {/* Spins in, then keeps a subtle scroll-linked tilt + scale. */}
          <AboutPhoto />
        </div>

        <div className="flex flex-col gap-12">
          <Reveal>
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              {dict.about.title}
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
              {dict.about.bio.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <SkillsTable />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
