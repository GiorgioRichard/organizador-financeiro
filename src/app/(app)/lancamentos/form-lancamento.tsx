"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { botaoPrimario, campo, rotulo } from "../ui";

type Opcao = { id: string; nome: string };
type Props = {
  action: (formData: FormData) => Promise<void>;
  contas: Opcao[];
  categorias: (Opcao & { tipo: "receita" | "despesa" })[];
  hoje: string;
};

const TIPOS = [
  { valor: "despesa", rotulo: "Despesa" },
  { valor: "receita", rotulo: "Receita" },
  { valor: "transferencia", rotulo: "Transferência" },
] as const;

type Tipo = (typeof TIPOS)[number]["valor"];

export function FormLancamento({ action, contas, categorias, hoje }: Props) {
  const [tipo, setTipo] = useState<Tipo>("despesa");
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const transferencia = tipo === "transferencia";
  const destinoPadrao = contas.find((c) => c.id !== contaId)?.id ?? "";
  const doTipo = categorias.filter((c) => c.tipo === tipo);

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset>
        <legend className="sr-only">Tipo</legend>
        <div className="vidro flex rounded-full p-1">
          {TIPOS.map((t) => (
            <label
              key={t.valor}
              className="flex-1 cursor-pointer rounded-full px-3 py-2 text-center text-sm text-musgo transition has-[:checked]:bg-superficie has-[:checked]:font-medium has-[:checked]:text-tinta has-[:checked]:sombra-suave has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-floresta/40"
            >
              <input
                type="radio"
                name="tipo"
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => setTipo(t.valor)}
                className="sr-only"
              />
              {t.rotulo}
            </label>
          ))}
        </div>
        {transferencia && (
          <p className="mt-2 px-2 text-xs text-musgo">
            Transferência não conta como despesa: só move saldo entre suas contas. Para pagar a fatura,
            transfira da conta corrente para o cartão.
          </p>
        )}
      </fieldset>

      <div className="cartao-branco grid gap-4 rounded-[var(--radius-cartao)] p-5 sm:grid-cols-2">
        <label className={`${rotulo} sm:col-span-2`}>
          <span>
            Valor {tipo === "despesa" && <span className="font-normal text-musgo">(total)</span>}
          </span>
          <span className="flex items-baseline gap-2 border-b border-linha pb-2">
            <span className="text-lg text-musgo">R$</span>
            <input
              name="valor"
              required
              inputMode="decimal"
              placeholder="0,00"
              className="numero w-full bg-transparent text-4xl font-medium tracking-tight placeholder:text-tinta/20 focus:outline-none"
            />
          </span>
        </label>

        <label className={`${rotulo} sm:col-span-2`}>
          Descrição
          <input name="descricao" required maxLength={120} placeholder="Ex.: mercado, salário…" className={campo} />
        </label>

        <label className={rotulo}>
          Data
          <input name="data" type="date" required defaultValue={hoje} className={campo} />
        </label>

        <label className={rotulo}>
          {transferencia ? "De" : "Conta"}
          <select name="account_id" required value={contaId} onChange={(e) => setContaId(e.target.value)} className={campo}>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        {transferencia ? (
          <label className={rotulo}>
            Para
            <select name="transfer_to_account_id" required key={contaId} defaultValue={destinoPadrao} className={campo}>
              {contas
                .filter((c) => c.id !== contaId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <label className={rotulo}>
            Categoria
            <select name="category_id" required key={tipo} className={campo}>
              {doTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        {tipo === "despesa" && (
          <label className={rotulo}>
            Parcelas
            <input name="parcelas" type="number" min={1} max={120} defaultValue={1} className={campo} />
            <span className="text-xs font-normal text-musgo">Cada parcela cai no mesmo dia dos meses seguintes.</span>
          </label>
        )}
      </div>

      <BotaoEnviar className={`${botaoPrimario} self-start`}>
        Salvar lançamento <ArrowUpRight aria-hidden size={16} />
      </BotaoEnviar>
    </form>
  );
}
