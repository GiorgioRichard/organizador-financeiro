import { Suspense } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { ehMes, formatarData, hojeISO, intervaloDoMes, mesDe, nomeDoMes, somarMesesAoMes } from "@/lib/datas";
import { listarCategorias, listarContas, type Lancamento } from "@/lib/financas";
import { formatCents, sumCents } from "@/lib/money";
import { Aviso, BotaoPDF, Carregando, Indicador, Titulo, Valor, botaoPrimario } from "../ui";
import { excluirLancamento } from "./actions";

type SearchParams = Promise<{ mes?: string; erro?: string; ok?: string }>;

export default function LancamentosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const ICONE = {
  receita: { Icone: ArrowDownLeft, cor: "bg-menta/70 text-floresta" },
  despesa: { Icone: ArrowUpRight, cor: "bg-despesa-suave text-despesa" },
  transferencia: { Icone: ArrowLeftRight, cor: "bg-tinta/[0.07] text-musgo" },
} as const;

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const params = await searchParams;
  const mes = params.mes && ehMes(params.mes) ? params.mes : mesDe(hojeISO());
  const { inicio, fim } = intervaloDoMes(mes);

  const [contas, categorias, resultado] = await Promise.all([
    listarContas(supabase),
    listarCategorias(supabase),
    supabase
      .from("transactions")
      .select(
        "id, tipo, valor_cents, data, descricao, account_id, category_id, transfer_to_account_id, parcela_grupo_id, parcela_n, parcela_total",
      )
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (resultado.error) throw resultado.error;
  const lancamentos = resultado.data as Lancamento[];

  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const receitas = sumCents(lancamentos.filter((l) => l.tipo === "receita").map((l) => l.valor_cents));
  const despesas = sumCents(lancamentos.filter((l) => l.tipo === "despesa").map((l) => l.valor_cents));
  const titulo = nomeDoMes(mes);

  return (
    <Entrada className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <Titulo titulo={titulo.charAt(0).toUpperCase() + titulo.slice(1)} subtitulo="Receitas, despesas e transferências" />
        <nav aria-label="Mês" className="flex gap-2">
          <Link
            href={`/lancamentos?mes=${somarMesesAoMes(mes, -1)}`}
            aria-label="Mês anterior"
            className="vidro grid size-10 place-items-center rounded-full"
          >
            <ChevronLeft aria-hidden size={18} />
          </Link>
          <Link
            href={`/lancamentos?mes=${somarMesesAoMes(mes, 1)}`}
            aria-label="Próximo mês"
            className="vidro grid size-10 place-items-center rounded-full"
          >
            <ChevronRight aria-hidden size={18} />
          </Link>
        </nav>
      </div>

      <Aviso erro={params.erro} ok={params.ok} />

      <BotaoPDF mes={mes} />

      <div className="grid grid-cols-3 gap-2">
        <Indicador titulo="Receitas">
          <Valor cents={receitas} />
        </Indicador>
        <Indicador titulo="Despesas">
          <Valor cents={-despesas} />
        </Indicador>
        <Indicador titulo="Resultado">
          <Valor cents={receitas - despesas} />
        </Indicador>
      </div>

      <section aria-label="Lançamentos do mês" className="vidro rounded-[var(--radius-cartao)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-musgo">
            {lancamentos.length} {lancamentos.length === 1 ? "lançamento" : "lançamentos"}
          </h2>
          <Link href="/lancamentos/novo" className="text-sm font-medium underline underline-offset-4">
            Novo
          </Link>
        </div>

        {lancamentos.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-6">
            <p className="text-sm text-musgo">Nenhum lançamento neste mês.</p>
            <Link href="/lancamentos/novo" className={botaoPrimario}>
              Lançar agora <ArrowUpRight aria-hidden size={16} />
            </Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-linha">
            {lancamentos.map((l) => {
              const { Icone, cor } = ICONE[l.tipo];
              return (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${cor}`}>
                    <Icone aria-hidden size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-floresta">
                      {l.descricao}
                      {l.parcela_total && (
                        <span className="font-normal text-musgo">
                          {" "}
                          {l.parcela_n}/{l.parcela_total}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-musgo">
                      {formatarData(l.data)} ·{" "}
                      {l.tipo === "transferencia"
                        ? `${nomeConta.get(l.account_id)} → ${nomeConta.get(l.transfer_to_account_id ?? "")}`
                        : `${nomeCategoria.get(l.category_id ?? "")} · ${nomeConta.get(l.account_id)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium">
                      {l.tipo === "transferencia" ? (
                        <span className="numero text-musgo">{formatCents(l.valor_cents)}</span>
                      ) : (
                        <Valor cents={l.tipo === "receita" ? l.valor_cents : -l.valor_cents} sinal />
                      )}
                    </span>
                    <form action={excluirLancamento} className="flex gap-3 text-xs text-musgo">
                      <input type="hidden" name="id" value={l.id} />
                      <Link
                        href={`/lancamentos/${l.id}`}
                        className="-m-2 inline-flex min-h-11 items-center gap-1 p-2 hover:text-tinta"
                        aria-label={`Editar ${l.descricao}`}
                      >
                        <Pencil aria-hidden size={12} /> Editar
                      </Link>
                      <button
                        type="submit"
                        className="-m-2 inline-flex min-h-11 items-center gap-1 p-2 hover:text-despesa"
                        aria-label={`Excluir ${l.descricao}`}
                      >
                        <Trash2 aria-hidden size={12} /> Excluir
                      </button>
                      {l.parcela_grupo_id && (
                        <button
                          type="submit"
                          name="grupo"
                          value="1"
                          className="-m-2 min-h-11 p-2 hover:text-despesa"
                          aria-label={`Excluir todas as parcelas de ${l.descricao}`}
                        >
                          · todas
                        </button>
                      )}
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Entrada>
  );
}
