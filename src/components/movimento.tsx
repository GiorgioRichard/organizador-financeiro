"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Rolagem suave com Lenis, movida pelo relógio do GSAP. No toque
 * (celular) o Lenis mantém a rolagem nativa, que já é suave e não briga
 * com o gesto. Desligada quando o sistema pede "reduzir movimento".
 * Ao trocar de tela, volta ao topo sem animação.
 */
export function Movimento() {
  const lenis = useRef<Lenis | null>(null);
  const caminho = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instancia = new Lenis({ autoRaf: false, lerp: 0.11 });
    lenis.current = instancia;
    const quadro = (tempo: number) => instancia.raf(tempo * 1000);
    gsap.ticker.add(quadro);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(quadro);
      instancia.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
  }, [caminho]);

  return null;
}
