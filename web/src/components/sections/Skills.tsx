import PhysicsSceneClient from "@/components/physics/PhysicsSceneClient";
import FlaskBackdrop from "@/components/sections/skills/FlaskBackdrop";
import { Reveal } from "@/components/ui/Reveal";
import type { Dictionary } from "@/i18n/types";

export default function Skills({ dict }: { dict: Dictionary }) {
  return (
    <section id="skills" className="relative overflow-hidden">
      {/* Skills overview — plain black/white background (no bubbles) */}
      <div className="relative pb-4 pt-16 sm:pt-20">
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <span className="lab-label">{dict.skills.label}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              {dict.skills.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-foreground/90">
              {dict.skills.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="lab-label mt-8 inline-block border border-border px-3 py-2">
              {dict.skills.hint}
            </p>
          </Reveal>
        </div>
      </div>

      {/* The real Matter.js flask rack. Desktop: a pinned 100vh scene. Mobile:
          a taller scroll-through section (170vh) so the 3-per-row grid has room
          to hang on long chains. Heights match PhysicsScene's container. */}
      <div className="relative h-[120vh] md:h-screen">
        <PhysicsSceneClient backdrop={<FlaskBackdrop />} hint={dict.skills.hint} />
      </div>
    </section>
  );
}
