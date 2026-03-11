import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Wavetable Synth",
  description: "Browser-based wavetable synthesizer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
