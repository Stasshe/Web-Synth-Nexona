import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Synth",
  description: "Browser-based wavetable synthesizer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#1a1a2e",
          color: "#e0e0e0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
