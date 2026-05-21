import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { parseBrowser, parseOS, parseEngine, guessIPhoneModel } from "../utils/deviceUtils";

function DiagRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "8px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          opacity: 0.35,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 700,
          textAlign: "right",
          wordBreak: "break-all",
          lineHeight: 1.4,
          color: color ?? "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface Diag {
  isMobile: boolean;
  supportsVT: boolean;
  dpr: number;
  viewportW: number;
  viewportH: number;
  screenAvailW: number;
  screenAvailH: number;
  prefersColorScheme: string;
  prefersReducedMotion: boolean;
  prefersContrast: string;
  prefersHDR: boolean;
  supportsP3: boolean;
  pointerType: string;
  hoverCapability: string;
  webGL: boolean;
  webGL2: boolean;
  colorDepth: number;
  orientation: string;
  connection: string;
  connectionDownlink: string;
  maxTouchPoints: number;
  platform: string;
  languages: string;
  cpuCores: number;
  deviceMemory: string;
  cookieEnabled: boolean;
  doNotTrack: string;
  standalone: boolean;
}

export default function SettingsPage() {
  const store = useAppStore();
  const { theme, deviceInfo } = store;
  const [diag, setDiag] = useState<Diag | null>(null);

  useEffect(() => {
    const mq = (q: string) => window.matchMedia(q).matches;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    let webGL = false;
    let webGL2 = false;
    try {
      const c = document.createElement("canvas");
      webGL = !!c.getContext("webgl");
      webGL2 = !!c.getContext("webgl2");
    } catch {
      /* empty */
    }
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    setDiag({
      isMobile: navigator.maxTouchPoints > 0,
      supportsVT: typeof document.startViewTransition === "function",
      dpr: window.devicePixelRatio,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      screenAvailW: screen.availWidth,
      screenAvailH: screen.availHeight,
      prefersColorScheme: mq("(prefers-color-scheme: dark)") ? "dark" : "light",
      prefersReducedMotion: mq("(prefers-reduced-motion: reduce)"),
      prefersContrast: mq("(prefers-contrast: more)")
        ? "more"
        : mq("(prefers-contrast: less)")
          ? "less"
          : "no preference",
      prefersHDR: mq("(dynamic-range: high)"),
      supportsP3: mq("(color-gamut: p3)"),
      pointerType: mq("(pointer: fine)")
        ? "fine (mouse)"
        : mq("(pointer: coarse)")
          ? "coarse (touch)"
          : "none",
      hoverCapability: mq("(hover: hover)") ? "hover" : "none",
      webGL,
      webGL2,
      colorDepth: screen.colorDepth,
      orientation: screen.orientation?.type ?? "unknown",
      connection: conn?.effectiveType ?? "unknown",
      connectionDownlink: conn?.downlink != null ? `${conn.downlink} Mbps` : "unknown",
      maxTouchPoints: navigator.maxTouchPoints,
      platform: nav.userAgentData?.platform ?? nav.platform ?? "unknown",
      languages: navigator.languages?.join(", ") ?? navigator.language,
      cpuCores: navigator.hardwareConcurrency ?? 0,
      deviceMemory: nav.deviceMemory != null ? `${nav.deviceMemory} GB` : "unknown",
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack ?? "unknown",
      standalone: mq("(display-mode: standalone)") || nav.standalone,
    });
  }, []);

  const ua = deviceInfo?.userAgent ?? "";
  const browser = ua ? parseBrowser(ua) : "\u2014";
  const os = ua ? parseOS(ua) : "\u2014";
  const engine = ua ? parseEngine(ua) : "\u2014";

  const sc = deviceInfo?.screen;
  let formFactor = "Desktop";
  let deviceGuess = "\u2014";
  if (diag) {
    if (/iPad/.test(ua) || (diag.isMobile && diag.viewportW >= 768)) formFactor = "Tablet";
    else if (diag.isMobile) formFactor = "Mobile";
    if (/iPhone/.test(ua) && sc) deviceGuess = guessIPhoneModel(sc.width, sc.height, diag.dpr);
    else if (/iPad/.test(ua)) deviceGuess = diag.dpr >= 2 ? "iPad (Retina)" : "iPad";
    else if (/Android/.test(ua)) deviceGuess = "Android device";
    else if (/Mac OS X/.test(ua)) deviceGuess = diag.dpr >= 2 ? "Mac (Retina)" : "Mac";
    else if (/Windows/.test(ua)) deviceGuess = "Windows PC";
    else if (/Linux/.test(ua)) deviceGuess = "Linux Desktop";
  }

  const ok = "#69db7c";
  const warn = "#ff6b6b";

  type Row = { label: string; value: string; color?: string };
  const allRows: { heading: string; rows: Row[] }[] = [
    {
      heading: "Theme",
      rows: [
        { label: "Current theme", value: theme },
        {
          label: "View Transition",
          value: diag?.isMobile
            ? "skipped (mobile)"
            : diag?.supportsVT
              ? "active"
              : "unsupported",
          color: diag?.supportsVT && !diag?.isMobile ? ok : warn,
        },
      ],
    },
    {
      heading: "Browser & OS",
      rows: [
        { label: "Browser", value: browser },
        { label: "Engine", value: engine },
        { label: "OS", value: os },
        { label: "Platform (nav)", value: diag?.platform ?? "\u2014" },
        { label: "Languages", value: diag?.languages ?? "\u2014" },
      ],
    },
    {
      heading: "Display",
      rows: [
        { label: "Screen (CSS px)", value: sc ? `${sc.width}\u00d7${sc.height}` : "\u2014" },
        {
          label: "Screen avail",
          value: diag ? `${diag.screenAvailW}\u00d7${diag.screenAvailH}` : "\u2014",
        },
        { label: "Viewport", value: diag ? `${diag.viewportW}\u00d7${diag.viewportH}` : "\u2014" },
        {
          label: "Physical res",
          value:
            sc && diag
              ? `${Math.round(sc.width * diag.dpr)}\u00d7${Math.round(sc.height * diag.dpr)}`
              : "\u2014",
        },
        { label: "Device pixel ratio", value: diag ? `${diag.dpr}\u00d7` : "\u2014" },
        { label: "Color depth", value: diag ? `${diag.colorDepth}-bit` : "\u2014" },
        { label: "Orientation", value: diag?.orientation ?? "\u2014" },
        {
          label: "HDR display",
          value: diag ? (diag.prefersHDR ? "YES" : "no") : "\u2014",
          color: diag?.prefersHDR ? ok : undefined,
        },
        {
          label: "P3 wide gamut",
          value: diag ? (diag.supportsP3 ? "YES" : "no") : "\u2014",
          color: diag?.supportsP3 ? ok : undefined,
        },
      ],
    },
    {
      heading: "Input",
      rows: [
        { label: "Touch points", value: diag ? `${diag.maxTouchPoints}` : "\u2014" },
        { label: "Pointer type", value: diag?.pointerType ?? "\u2014" },
        { label: "Hover", value: diag?.hoverCapability ?? "\u2014" },
      ],
    },
    {
      heading: "Preferences",
      rows: [
        { label: "prefers-color-scheme", value: diag?.prefersColorScheme ?? "\u2014" },
        {
          label: "prefers-reduced-motion",
          value: diag ? (diag.prefersReducedMotion ? "reduce" : "no preference") : "\u2014",
          color: diag?.prefersReducedMotion ? warn : undefined,
        },
        { label: "prefers-contrast", value: diag?.prefersContrast ?? "\u2014" },
      ],
    },
    {
      heading: "Hardware & Capabilities",
      rows: [
        { label: "CPU cores", value: diag?.cpuCores ? `${diag.cpuCores}` : "\u2014" },
        { label: "Device memory", value: diag?.deviceMemory ?? "\u2014" },
        {
          label: "WebGL",
          value: diag ? (diag.webGL ? "supported" : "no") : "\u2014",
          color: diag?.webGL ? ok : warn,
        },
        {
          label: "WebGL 2",
          value: diag ? (diag.webGL2 ? "supported" : "no") : "\u2014",
          color: diag?.webGL2 ? ok : warn,
        },
        { label: "Cookies", value: diag ? (diag.cookieEnabled ? "enabled" : "disabled") : "\u2014" },
        { label: "Do Not Track", value: diag?.doNotTrack ?? "\u2014" },
        {
          label: "PWA standalone",
          value: diag ? (diag.standalone ? "YES" : "no") : "\u2014",
        },
        { label: "Connection", value: diag?.connection ?? "\u2014" },
        { label: "Downlink", value: diag?.connectionDownlink ?? "\u2014" },
      ],
    },
  ];

  const storeSnapshot = {
    theme: store.theme,
    deviceInfo: store.deviceInfo,
  };

  const sectionHeading: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
    fontStyle: "italic",
    letterSpacing: "-0.02em",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#100f0f",
        color: "rgba(255,255,255,0.85)",
        padding: "80px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              opacity: 0.4,
              marginBottom: 12,
            }}
          >
            Debug
          </p>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              fontStyle: "italic",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Settings
          </h1>
        </div>

        {/* Privacy notice */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            padding: 20,
            backgroundColor: "rgba(255,255,255,0.02)",
            marginBottom: 32,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              opacity: 0.5,
              marginBottom: 8,
            }}
          >
            Privacy notice
          </p>
          <p style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
            The information below is read directly from your browser and analyzed locally on this
            page. None of this data is stored, logged, or transmitted.
          </p>
        </div>

        {/* Device section */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionHeading}>Device</h2>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Left: guessed device */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                padding: 24,
                width: 260,
                flexShrink: 0,
                alignSelf: "stretch",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <p style={{ fontSize: 10, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Guessed device
              </p>
              <p style={{ fontSize: 9, opacity: 0.25, fontStyle: "italic", marginBottom: 20 }}>
                Estimates based on UA string & browser APIs.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                <div>
                  <p style={{ fontSize: 9, opacity: 0.3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Form factor</p>
                  <p style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>{formFactor}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, opacity: 0.3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Device</p>
                  <p style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", fontStyle: "italic", lineHeight: 1.2, margin: 0 }}>{deviceGuess}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, opacity: 0.3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>OS</p>
                  <p style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", fontStyle: "italic", lineHeight: 1, margin: 0 }}>{os}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, opacity: 0.3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Browser</p>
                  <p style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", fontStyle: "italic", lineHeight: 1, margin: 0 }}>{browser}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, opacity: 0.3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Engine</p>
                  <p style={{ fontSize: 12, fontFamily: "monospace", opacity: 0.6, lineHeight: 1.2, margin: 0 }}>{engine}</p>
                </div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 9, opacity: 0.3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>User agent</p>
                <p style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.4, wordBreak: "break-all", lineHeight: 1.5, margin: 0 }}>{ua || "\u2014"}</p>
              </div>
            </div>

            {/* Right: diagnostic rows */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {allRows.map(({ heading, rows }) => (
                <div key={heading} style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      opacity: 0.3,
                      padding: "8px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      backgroundColor: "rgba(255,255,255,0.015)",
                      margin: 0,
                    }}
                  >
                    {heading}
                  </p>
                  {rows.map((r) => (
                    <DiagRow key={r.label} {...r} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Store state section */}
        <section>
          <h2 style={sectionHeading}>Zustand Store State</h2>
          <pre
            style={{
              backgroundColor: "#000",
              color: "#69db7c",
              padding: 20,
              overflow: "auto",
              fontSize: 11,
              lineHeight: 1.6,
              border: "1px solid rgba(105,219,124,0.25)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
            }}
          >
            {JSON.stringify(storeSnapshot, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
