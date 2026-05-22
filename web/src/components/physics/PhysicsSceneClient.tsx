"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// The physics scene touches window/document/RAF and must never render on the
// server — load it client-only.
const PhysicsScene = dynamic(() => import("./PhysicsScene"), {
  ssr: false,
  loading: () => null,
});

export default function PhysicsSceneClient({
  backdrop,
  hint,
}: {
  backdrop?: ReactNode;
  hint?: string;
}) {
  return <PhysicsScene backdrop={backdrop} hint={hint} />;
}
