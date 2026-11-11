"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { botaoPrimario, campo, rotulo } from "../ui";

type Props = {
  action: (formData: FormData) => Promise<void>;
  /** Preenchido ao editar. */
  conta?: {
    id: string;
    nome: string;
    tipo: string;
    saldo: string;
    dia_fechamento: number | null;
    dia_vencimento: number | null;
    limite: string;
  };
};

const TIPOS = [
  { valor: "corrente", rotulo: "Corrente" },
  { valor: "poupanca", rotulo: "Poupança" },
  { valor: "carteira", rotulo: "Carteira" },
  { valor: "cartao", rotulo: "Cartão" },
];

export function FormConta({ action, conta }: Props) {
  const [tipo, setTipo] = useState(conta?.tipo ?? "corrente");
  const cartao = tipo === "cartao";

  return (
    <form action={action} className="flex flex-col gap-4">
      {conta && <input type="hidden" name="id" value={conta.id} />}

      <fieldset disabled={!!conta}>
        <legend className="sr-only">Tipo</legend>
        {conta && <input type="hidden" name="tipo" value={tipo} />}
        <div className="vidro flex rounded-full p-1">
          {TIPOS.map((t) => (
            <label
              key={t.valor}
              className="flex-1 cursor-pointer rounded-full px-2 py-2 text-center text-sm text-musgo transition has-[:checked]:bg-superficie has-[:checked]:font-medium has-[:checked]:text-tinta has-[:checked]:sombra-suave has-[:disabled]:cursor-default has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-floresta/40"
            >
              <input
                type="radio"
                name={conta ? undefined : "tipo"}
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => setTipo(t.valor)}
                className="sr-only"
              />
              {t.rotulo}
            </label>
          ))}
        </div>
        {conta && <p className="mt-2 px-2 text-xs text-musgo">O tipo não muda depois de criado.</p>}
      </fieldset>

      <div className="cartao-branco grid gap-4 rounded-[var(--radius-cartao)] p-5 sm:grid-cols-2">
        <label className={`${rotulo} sm:col-span-2`}>
          Nome
          <input
            name="nome"
            required
            maxLength={60}
            defaultValue={conta?.nome}
            placeholder={cartao ? "Ex.: Cartão do banco" : "Ex.: Banco, Carteira"}
            className={campo}
          />
        </label>

        {cartao ? (
          <>
            <label className={rotulo}>
              Dia de fechamento
              <input name="dia_fechamento" type="number" min={1} max={31} required defaultValue={conta?.dia_fechamento ?? ""} className={campo} />
            </label>
            <label className={rotulo}>
              Dia de vencimento
              <input name="dia_vencimento" type="number" min={1} max={31} required defaultValue={conta?.dia_vencimento ?? ""} className={campo} />
            </label>
            <label className={`${rotulo} sm:col-span-2`}>
              <span>
                Limite <span className="font-normal text-musgo">(opcional)</span>
              </span>
              <input name="limite" inputMode="decimal" placeholder="5.000,00" defaultValue={conta?.limite} className={campo} />
            </label>
          </>
        ) : (
          <label className={`${rotulo} sm:col-span-2`}>
            Saldo inicial
            <input name="saldo" inputMode="decimal" placeholder="0,00" defaultValue={conta?.saldo} className={campo} />
            <span className="text-xs font-normal text-musgo">Use “-” para saldo negativo.</span>
          </label>
        )}
      </div>

      <BotaoEnviar className={`${botaoPrimario} self-start`}>
        {conta ? "Salvar alterações" : "Adicionar conta"} <ArrowUpRight aria-hidden size={16} />
      </BotaoEnviar>
    </form>
  );
}
