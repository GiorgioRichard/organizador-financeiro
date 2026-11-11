import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { ehMes, hojeISO, intervaloDoMes, mesDe, nomeDoMes, somarMesesAoMes } from "@/lib/datas";
import { listarCategorias } from "@/lib/financas";
import { formatCents, sumCents } from "@/lib/money";
import { Aviso, BotaoPDF, Carregando, ValorGrande } from "../ui";
import { definirLimite } from "./actions";

type SearchParams = Promise<{ mes?: string; erro?: string; ok?: string }>;

export default function OrcamentoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Centavos no formato do campo: 80000 -> "800,00". */
const paraCampo = (cents: number) => formatCents(cents).replace(/[^\d,]/g, "");

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const params = await searchParams;
  const mes = params.mes && ehMes(params.mes) ? params.mes : mesDe(hojeISO());
  const { inicio, fim } = intervaloDoMes(mes);

  const [categorias, lancs, limites] = await Promise.all([
    listarCategorias(supabase),
    supabase.from("transactions").select("tipo, valor_cents, category_id").in("tipo", ["receita", "despesa"]).gte("data", inicio).lte("data", fim),
    // Limites que já valiam até este mês; o mais recente de cada categoria vence
    supabase.from("budgets").select("category_id, mes, limite_cents").lte("mes", mes).order("mes"),
  ]);
  if (lancs.error) throw lancs.error;
  if (limites.error) throw limites.error;

  const limitePor = new Map<string, number>();
  for (const b of limites.data as { category_id: string; limite_cents: number }[]) limitePor.set(b.category_id, b.limite_cents);

  const somaPor = (tipo: string) => {
    const m = new Map<string, number>();
    for (const l of lancs.data as { tipo: string; valor_cents: number; category_id: string }[]) {
      if (l.tipo === tipo) m.set(l.category_id, (m.get(l.category_id) ?? 0) + l.valor_cents);
    }
    return m;
  };
  const gastoPor = somaPor("despesa");
  const recebidoPor = somaPor("receita");
  const totalGasto = sumCents([...gastoPor.values()]);
  const totalOrcado = sumCents([...limitePor.values()]);
  const totalRecebido = sumCents([...recebidoPor.values()]);

  const despesas = categorias
    .filter((c) => c.tipo === "despesa")
    .map((c) => ({ ...c, gasto: gastoPor.get(c.id) ?? 0, limite: limitePor.get(c.id) }))
    .sort((a, b) => b.gasto - a.gasto || a.nome.localeCompare(b.nome));
  const receitas = categorias
    .filter((c) => c.tipo === "receita" && recebidoPor.has(c.id))
    .map((c) => ({ ...c, valor: recebidoPor.get(c.id) ?? 0 }))
    .sort((a, b) => b.valor - a.valor);
  const estouradas = despesas.filter((d) => d.limite && d.gasto > d.limite).length;
  const titulo = nomeDoMes(mes);

  return (
    <Entrada className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-medium leading-tight deitado:text-2xl tracking-[-0.035em]">Orçamento</h1>
          <p className="mt-1 text-sm text-musgo first-letter:uppercase">{titulo}</p>
        </div>
        <nav aria-label="Mês" className="flex gap-2">
          <Link href={`/orcamento?mes=${somarMesesAoMes(mes, -1)}`} aria-label="Mês anterior" className="vidro grid size-11 place-items-center rounded-full">
            <ChevronLeft aria-hidden size={18} />
          </Link>
          <Link href={`/orcamento?mes=${somarMesesAoMes(mes, 1)}`} aria-label="Próximo mês" className="vidro grid size-11 place-items-center rounded-full">
            <ChevronRight aria-hidden size={18} />
          </Link>
        </nav>
      </div>

      <Aviso erro={params.erro} ok={params.ok} />

      <BotaoPDF mes={mes} />

      <section aria-labelledby="resumo" className="cartao-escuro rounded-[var(--radius-cartao)] p-5">
        <h2 id="resumo" className="relative text-sm opacity-80">Gasto no mês</h2>
        <div className="relative mt-1">
          <ValorGrande cents={totalGasto} />
        </div>
        <p className="relative mt-1 text-sm opacity-70">
          {totalOrcado > 0 ? `de ${formatCents(totalOrcado)} orçados` : "Defina limites abaixo para acompanhar"}
          {estouradas > 0 && ` · ${estouradas} acima do limite`}
        </p>
        {totalOrcado > 0 && (
          <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-cartao/15">
            <div className="h-full rounded-full bg-cartao" style={{ width: `${Math.min(100, (totalGasto / totalOrcado) * 100)}%` }} />
          </div>
        )}
      </section>

      <section aria-labelledby="despesas" className="vidro rounded-[var(--radius-cartao)] p-5">
        <div className="flex items-center justify-between">
          <h2 id="despesas" className="text-sm text-musgo">Despesas por categoria</h2>
          <Link href="/orcamento/categorias" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Categorias
          </Link>
        </div>
        <ul className="divide-y divide-linha">
          {despesas.map((d) => {
            const fracao = d.limite ? d.gasto / d.limite : 0;
            const cor = fracao > 1 ? "bg-despesa" : fracao >= 0.8 ? "bg-aviso" : "bg-floresta";
            const parte = totalGasto > 0 ? Math.round((d.gasto / totalGasto) * 100) : 0;
            return (
              <li key={d.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{d.nome}</span>
                  <span className="numero">
                    {formatCents(d.gasto)}
                    {d.limite ? <span className="text-musgo"> / {formatCents(d.limite)}</span> : null}
                  </span>
                </div>
                {d.limite ? (
                  <div
                    role="progressbar"
                    aria-label={`${d.nome}: ${Math.round(fracao * 100)}% do limite`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, Math.round(fracao * 100))}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-tinta/10"
                  >
                    <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.min(100, fracao * 100)}%` }} />
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-musgo">
                  <span>
                    {parte > 0 ? `${parte}% dos gastos` : "Sem gastos"}
                    {fracao > 1 && <span className="font-medium text-despesa"> · passou {formatCents(d.gasto - (d.limite ?? 0))}</span>}
                  </span>
                  <form action={definirLimite} className="flex items-center gap-1">
                    <input type="hidden" name="category_id" value={d.id} />
                    <input type="hidden" name="mes" value={mes} />
                    <label className="sr-only" htmlFor={`limite-${d.id}`}>
                      Limite mensal de {d.nome}
                    </label>
                    <input
                      id={`limite-${d.id}`}
                      name="limite"
                      inputMode="decimal"
                      placeholder="Limite"
                      defaultValue={d.limite ? paraCampo(d.limite) : ""}
                      className="h-11 w-28 rounded-full border border-superficie bg-superficie/80 px-3 text-base text-tinta focus:outline-none focus:ring-2 focus:ring-floresta/40"
                    />
                    <BotaoEnviar pendente="…" className="h-11 rounded-full px-3 text-sm font-medium text-floresta underline underline-offset-4">
                      Salvar
                    </BotaoEnviar>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-musgo">O limite vale deste mês em diante. Deixe vazio e salve para remover.</p>
      </section>

      {receitas.length > 0 && (
        <section aria-labelledby="receitas" className="vidro rounded-[var(--radius-cartao)] p-5">
          <h2 id="receitas" className="text-sm text-musgo">Receitas por categoria</h2>
          <ul className="mt-2 divide-y divide-linha">
            {receitas.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-3 text-sm">
                <span className="font-medium">{r.nome}</span>
                <span className="numero text-receita">
                  {formatCents(r.valor)}
                  <span className="text-musgo"> · {Math.round((r.valor / totalRecebido) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Entrada>
  );
}
