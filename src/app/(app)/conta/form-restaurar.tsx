"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { ESTADO_INICIAL } from "@/lib/formulario";
import { Aviso } from "../ui";
import { restaurar } from "./actions";

export function FormRestaurar() {
  const [estado, enviar] = useActionState(restaurar, ESTADO_INICIAL);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Aviso erro={estado.erro} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Arquivo de backup (.json)
        <input
          name="arquivo"
          type="file"
          accept="application/json,.json"
          required
          className="rounded-2xl border border-superficie bg-superficie/80 px-3 py-3 text-base font-normal file:mr-3 file:rounded-full file:border-0 file:bg-floresta file:px-4 file:py-2 file:text-sm file:font-medium file:text-sobre-floresta"
        />
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input name="confirmo" type="checkbox" value="sim" required className="mt-0.5 size-5 accent-[var(--floresta)]" />
        <span>Entendo que contas, lançamentos, recorrentes e limites atuais serão substituídos pelos do arquivo.</span>
      </label>
      <BotaoEnviar
        pendente="Restaurando…"
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-despesa/40 px-5 text-sm font-medium text-despesa hover:bg-despesa-suave"
      >
        <Upload aria-hidden size={16} /> Restaurar backup
      </BotaoEnviar>
    </form>
  );
}
