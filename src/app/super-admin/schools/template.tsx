import type { ReactNode } from "react";
import { PageTransition } from "@/components/motion/motion-ui";

/** Fade + slide-up whenever a page below this folder is shown. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
