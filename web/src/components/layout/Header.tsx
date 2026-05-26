"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Settings, X } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { ThemeTogglerButton } from "@/components/theme/ThemeTogglerButton";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { usePageTransition } from "@/components/layout/PageTransitionProvider";
import { iconButtonVariants } from "@/components/ui/button-variants";
import { Monogram } from "@/components/layout/Monogram";
import { cn } from "@/lib/utils";

const EASE = [0.76, 0, 0.24, 1] as const;

export default function Header({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const [open, setOpen] = useState(false);
  const { navigateTo } = usePageTransition();

  const items: { id: string; label: string }[] = [
    { id: "me", label: dict.nav.me },
    { id: "skills", label: dict.nav.skills },
    { id: "projects", label: dict.nav.projects },
    { id: "contact", label: dict.nav.contact },
  ];

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const goTo = (id: string) => {
    setOpen(false);
    setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <>
      {/* Theme-matching header bar: same background/text as the page so the whole
          app reads as one palette. Translucent + blurred so the colourful hero
          shows through, with a hairline for definition. */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[200] flex items-center justify-between",
          "px-5 py-2.5 sm:px-8 sm:py-3",
          // Glassy, not a solid gray bar: faint tint + blur so the hero shows
          // through, no border.
          "bg-background/20 text-foreground backdrop-blur-md",
        )}
      >
        <a
          href={`/${lang}`}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="text-foreground transition-opacity hover:opacity-70"
          aria-label="Yannic Studer — home"
        >
          <Monogram className="h-6 w-auto" />
        </a>

        <div className="flex items-center gap-3 md:gap-5">
          {/* Desktop inline nav with an animated underline */}
          <nav className="hidden items-center gap-6 md:flex">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                className="group relative font-mono text-[0.68rem] uppercase tracking-[0.26em] text-current/70 transition-colors hover:text-current"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-[var(--ease-lab)] group-hover:scale-x-100" />
              </button>
            ))}
          </nav>

          <div className="hidden h-4 w-px bg-border md:block" />

          <LanguageSwitcher lang={lang} />
          <ThemeTogglerButton />

          {/* Settings: desktop only — gear spins on hover */}
          <button
            type="button"
            onClick={() => navigateTo(`/${lang}/technical`)}
            className={cn(
              iconButtonVariants({ variant: "ghost", size: "sm" }),
              "group hidden md:inline-flex",
            )}
            aria-label={dict.nav.technical}
          >
            <Settings
              size={17}
              className="transition-transform duration-500 ease-[var(--ease-lab)] group-hover:rotate-90"
            />
          </button>

          {/* Menu button: mobile only */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              iconButtonVariants({ variant: "ghost", size: "sm" }),
              "group gap-2 md:hidden",
            )}
            aria-label={dict.menu.open}
            aria-expanded={open}
          >
            <Menu
              size={20}
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.55, ease: EASE }}
            className="fixed inset-0 z-[250] flex flex-col bg-background"
          >
            <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
              <Monogram className="h-7 w-auto text-foreground" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(iconButtonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
                aria-label={dict.menu.close}
              >
                <span className="lab-label hidden sm:inline">{dict.menu.close}</span>
                <X size={22} />
              </button>
            </div>

            <nav className="flex grow flex-col justify-center gap-2 px-5 sm:px-8">
              {items.map((item, i) => (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.5, ease: EASE }}
                  className="group flex items-baseline gap-4 text-left"
                >
                  <span className="lab-label w-10 shrink-0 text-right opacity-60">
                    0{i + 1}
                  </span>
                  <span className="font-display text-5xl font-bold leading-[1.05] tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-7xl">
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </nav>

            <div className="hairline mx-5 flex items-center justify-between gap-4 py-5 sm:mx-8">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigateTo(`/${lang}/technical`);
                }}
                className={cn(iconButtonVariants({ variant: "outline", size: "sm" }), "gap-2 px-3 w-auto")}
              >
                <Settings size={16} />
                <span className="lab-label">{dict.nav.technical}</span>
              </button>
              <div className="flex items-center gap-5">
                <LanguageSwitcher lang={lang} />
                <ThemeTogglerButton variant="outline" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
