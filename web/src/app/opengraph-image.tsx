import { ImageResponse } from "next/og";
import { Y_PATH, S_PATH } from "@/components/layout/Monogram";

// Static OG image for social cards. Lab-bench black bg + the YS monogram in
// bone, accent teal dot — matches the loader/header treatment. Next runs this
// at build time and serves the result at /opengraph-image.<ext>.

export const alt = "Yannic Studer — Software Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0b0c",
          color: "#ece6da",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <svg
          width={340}
          height={260}
          viewBox="0 0 107 80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={Y_PATH} transform="translate(5 10)" fill="#ece6da" />
          <path d={S_PATH} transform="translate(55 9)" fill="#ece6da" />
          <circle cx="101" cy="71" r="3" fill="#7fe3d0" />
        </svg>
        <div
          style={{
            marginTop: 56,
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          Yannic Studer
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 22,
            opacity: 0.6,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Software developer · digital tinkerer
        </div>
      </div>
    ),
    { ...size },
  );
}
