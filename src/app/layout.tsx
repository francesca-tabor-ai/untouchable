import type { Metadata } from "next";
import { Fraunces, Rubik } from "next/font/google";

import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "UnTouchable — nobody is untouchable, nobody is alone",
    template: "%s · UnTouchable",
  },
  description:
    "Health stories people chose to share, the charities behind them, and a place to track how you are really doing over time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables go on <html>, not <body>. Our design tokens live in an @theme
    // block, which Tailwind emits on :root — so a --font-fraunces defined only on <body> is
    // undefined where --font-display is computed, the whole declaration becomes invalid, and
    // every heading and every word of body text silently falls back to system sans.
    <html lang="en-GB" className={`${fraunces.variable} ${rubik.variable}`}>
      <body className="antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
