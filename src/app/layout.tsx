import "globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SiteNav, SiteFooter } from "components/SiteShell";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.airesume.blog"),
  title: { default: "airesume editor", template: "%s · airesume editor" },
  description:
    "Edit your resume in the browser, choose a layout and download a clean PDF. Part of airesume.blog.",
  // app.airesume.blog is a tool, not a search landing page: search traffic
  // goes to airesume.blog, so every page here is kept out of search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable} ${serif.variable}`}>
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
