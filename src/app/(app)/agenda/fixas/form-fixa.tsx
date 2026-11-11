"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { botaoPrimario, campo, rotulo } from "../../ui";

type Opcao = { id: string; nome: string };

/** Sugestões comuns: preenchem o nome e a categoria (menos digitação). */
const SUGESTOES: { nome: string; categoria: string }[] = [
  { nome: "IPTU", categoria: "Moradia" },
  { nome: "IPVA", categoria: "Transporte" },
  { nome: "Licenciamento", categoria: "Transporte" },
  { nome: "Seguro do carro", categoria: "Transporte" },
  { nome: "Matrícula escolar", categoria: "Educação" },
  { nome: "Anuidade do cartão", categoria: "Contas e serviços" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FormFixa({
  action,
  contas,
  categorias,
  mesAtual,
}: {
  action: (formData: FormData) => Promise<void>;
  contas: Opcao[];
  categorias: Opcao[];
  mesAtual: number;
}) {
  const nomeRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState(categorias[0]?.id ?? "");

  function sugerir(s: (typeof SUGESTOES)[number]) {
    if (nomeRef.current) nomeRef.current.value = s.nome;
    const c = categorias.find((c) => c.nome === s.categoria);
    if (c) setCategoria(c.id);
    nomeRef.current?.focus();
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <p id="sugestoes" className="mb-2 text-sm text-musgo">Sugestões</p>
        <ul aria-labelledby="sugestoes" className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <li key={s.nome}>
              <button
                type="button"
                onClick={() => sugerir(s)}
                className="vidro min-h-11 rounded-full px-4 text-sm hover:bg-superficie"
              >
                {s.nome}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="cartao-branco grid gap-4 rounded-[var(--radius-cartao)] p-5 sm:grid-cols-2">
        <label className={`${rotulo} sm:col-span-2`}>
          Nome
          <input ref={nomeRef} name="nome" required maxLength={60} placeholder="Ex.: IPTU" className={campo} />
        </label>

        <label className={rotulo}>
          <span>
            Valor no ano <span className="font-normal text-musgo">(total)</span>
          </span>
          <input name="valor" required inputMode="decimal" placeholder="1.200,00" className={campo} />
        </label>

        <label className={rotulo}>
          Parcelas
          <select name="parcelas" defaultValue="1" className={campo}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i === 0 ? "À vista" : `${i + 1}x mensais`}
              </option>
            ))}
          </select>
        </label>

        <label className={rotulo}>
          <span>
            Mês do vencimento <span className="font-normal text-musgo">(1ª parcela)</span>
          </span>
          <select name="mes" defaultValue={mesAtual} className={campo}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className={rotulo}>
          Dia do vencimento
          <input name="dia" type="number" min={1} max={31} required defaultValue={10} className={campo} />
        </label>

        <label className={rotulo}>
          Pagar com
          <select name="account_id" required className={campo}>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className={rotulo}>
          Categoria
          <select name="category_id" required value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <BotaoEnviar className={`${botaoPrimario} self-start`}>
        <Plus aria-hidden size={16} /> Cadastrar despesa fixa
      </BotaoEnviar>
    </form>
  );
}
