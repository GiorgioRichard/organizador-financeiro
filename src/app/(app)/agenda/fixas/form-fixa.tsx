"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { ESTADO_INICIAL, type AcaoForm } from "@/lib/formulario";
import { Aviso, botaoPrimario, campo, rotulo } from "../../ui";

type Opcao = { id: string; nome: string };
type Categoria = Opcao & { tipo: "receita" | "despesa" };
type Frequencia = "mensal" | "anual";
type Tipo = "despesa" | "receita";

/** Sugestões comuns: preenchem nome, frequência, tipo e categoria. */
const SUGESTOES: { nome: string; frequencia: Frequencia; tipo: Tipo; categoria: string }[] = [
  { nome: "Aluguel", frequencia: "mensal", tipo: "despesa", categoria: "Moradia" },
  { nome: "Condomínio", frequencia: "mensal", tipo: "despesa", categoria: "Moradia" },
  { nome: "Internet", frequencia: "mensal", tipo: "despesa", categoria: "Contas e serviços" },
  { nome: "Salário", frequencia: "mensal", tipo: "receita", categoria: "Salário" },
  { nome: "IPTU", frequencia: "anual", tipo: "despesa", categoria: "Moradia" },
  { nome: "IPVA", frequencia: "anual", tipo: "despesa", categoria: "Transporte" },
  { nome: "Licenciamento", frequencia: "anual", tipo: "despesa", categoria: "Transporte" },
  { nome: "Seguro do carro", frequencia: "anual", tipo: "despesa", categoria: "Transporte" },
  { nome: "Matrícula escolar", frequencia: "anual", tipo: "despesa", categoria: "Educação" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const pilula =
  "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-sm text-musgo transition has-[:checked]:bg-superficie has-[:checked]:font-medium has-[:checked]:text-tinta has-[:checked]:sombra-suave has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-floresta/40";

export function FormFixa({
  action,
  contas,
  categorias,
  mesAtual,
}: {
  action: AcaoForm;
  contas: Opcao[];
  categorias: Categoria[];
  /** "AAAA-MM" */
  mesAtual: string;
}) {
  const [estado, enviar] = useActionState(action, ESTADO_INICIAL);
  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Aviso erro={estado.erro} />
      <Campos key={estado.versao} valores={estado.valores ?? {}} contas={contas} categorias={categorias} mesAtual={mesAtual} />
    </form>
  );
}

function Campos({
  valores,
  contas,
  categorias,
  mesAtual,
}: {
  valores: Record<string, string>;
  contas: Opcao[];
  categorias: Categoria[];
  mesAtual: string;
}) {
  const nomeRef = useRef<HTMLInputElement>(null);
  const [frequencia, setFrequencia] = useState<Frequencia>((valores.frequencia as Frequencia) || "mensal");
  const [tipo, setTipo] = useState<Tipo>((valores.tipo as Tipo) || "despesa");
  const doTipo = categorias.filter((c) => c.tipo === tipo);
  const [categoria, setCategoria] = useState(valores.category_id || doTipo[0]?.id || "");
  const anual = frequencia === "anual";

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    setCategoria(categorias.find((c) => c.tipo === novo)?.id ?? "");
  }

  function sugerir(s: (typeof SUGESTOES)[number]) {
    if (nomeRef.current) nomeRef.current.value = s.nome;
    setFrequencia(s.frequencia);
    setTipo(s.tipo);
    const c = categorias.find((c) => c.nome === s.categoria && c.tipo === s.tipo);
    setCategoria(c?.id ?? categorias.find((c) => c.tipo === s.tipo)?.id ?? "");
    nomeRef.current?.focus();
  }

  return (
    <>
      <div>
        <p id="sugestoes" className="mb-2 text-sm text-musgo">Sugestões</p>
        <ul aria-labelledby="sugestoes" className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <li key={s.nome}>
              <button type="button" onClick={() => sugerir(s)} className="vidro min-h-11 rounded-full px-4 text-sm hover:bg-superficie">
                {s.nome}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <fieldset>
          <legend className="sr-only">Frequência</legend>
          <div className="vidro flex rounded-full p-1">
            {(["mensal", "anual"] as const).map((f) => (
              <label key={f} className={pilula}>
                <input type="radio" name="frequencia" value={f} checked={frequencia === f} onChange={() => setFrequencia(f)} className="sr-only" />
                {f === "mensal" ? "Todo mês" : "Todo ano"}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="sr-only">Tipo</legend>
          <div className="vidro flex rounded-full p-1">
            {(["despesa", "receita"] as const).map((t) => (
              <label key={t} className={pilula}>
                <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => trocarTipo(t)} className="sr-only" />
                {t === "despesa" ? "Despesa" : "Receita"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="cartao-branco grid gap-4 rounded-[var(--radius-cartao)] p-5 sm:grid-cols-2">
        <label className={`${rotulo} sm:col-span-2`}>
          Nome
          <input
            ref={nomeRef}
            name="nome"
            required
            maxLength={60}
            defaultValue={valores.nome}
            placeholder={anual ? "Ex.: IPTU" : "Ex.: Aluguel"}
            className={campo}
          />
        </label>

        <label className={rotulo}>
          <span>
            Valor <span className="font-normal text-musgo">{anual ? "(total no ano)" : "(por mês)"}</span>
          </span>
          <input name="valor" required inputMode="decimal" placeholder={anual ? "1.200,00" : "1.500,00"} defaultValue={valores.valor} className={campo} />
        </label>

        <label className={rotulo}>
          {anual ? "Dia do vencimento" : "Dia do mês"}
          <input name="dia" type="number" min={1} max={31} required defaultValue={valores.dia || 10} className={campo} />
        </label>

        {anual ? (
          <>
            <label className={rotulo}>
              <span>
                Mês <span className="font-normal text-musgo">(1ª parcela)</span>
              </span>
              <select name="mes" defaultValue={valores.mes || Number(mesAtual.slice(5))} className={campo}>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className={rotulo}>
              Parcelas
              <select name="parcelas" defaultValue={valores.parcelas || "1"} className={campo}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i === 0 ? "À vista" : `${i + 1}x mensais`}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className={`${rotulo} sm:col-span-2`}>
            A partir de
            <input
              name="desde"
              type="month"
              required
              pattern="\d{4}-\d{2}"
              placeholder="AAAA-MM"
              defaultValue={valores.desde || mesAtual}
              className={campo}
            />
          </label>
        )}

        <label className={rotulo}>
          {tipo === "receita" ? "Recebe em" : "Pagar com"}
          <select name="account_id" required defaultValue={valores.account_id} className={campo}>
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
            {doTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <BotaoEnviar className={`${botaoPrimario} self-start`}>
        <Plus aria-hidden size={16} /> Cadastrar
      </BotaoEnviar>
    </>
  );
}
