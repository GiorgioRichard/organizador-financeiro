"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Faz os filhos diretos surgirem em cascata (sobem 18px e aparecem).
 * Com "reduzir movimento" ativo, aparecem direto. O CSS esconde os
 * filhos só quando a classe `anima` está no <html> (posta pelo script
 * inicial), e tem um tempo-limite para mostrá-los se o JS falhar.
 */
export function Entrada({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const itens = ref.current?.children;
      if (!itens?.length) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(itens, { autoAlpha: 1 });
        return;
      }
      gsap.fromTo(
        itens,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.07, clearProps: "transform" },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-entrada className={className}>
      {children}
    </div>
  );
}
