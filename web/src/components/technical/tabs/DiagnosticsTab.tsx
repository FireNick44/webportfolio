"use client";

import {
  Section,
  type Row,
} from "@/components/technical/panelPrimitives";
import type { DeviceInfo } from "@/lib/hooks/useDeviceInfo";

// "Diagnostics" tab — four read-only Sections: Device (UA-derived), Display
// (screen + viewport), Preferences (prefers-* media queries), Hardware
// (deviceMemory + cores + touch). Parent passes the already-mounted snapshot.
export default function DiagnosticsTab({
  device,
  display,
  media,
  hardware,
}: {
  device: DeviceInfo;
  display: Row[];
  media: Row[];
  hardware: Row[];
}) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Section
        title="Device"
        rows={[
          ["Form factor", device.form],
          ["Operating system", device.os],
          ["Browser", device.browser],
          ["Engine", device.engine],
        ]}
      />
      <Section title="Display" rows={display} />
      <Section title="Preferences" rows={media} />
      <Section title="Hardware" rows={hardware} />
    </div>
  );
}
