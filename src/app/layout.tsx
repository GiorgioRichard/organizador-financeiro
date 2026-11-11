import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Inter_Tight } from "next/font/google";
import Script from "next/script";
import { Movimento } from "@/components/movimento";
import { RegistrarSW } from "@/components/registrar-sw";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Organizador financeiro",
  description: "Controle seus gastos e despesas pessoais",
  applicationName: "Organizador",
  icons: {
    icon: [
      { url: "/icones/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icones/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icones/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icones/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Organizador", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // cover: ocupa a tela toda; as margens seguras ficam por conta do CSS (env(safe-area-inset-*))
  viewportFit: "cover",
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
        <Suspense fallback={null}>
          <Movimento />
        </Suspense>
        <RegistrarSW />
        {children}
      </body>
    </html>
  );
}
