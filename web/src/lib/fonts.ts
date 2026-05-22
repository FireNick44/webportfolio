import localFont from "next/font/local";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

// Noel's signature display face, carried over from the original portfolio.
export const berlin = localFont({
  src: [
    { path: "../fonts/BerlinTypeWeb-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/BerlinTypeWeb-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-berlin",
  display: "swap",
});

// Refined humanist grotesque for body copy — distinct from generic system stacks.
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

// Monospace for "lab readout" captions, numbers and labels.
export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = `${berlin.variable} ${hanken.variable} ${jetbrains.variable}`;
