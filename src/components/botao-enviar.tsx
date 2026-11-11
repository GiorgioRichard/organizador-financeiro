"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/**
 * Botão de envio com resposta imediata (limite de Doherty): enquanto o
 * formulário envia, fica desabilitado e mostra "Salvando…", evitando
 * clique duplo.
 */
export function BotaoEnviar({
  children,
  className,
  pendente = "Salvando…",
}: {
  children: ReactNode;
  className: string;
  pendente?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:opacity-70`}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden size={16} className="animate-spin" /> {pendente}
        </>
      ) : (
        children
      )}
    </button>
  );
}
