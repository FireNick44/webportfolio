"use client";

import FlaskRackPanel from "@/components/technical/panels/FlaskRackPanel";
import ModePanel from "@/components/technical/panels/ModePanel";
import OutroPanel from "@/components/technical/panels/OutroPanel";
import ThemePresetsPanel from "@/components/technical/panels/ThemePresetsPanel";
import TokenEditorPanel from "@/components/technical/panels/TokenEditorPanel";
import type { Dictionary } from "@/i18n/types";

// "Appearance" tab — composes the five sub-panels in vertical order. Each
// sub-panel is self-contained (subscribes to its own slice of useAppStore),
// so this file is just layout glue.
export default function AppearanceTab({ dict }: { dict: Dictionary }) {
  return (
    <div className="mt-8 space-y-8">
      <ModePanel dict={dict} />
      <OutroPanel />
      <FlaskRackPanel />
      <ThemePresetsPanel />
      <TokenEditorPanel />
    </div>
  );
}
