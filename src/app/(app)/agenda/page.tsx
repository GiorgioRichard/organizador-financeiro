import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { ehDataISO, ehMes, formatarData, hojeISO, intervaloDoMes, mesDe, nomeDoMes, somarMesesAoMes } from "@/lib/datas";
import { chaveOcorrencia, ocorrenciasNoIntervalo, type Ocorrencia } from "@/lib/fixas";
import { listarCategorias, listarContas, listarFixas, parcelasPagas, type Lancamento } from "@/lib/financas";
import { formatCents, sumCents } from "@/lib/money";
import { Aviso, Carregando, Indicador, Valor, botaoPrimario } from "../ui";
import { BotaoPagar } from "./pagar";

type SearchParams = Promise<{ mes?: string; dia?: string; erro?: string; ok?: string }>;

export default function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const SEMANA = [
  { curto: "D", longo: "domingo" },
  { curto: "S", longo: "segunda" },
  { curto: "T", longo: "terça" },
  { curto: "Q", longo: "quarta" },
  { curto: "Q", longo: "quinta" },
  { curto: "S", longo: "sexta" },
  { curto: "S", longo: "sábado" },
];

type Dia = { iso: string; receitas: number; despesas: number; vencimentos: number };

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const params = await searchParams;
  const hoje = hojeISO();
  const mes = params.mes && ehMes(params.mes) ? params.mes : mesDe(hoje);
  const { inicio, fim } = intervaloDoMes(mes);
  const diaSelecionado =
    params.dia && ehDataISO(params.dia) && mesDe(params.dia) === mes ? params.dia : mesDe(hoje) === mes ? hoje : null;

  const [contas, categorias, fixas, pagas, resultado] = await Promise.all([
    listarContas(supabase),
    listarCategorias(supabase),
    listarFixas(supabase),
    parcelasPagas(supabase, inicio, fim),
    supabase
      .from("transactions")
      .select("id, tipo, valor_cents, data, descricao, account_id, category_id, transfer_to_account_id, parcela_grupo_id, parcela_n, parcela_total")
      .gte("data", inicio)
      .lte("data", fim)
      .order("created_at"),
  ]);
  if (resultado.error) throw resultado.error;
  const lancamentos = resultado.data as Lancamento[];
  const vencimentos = ocorrenciasNoIntervalo(fixas, inicio, fim);
  const pendentes = vencimentos.filter((o) => !pagas.has(chaveOcorrencia(o.fixa_id, o.vencimento)));

  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  // Resumo por dia para a grade
  const porDia = new Map<string, Dia>();
  const dia = (iso: string) => {
    let d = porDia.get(iso);
    if (!d) porDia.set(iso, (d = { iso, receitas: 0, despesas: 0, vencimentos: 0 }));
    return d;
  };
  for (const l of lancamentos) {
    if (l.tipo === "receita") dia(l.data).receitas++;
    if (l.tipo === "despesa") dia(l.data).despesas++;
  }
  for (const o of pendentes) dia(o.vencimento).vencimentos++;

  const [ano, numMes] = mes.split("-").map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, numMes - 1, 1)).getUTCDay();
  const totalDias = Number(fim.slice(8));
  const celulas: (string | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];

  const titulo = nomeDoMes(mes);
  const lancDoDia = diaSelecionado ? lancamentos.filter((l) => l.data === diaSelecionado) : [];
  const vencDoDia = diaSelecionado ? vencimentos.filter((o) => o.vencimento === diaSelecionado) : [];
  const voltaAqui = `/agenda?mes=${mes}${diaSelecionado ? `&dia=${diaSelecionado}` : ""}`;

  return (
    <Entrada className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-medium leading-tight deitado:text-2xl tracking-[-0.035em] first-letter:uppercase">{titulo}</h1>
          <p className="mt-1 text-sm text-musgo">Toque num dia para ver e lançar</p>
        </div>
        <nav aria-label="Mês" className="flex gap-2">
          <Link href={`/agenda?mes=${somarMesesAoMes(mes, -1)}`} aria-label="Mês anterior" className="vidro grid size-11 place-items-center rounded-full">
            <ChevronLeft aria-hidden size={18} />
          </Link>
          <Link href={`/agenda?mes=${somarMesesAoMes(mes, 1)}`} aria-label="Próximo mês" className="vidro grid size-11 place-items-center rounded-full">
            <ChevronRight aria-hidden size={18} />
          </Link>
        </nav>
      </div>

      <Aviso erro={params.erro} ok={params.ok} />

      <div className="grid grid-cols-3 gap-2">
        <Indicador titulo="Receitas">
          <Valor cents={sumCents(lancamentos.filter((l) => l.tipo === "receita").map((l) => l.valor_cents))} />
        </Indicador>
        <Indicador titulo="Despesas">
          <Valor cents={-sumCents(lancamentos.filter((l) => l.tipo === "despesa").map((l) => l.valor_cents))} />
        </Indicador>
        <Indicador titulo="A vencer">
          <span className="numero text-aviso">{formatCents(sumCents(pendentes.filter((o) => o.tipo === "despesa").map((o) => o.valor_cents)))}</span>
        </Indicador>
      </div>

      {/* Calendário do mês */}
      <section aria-label={`Calendário de ${titulo}`} className="cartao-branco rounded-[var(--radius-cartao)] p-3 sm:p-5">
        <div className="grid grid-cols-7 text-center text-xs text-musgo" aria-hidden>
          {SEMANA.map((d) => (
            <span key={d.longo} className="py-2">
              {d.curto}
            </span>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-1">
          {celulas.map((iso, i) => {
            if (!iso) return <li key={`v${i}`} aria-hidden />;
            const info = porDia.get(iso);
            const ehHoje = iso === hoje;
            const selecionado = iso === diaSelecionado;
            const partes = [
              info?.receitas ? `${info.receitas} receita${info.receitas > 1 ? "s" : ""}` : "",
              info?.despesas ? `${info.despesas} despesa${info.despesas > 1 ? "s" : ""}` : "",
              info?.vencimentos ? `${info.vencimentos} vencimento${info.vencimentos > 1 ? "s" : ""} a pagar` : "",
            ].filter(Boolean);
            return (
              <li key={iso}>
                <Link
                  href={`/agenda?mes=${mes}&dia=${iso}`}
                  scroll={false}
                  aria-current={selecionado ? "date" : undefined}
                  aria-label={`${Number(iso.slice(8))} de ${titulo.split(" ")[0]}${ehHoje ? ", hoje" : ""}${partes.length ? `: ${partes.join(", ")}` : ""}`}
                  className={`flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-sm transition ${
                    selecionado ? "bg-floresta font-semibold text-sobre-floresta" : ehHoje ? "font-semibold ring-2 ring-floresta/60" : "hover:bg-tinta/5"
                  }`}
                >
                  <span className="numero">{Number(iso.slice(8))}</span>
                  <span aria-hidden className="flex h-1.5 gap-0.5">
                    {info?.receitas ? <span className="size-1.5 rounded-full bg-receita" /> : null}
                    {info?.despesas ? <span className="size-1.5 rounded-full bg-despesa" /> : null}
                    {info?.vencimentos ? <span className="size-1.5 rounded-full border border-aviso" /> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-musgo">
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-receita" /> Receita</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-despesa" /> Despesa</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full border border-aviso" /> A vencer</span>
        </p>
      </section>

      {/* Dia selecionado */}
      {diaSelecionado && (
        <section aria-labelledby="dia" className="vidro rounded-[var(--radius-cartao)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="dia" className="text-lg font-medium tracking-tight">
              {diaSelecionado === hoje ? "Hoje, " : ""}
              {formatarData(diaSelecionado)}
            </h2>
            <Link href={`/lancamentos/novo?data=${diaSelecionado}`} className={botaoPrimario}>
              <Plus aria-hidden size={16} /> Lançar neste dia
            </Link>
          </div>
          {lancDoDia.length === 0 && vencDoDia.length === 0 ? (
            <p className="mt-3 text-sm text-musgo">Nada registrado neste dia.</p>
          ) : (
            <ul className="mt-2 divide-y divide-linha">
              {vencDoDia.map((o) => (
                <ItemVencimento key={chaveOcorrencia(o.fixa_id, o.vencimento)} o={o} paga={pagas.has(chaveOcorrencia(o.fixa_id, o.vencimento))} hoje={hoje} volta={voltaAqui} />
              ))}
              {lancDoDia.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-floresta">{l.descricao}</span>
                    <span className="block text-xs text-musgo">
                      {l.tipo === "transferencia"
                        ? `${nomeConta.get(l.account_id)} → ${nomeConta.get(l.transfer_to_account_id ?? "")}`
                        : `${nomeCategoria.get(l.category_id ?? "")} · ${nomeConta.get(l.account_id)}`}
                    </span>
                  </span>
                  {l.tipo === "transferencia" ? (
                    <span className="numero text-musgo">{formatCents(l.valor_cents)}</span>
                  ) : (
                    <Valor cents={l.tipo === "receita" ? l.valor_cents : -l.valor_cents} sinal />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Vencimentos do mês */}
      <section aria-labelledby="vencimentos" className="vidro rounded-[var(--radius-cartao)] p-5">
        <div className="flex items-center justify-between">
          <h2 id="vencimentos" className="text-sm text-musgo">Fixas e recorrentes no mês</h2>
          <Link href="/agenda/fixas" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Gerenciar
          </Link>
        </div>
        {vencimentos.length === 0 ? (
          <p className="text-sm text-musgo">
            Nada previsto neste mês. Cadastre aluguel, salário, IPTU e outras em{" "}
            <Link href="/agenda/fixas" className="underline">fixas e recorrentes</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-linha">
            {vencimentos.map((o) => (
              <ItemVencimento key={chaveOcorrencia(o.fixa_id, o.vencimento)} o={o} paga={pagas.has(chaveOcorrencia(o.fixa_id, o.vencimento))} hoje={hoje} volta={voltaAqui} />
            ))}
          </ul>
        )}
      </section>
    </Entrada>
  );
}

function ItemVencimento({ o, paga, hoje, volta }: { o: Ocorrencia; paga: boolean; hoje: string; volta: string }) {
  const atrasada = !paga && o.vencimento < hoje && o.tipo === "despesa";
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {o.nome}
          {o.parcelas > 1 && <span className="font-normal text-musgo"> {o.parcela}/{o.parcelas}</span>}
        </p>
        <p className={`text-xs ${atrasada ? "font-medium text-despesa" : "text-musgo"}`}>
          {paga ? (o.tipo === "receita" ? "Recebida" : "Paga") : atrasada ? "Atrasada" : o.tipo === "receita" ? (o.vencimento < hoje ? "A receber" : "Previsto") : "Vence"}
          {` · ${formatarData(o.vencimento)} · ${formatCents(o.valor_cents)}`}
        </p>
      </div>
      {paga ? (
        <span className="rounded-full bg-menta px-3 py-1.5 text-xs font-medium text-floresta">{o.tipo === "receita" ? "Recebida" : "Paga"}</span>
      ) : (
        <BotaoPagar fixaId={o.fixa_id} vencimento={o.vencimento} volta={volta} nome={o.nome} receita={o.tipo === "receita"} />
      )}
    </li>
  );
}
