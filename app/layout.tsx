import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import KaTeXStyles from "@/components/common/KaTeXStyles";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Math Tutor AI",
  description: "AI-powered math tutoring assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <KaTeXStyles />
        {children}
      </body>
    </html>
  );
}
