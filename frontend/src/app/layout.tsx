import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TRENT | Geo-Route Intelligence OS",
  description: "Understanding Movement At Planetary Scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-background text-foreground overflow-hidden`}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
