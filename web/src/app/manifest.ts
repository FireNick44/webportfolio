import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yannic Studer",
    short_name: "Yannic Studer",
    description: "Software developer & digital tinkerer.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0b0c",
    theme_color: "#0a0b0c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
