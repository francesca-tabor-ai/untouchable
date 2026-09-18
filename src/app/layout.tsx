import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import "./globals.css";

// Do Health sets Season Mix over NB International Pro. Both are commercial
// licences; these are the closest free equivalents — Outfit for the light
// display face, Inter for the neutral grotesque underneath it.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
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
    <html lang="en-GB" className={`${outfit.variable} ${inter.variable}`}>
      <body className="antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
