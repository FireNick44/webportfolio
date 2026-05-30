"use client";

import { Menu, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Monogram } from "@/components/layout/Monogram";
import { usePageTransition } from "@/components/layout/PageTransitionProvider";
import { ThemeTogglerButton } from "@/components/theme/ThemeTogglerButton";
import { iconButtonVariants } from "@/components/ui/button-variants";
import type { Dictionary } from "@/i18n/types";
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { navigateTo } = usePageTransition();
  const pathname = usePathname();
  const homePath = `/${lang}`;

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
          href={homePath}
          onClick={(e) => {
            e.preventDefault();
            // On a subpage (technical / datenschutz / impressum) navigate to
            // the locale's home; on home itself just smooth-scroll to the top.
            if (pathname === homePath) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              navigateTo(homePath);
            }
          }}
          className="text-foreground transition-opacity hover:opacity-70"
          aria-label="Yannic Studer — home"
        >
          <Monogram className="h-6 w-auto" />
        </a>

        <div className="flex items-center gap-3 md:gap-5">
          {/* Desktop inline nav with a shared underline that slides between
              hovered items (direction emerges from layout animation). */}
          <nav
            className="hidden items-center gap-6 md:flex"
            onMouseLeave={() => setHoveredId(null)}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId((cur) => (cur === item.id ? null : cur))}
                className={cn(
                  "relative font-mono text-[0.68rem] uppercase tracking-[0.26em] transition-colors",
                  hoveredId === item.id ? "text-current" : "text-current/70",
                )}
              >
                {item.label}
                <AnimatePresence>
                  {hoveredId === item.id && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-current"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        layout: { duration: 0.35, ease: EASE },
                        opacity: { duration: 0.15 },
                      }}
                    />
                  )}
                </AnimatePresence>
              </button>
            ))}
          </nav>

          <div className="hidden h-4 w-px bg-border md:block" />

          <LanguageSwitcher lang={lang} />
          <ThemeTogglerButton />

          {/* GitHub profile — moved out of the projects grid into the bar. */}
          <a
            href="https://github.com/FireNick44/FireNick44"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              iconButtonVariants({ variant: "ghost", size: "sm" }),
              "group",
            )}
            aria-label="GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="currentColor"
              aria-hidden
              className="transition-transform duration-300 group-hover:scale-110"
            >
              <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.2 11.19.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2C5.67 21.58 5 19.49 5 19.49c-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.21.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.5.97.11-.76.42-1.27.76-1.56-2.66-.29-5.47-1.29-5.47-5.74 0-1.27.46-2.31 1.21-3.12-.12-.29-.52-1.46.12-3.05 0 0 .98-.31 3.2 1.19a11.3 11.3 0 0 1 5.83 0c2.22-1.5 3.2-1.19 3.2-1.19.64 1.59.24 2.76.12 3.05.75.81 1.21 1.85 1.21 3.12 0 4.46-2.81 5.45-5.49 5.73.43.36.81 1.08.81 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.83.56C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z" />
            </svg>
          </a>

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
