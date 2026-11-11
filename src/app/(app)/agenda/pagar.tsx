import { Check } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { pagarParcela } from "./actions";

/** Botão "Pagar" (ou "Receber") de uma ocorrência fixa ou recorrente. */
export function BotaoPagar({
  fixaId,
  vencimento,
  volta,
  nome,
  receita = false,
}: {
  fixaId: string;
  vencimento: string;
  volta: string;
  nome: string;
  receita?: boolean;
}) {
  return (
    <form action={pagarParcela}>
      <input type="hidden" name="fixa_id" value={fixaId} />
      <input type="hidden" name="vencimento" value={vencimento} />
      <input type="hidden" name="volta" value={volta} />
      <BotaoEnviar
        pendente="…"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-floresta px-4 text-sm font-medium text-sobre-floresta hover:bg-floresta-2"
      >
        <Check aria-hidden size={14} />
        <span>
          {receita ? "Receber" : "Pagar"}<span className="sr-only"> {nome}</span>
        </span>
      </BotaoEnviar>
    </form>
  );
}
