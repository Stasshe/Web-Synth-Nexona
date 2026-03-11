import type { Metadata } from "next";
import "./globals.css";
import { useGlobalScrollLock } from "../hooks/scrollLock";

export const metadata: Metadata = {
  title: "Web Wavetable Synth",
  description: "Browser-based wavetable synthesizer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // apply global scroll locking for modals, panels, etc.
  useGlobalScrollLock();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
