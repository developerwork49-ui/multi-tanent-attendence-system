"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * App-wide animation settings. People who ask their device for reduced
 * motion get fades only (no sliding or scaling).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
