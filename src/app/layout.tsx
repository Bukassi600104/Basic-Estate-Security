import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Basic Security",
  description: "Estate security passes for residents, guests, and guards.",
  applicationName: "Basic Security",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://main.d18ktaplzyr50v.amplifyapp.com"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
