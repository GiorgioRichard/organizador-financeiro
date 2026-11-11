import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter_Tight } from "next/font/google";
import Script from "next/script";
import { Movimento } from "@/components/movimento";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Organizador financeiro",
  description: "Controle seus gastos e despesas pessoais",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1412" },
  ],
};

/**
 * Aplica o tema salvo (claro/escuro) antes da primeira pintura, para a
 * tela não piscar no tema errado. Sem escolha salva, segue o sistema.
 */
const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");if(t==="claro"||t==="escuro")document.documentElement.dataset.tema=t}catch(e){}
if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("anima");`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script acima muda data-tema antes do React
    <html lang="pt-BR" className={`${interTight.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Script id="tema" strategy="beforeInteractive">
          {SCRIPT_TEMA}
        </Script>
        <Movimento />
        {children}
      </body>
    </html>
  );
}
