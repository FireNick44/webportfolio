"use client";

import { Dices, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import * as React from "react";

import {
  iconButtonVariants,
  type IconButtonVariantProps,
} from "@/components/ui/button-variants";
import type { Dictionary } from "@/i18n/types";
import { useAppStore, type ThemeMode } from "@/lib/store/useAppStore";
import {
  applyThemeMode,
  runThemeTransition,
  type Direction,
} from "@/lib/theme/themeMode";
import { cn } from "@/lib/utils";

const ORDER: ThemeMode[] = ["light", "dark", "device", "random"];
const ICON: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  device: Monitor,
  random: Dices,
};

type Props = React.ComponentProps<"button"> &
  IconButtonVariantProps & {
    direction?: Direction;
    dict: Dictionary;
  };

/** Single icon button that CYCLES the theme: light → dark → device → random →
 *  light. Light/dark/device apply with the clip-path view-transition wipe;
 *  random drops the boot-loader curtain (same as the footer switch). The icon
 *  shows the CURRENT mode; the label names it. Used in the header nav — the
 *  footer has the full 4-segment ThemeModeSwitch. */
export function ThemeCycleButton({
  variant = "ghost",
  size = "sm",
  direction = "ltr",
  dict,
  className,
  onClick,
  ...props
}: Props) {
  const themeMode = useAppStore((s) => s.themeMode);
  const requestLoader = useAppStore((s) => s.requestLoader);

  // Persisted mode only resolves on the client; render a stable icon for the
  // first paint so SSR and hydration match (SSR default is dark).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const current: ThemeMode = mounted ? themeMode : "dark";
  const Icon = ICON[current];
  const label: Record<ThemeMode, string> = {
    light: dict.menu.themeLight,
    dark: dict.menu.themeDark,
    device: dict.menu.themeDevice,
    random: dict.menu.themeRandom,
  };

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(themeMode) + 1) % ORDER.length];
    if (next === "random") {
      requestLoader(); // curtain over the in-place repaint
      applyThemeMode("random");
      return;
    }
    runThemeTransition(() => applyThemeMode(next), direction);
  };

  return (
    <button
      type="button"
      aria-label={`${dict.menu.theme}: ${label[current]}`}
      title={`${dict.menu.theme}: ${label[current]}`}
      className={cn(iconButtonVariants({ variant, size }), "group", className)}
      onClick={(e) => {
        onClick?.(e);
        cycle();
      }}
      {...props}
    >
      <Icon
        size={17}
        className={cn(
          "transition-transform duration-300 ease-[var(--ease-lab)]",
          current === "random"
            ? "group-hover:rotate-12 group-hover:scale-110"
            : "group-hover:scale-110",
        )}
      />
    </button>
  );
}
