"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { ThemeToggler, type Resolved } from "@/components/theme/ThemeToggler";
import { iconButtonVariants, type IconButtonVariantProps } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/useAppStore";

type Props = React.ComponentProps<"button"> &
  IconButtonVariantProps & {
    direction?: "btt" | "ttb" | "ltr" | "rtl";
  };

export function ThemeTogglerButton({
  variant = "ghost",
  size = "sm",
  direction = "ltr",
  className,
  onClick,
  ...props
}: Props) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setPreset = useAppStore((s) => s.setPreset);
  const clearTokenOverrides = useAppStore((s) => s.clearTokenOverrides);
  const resolved = theme as Resolved;

  // The light/dark toggle is also the "escape hatch" back to the default Lab
  // palette: clear any active preset + token overrides, otherwise their inline
  // <html> vars would mask the theme flip and the toggle would appear dead.
  // Also drop the `#shuffle=…` hash that shuffleTheme writes — otherwise the
  // URL still advertises a random seed even though we're back on clean light
  // or dark, and a copy/paste would re-apply the old random theme on load.
  const toggleToTheme = (t: "light" | "dark") => {
    setPreset(null);
    clearTokenOverrides();
    setTheme(t);
    if (
      typeof window !== "undefined" &&
      window.location.hash.startsWith("#shuffle")
    ) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };

  // Persisted theme only resolves on the client; render a stable icon for the
  // first paint so SSR and hydration match (avoids a hydration mismatch).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <ThemeToggler
      resolved={resolved}
      setTheme={(t) => toggleToTheme(t)}
      direction={direction}
    >
      {({ resolved, toggleTheme }) => (
        <button
          type="button"
          aria-label="Toggle colour theme"
          className={cn(iconButtonVariants({ variant, size }), "group", className)}
          onClick={(e) => {
            onClick?.(e);
            toggleTheme();
          }}
          {...props}
        >
          {!mounted || resolved === "dark" ? (
            <Moon
              size={17}
              className="transition-transform duration-300 ease-[var(--ease-lab)] group-hover:-rotate-12 group-hover:scale-110"
            />
          ) : (
            <Sun
              size={17}
              className="transition-transform duration-300 ease-[var(--ease-lab)] group-hover:rotate-45 group-hover:scale-110"
            />
          )}
        </button>
      )}
    </ThemeToggler>
  );
}
