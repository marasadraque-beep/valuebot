import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValueBot AI — Investir com fundamento",
  description: "Análise fundamentalista de ações, margem de segurança e apoio à decisão.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}