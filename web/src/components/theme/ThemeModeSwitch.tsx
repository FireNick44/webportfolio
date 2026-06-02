"use client";

import { Dices, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import * as React from "react";

import type { Dictionary } from "@/i18n/types";
import { useAppStore, type ThemeMode } from "@/lib/store/useAppStore";
import { applyThemeMode, runThemeTransition } from "@/lib/theme/themeMode";
import { cn } from "@/lib/utils";

/** Four-way theme control: Light · Dark · System (follows the OS) · Random (a
 *  generated palette, seed shared via `?shuffle=`). Light/Dark/System apply with
 *  the clip-path view-transition wipe; Random drops the boot-loader curtain over
 *  the in-place repaint (same as the footer's Shuffle button) and re-rolls on
 *  every press. The active mode is highlighted (after mount, to avoid a
 *  hydration mismatch on the persisted choice). */
export function ThemeModeSwitch({
  dict,
  className,
}: {
  dict: Dictionary;
  className?: string;
}) {
  const themeMode = useAppStore((s) => s.themeMode);
  const requestLoader = useAppStore((s) => s.requestLoader);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const items: { mode: ThemeMode; label: string; Icon: LucideIcon }[] = [
    { mode: "light", label: dict.menu.themeLight, Icon: Sun },
    { mode: "dark", label: dict.menu.themeDark, Icon: Moon },
    { mode: "device", label: dict.menu.themeDevice, Icon: Monitor },
    { mode: "random", label: dict.menu.themeRandom, Icon: Dices },
  ];

  const choose = (mode: ThemeMode) => {
    // Re-picking the current mode is a no-op — except Random, which re-rolls.
    if (mode === themeMode && mode !== "random") return;
    if (mode === "random") {
      requestLoader(); // curtain over the in-place repaint
      applyThemeMode("random");
      return;
    }
    runThemeTransition(() => applyThemeMode(mode));
  };

  return (
    <div
      role="radiogroup"
      aria-label={dict.menu.theme}
      className={cn(
        "inline-flex items-center divide-x divide-border border border-border",
        className,
      )}
    >
      {items.map(({ mode, label, Icon }) => {
        const active = mounted && themeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(mode)}
            className={cn(
              "group inline-flex h-8 w-8 cursor-pointer items-center justify-center transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-current/65 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              size={15}
              aria-hidden
              className={cn(
                "transition-transform duration-300 ease-[var(--ease-lab)]",
                mode === "random" && "group-hover:rotate-12",
                mode !== "random" && "group-hover:scale-110",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
