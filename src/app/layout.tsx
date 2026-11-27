import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import "./globals.css";

/* Outfit: geometric display/body face (variable 100–900). */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Attendance", template: "%s · Attendance" },
  description: "Student attendance management for schools",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Without JavaScript, show pages immediately (no entrance animation). */}
        <noscript>
          <style>{"[data-page]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
