import type { Metadata, Viewport } from "next";
// Fonts are self-hosted (no requests to Google from players' browsers).
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://swerve.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Swerve",
  description: "20 trolley dilemmas, one swipe each. Find your moral archetype and see how your friends compare.",
  openGraph: { title: "Swerve", description: "Would you pull the lever? 20 dilemmas, one swipe each.", images: ["/api/og"], type: "website" },
  twitter: { card: "summary_large_image" }
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#E9ECE7" }, { media: "(prefers-color-scheme: dark)", color: "#121614" }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
