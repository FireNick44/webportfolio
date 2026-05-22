export function parseBrowser(ua: string): string {
  if (/CriOS\/(\d+)/.test(ua)) return `Chrome iOS ${ua.match(/CriOS\/(\d+)/)?.[1] ?? ""}`;
  if (/EdgiOS\/(\d+)/.test(ua)) return `Edge iOS ${ua.match(/EdgiOS\/(\d+)/)?.[1] ?? ""}`;
  if (/FxiOS\/(\d+)/.test(ua)) return `Firefox iOS ${ua.match(/FxiOS\/(\d+)/)?.[1] ?? ""}`;
  if (/OPiOS/.test(ua)) return "Opera iOS";
  if (/Edg\/(\d+)/.test(ua)) return `Edge ${ua.match(/Edg\/(\d+)/)?.[1] ?? ""}`;
  if (/Chrome\/(\d+)/.test(ua) && !/Chromium/.test(ua)) return `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] ?? ""}`;
  if (/Firefox\/(\d+)/.test(ua)) return `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] ?? ""}`;
  if (/Version\/([\d.]+).*Safari/.test(ua)) return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ""}`;
  return "Unknown";
}

export function parseOS(ua: string): string {
  if (/iPad.*OS ([\d_]+)/.test(ua)) return `iPadOS ${ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? ""}`;
  if (/iPhone.*OS ([\d_]+)/.test(ua)) return `iOS ${ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? ""}`;
  if (/Android ([\d.]+)/.test(ua)) return `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ""}`;
  if (/Mac OS X ([\d_]+)/.test(ua)) {
    const v = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "";
    return `macOS ${v === "10.15.7" ? "10.15.7 or above" : v}`;
  }
  if (/Windows NT ([\d.]+)/.test(ua)) {
    const ntVer: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    const v = ua.match(/Windows NT ([\d.]+)/)?.[1] ?? "";
    return `Windows ${ntVer[v] ?? v}`;
  }
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

export function parseEngine(ua: string): string {
  if (/Gecko\/\d+/.test(ua) && /Firefox/.test(ua)) return "Gecko";
  if (/AppleWebKit\/([\d.]+)/.test(ua)) {
    const v = ua.match(/AppleWebKit\/([\d.]+)/)?.[1] ?? "";
    return /Chrome/.test(ua) ? `Blink (WebKit/${v})` : `WebKit/${v}`;
  }
  return "Unknown";
}

export function guessIPhoneModel(sw: number, sh: number, dpr: number): string {
  const l = Math.max(sw, sh) * dpr;
  const s = Math.min(sw, sh) * dpr;
  if (l === 2796 && s === 1290) return "iPhone 14 Pro Max / 15 Plus / 15 Pro Max";
  if (l === 2556 && s === 1179) return "iPhone 14 Pro / 15 / 15 Pro";
  if (l === 2778 && s === 1284) return "iPhone 12 Pro Max / 13 Pro Max / 14 Plus";
  if (l === 2532 && s === 1170) return "iPhone 12 / 12 Pro / 13 / 13 Pro / 14";
  if (l === 2340 && s === 1080) return "iPhone 12 mini / 13 mini";
  if (l === 1792 && s === 828) return "iPhone XR / 11";
  if (l === 2688 && s === 1242) return "iPhone XS Max / 11 Pro Max";
  if (l === 2436 && s === 1125) return "iPhone X / XS / 11 Pro";
  if (l === 1334 && s === 750) return "iPhone 6/7/8 / SE (2nd/3rd gen)";
  if (l === 1136 && s === 640) return "iPhone 5 / SE (1st gen)";
  return `iPhone (${sw}×${sh} @${dpr}x)`;
}
