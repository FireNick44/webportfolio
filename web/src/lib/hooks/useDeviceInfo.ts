import { useEffect, useState } from "react";

import type { Row } from "@/components/technical/panelPrimitives";

// Browser/OS/engine + form-factor detection for the diagnostics tab. UA
// sniffing here is BEST-EFFORT identification, not capability gating — we use
// matchMedia / feature checks for anything that drives real behaviour. Only
// touched on the technical panel; runs once on mount via useDeviceInfo().

export interface DeviceInfo {
  os: string;
  browser: string;
  engine: string;
  form: string;
  touch: boolean;
}

function detect(): DeviceInfo {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Brave/.test(ua)
        ? "Brave"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Unknown";
  const engine =
    /Gecko\/|Firefox/.test(ua) && !/like Gecko/.test(ua)
      ? "Gecko"
      : /AppleWebKit/.test(ua) && !/Chrome/.test(ua)
        ? "WebKit"
        : /AppleWebKit/.test(ua)
          ? "Blink"
          : "Unknown";
  const touch = navigator.maxTouchPoints > 0;
  const form =
    touch && window.innerWidth < 768
      ? "Mobile"
      : touch && window.innerWidth < 1100
        ? "Tablet"
        : "Desktop";
  return { os, browser, engine, form, touch };
}

function mediaList(): Row[] {
  const q = (s: string) =>
    typeof window !== "undefined" && window.matchMedia(s).matches ? "yes" : "no";
  return [
    ["prefers-color-scheme: dark", q("(prefers-color-scheme: dark)")],
    ["prefers-reduced-motion", q("(prefers-reduced-motion: reduce)")],
    ["prefers-contrast: more", q("(prefers-contrast: more)")],
    ["any-hover: hover", q("(any-hover: hover)")],
    ["any-pointer: fine", q("(any-pointer: fine)")],
  ];
}

function displayList(): Row[] {
  return [
    ["Viewport", `${window.innerWidth} × ${window.innerHeight}`],
    ["Screen", `${window.screen.width} × ${window.screen.height}`],
    ["Device pixel ratio", String(window.devicePixelRatio)],
    ["Colour depth", `${window.screen.colorDepth}-bit`],
    [
      "Orientation",
      window.matchMedia("(orientation: portrait)").matches
        ? "portrait"
        : "landscape",
    ],
    [
      "View Transitions",
      typeof document !== "undefined" && "startViewTransition" in document
        ? "supported"
        : "no",
    ],
  ];
}

function hardwareList(): Row[] {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  return [
    ["CPU cores", String(nav.hardwareConcurrency ?? "—")],
    ["Device memory", nav.deviceMemory ? `${nav.deviceMemory} GB` : "—"],
    ["Touch points", String(navigator.maxTouchPoints)],
    ["Online", navigator.onLine ? "yes" : "no"],
    ["Browser language", navigator.language],
  ];
}

export interface DeviceSnapshot {
  mounted: boolean;
  device: DeviceInfo | null;
  display: Row[];
  media: Row[];
  hardware: Row[];
}

/** Browser/OS/display/media/hardware snapshot for the diagnostics tab.
 *  All reads happen in a single mount-time effect — none of these change
 *  across the panel's lifetime. */
export function useDeviceInfo(): DeviceSnapshot {
  const [mounted, setMounted] = useState(false);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [display, setDisplay] = useState<Row[]>([]);
  const [media, setMedia] = useState<Row[]>([]);
  const [hardware, setHardware] = useState<Row[]>([]);

  useEffect(() => {
    setMounted(true);
    setDevice(detect());
    setMedia(mediaList());
    setDisplay(displayList());
    setHardware(hardwareList());
  }, []);

  return { mounted, device, display, media, hardware };
}
