import type { MetadataRoute } from "next";

/** Manifesto do PWA: nome, ícones e cores para instalar na tela inicial. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Organizador financeiro",
    short_name: "Organizador",
    description: "Contas, cartões, lançamentos, agenda e orçamento pessoal",
    lang: "pt-BR",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // Sem trava de orientação: o app segue o aparelho (em pé ou deitado).
    orientation: "any",
    background_color: "#eef1ee",
    theme_color: "#0f3b33",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icones/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novo lançamento", url: "/lancamentos/novo", icons: [{ src: "/icones/icon-192.png", sizes: "192x192" }] },
      { name: "Agenda", url: "/agenda", icons: [{ src: "/icones/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
