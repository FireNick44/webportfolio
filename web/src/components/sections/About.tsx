import { AboutPhoto } from "@/components/sections/AboutPhoto";
import { SkillsTable } from "@/components/sections/SkillsTable";
import { Reveal } from "@/components/ui/Reveal";
import type { Dictionary } from "@/i18n/types";

export default function About({ dict, lang }: { dict: Dictionary; lang?: string }) {
  return (
    <section
      id="me"
      className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 sm:py-36"
    >
      {/* Centered intro at the top (label + title + bio). Lifted out of the
          right column so the photo and skills table can sit side-by-side below
          without the bio eating vertical space next to the table — closer to
          the 2024 portfolio's "intro on top, content row below" rhythm. */}
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="lab-label">{dict.about.label}</span>
        </Reveal>
        <Reveal>
          <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {dict.about.title}
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            {dict.about.bio.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[0.85fr_1.4fr] lg:gap-24">
        {/* Photo column — sticks while you scroll past the table. Pushed to the
            LEFT edge of its column (lg:mx-0 inside AboutPhoto), the wider
            grid-gap then carries the eye across the breathing room to the
            table on the right. */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <AboutPhoto />
        </div>

        <Reveal delay={0.1}>
          <SkillsTable lang={lang} />
        </Reveal>
      </div>
    </section>
  );
}
