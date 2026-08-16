import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Diet Pizza — Guilt-Free, Fresh & Delivered",
  description:
    "Premium diet-friendly pizza made with fresh, organic ingredients. Keto, gluten-free, and low-calorie options available.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans bg-organic-bg text-zinc-100 antialiased min-h-screen`}
      >
        <Nav />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
