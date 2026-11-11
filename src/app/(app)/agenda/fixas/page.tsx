import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, Pause, Play, Trash2 } from "lucide-react";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { formatarData, hojeISO, somarMeses } from "@/lib/datas";
import { chaveOcorrencia, ocorrenciasNoIntervalo } from "@/lib/fixas";
import { listarCategorias, listarContas, listarFixas, parcelasPagas } from "@/lib/financas";
import { formatCents, sumCents } from "@/lib/money";
import { Aviso, Carregando, Titulo, ValorGrande, botaoPrimario } from "../../ui";
import { alternarFixa, criarFixa, excluirFixa } from "../actions";
import { BotaoPagar } from "../pagar";
import { FormFixa } from "./form-fixa";

type SearchParams = Promise<{ erro?: string; ok?: string }>;

export default function FixasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Despesas fixas anuais" subtitulo="IPTU, IPVA e outras contas que voltam todo ano" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const { erro, ok } = await searchParams;
  const hoje = hojeISO();
  const daquiUmAno = somarMeses(hoje, 12);

  const [fixas, contas, categorias, pagas] = await Promise.all([
    listarFixas(supabase),
    listarContas(supabase),
    listarCategorias(supabase),
    parcelasPagas(supabase, somarMeses(hoje, -1), daquiUmAno),
  ]);
  const ativasContas = contas.filter((c) => !c.arquivada);
  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));

  // Próximas parcelas em aberto (12 meses), mais as atrasadas do último mês
  const proximas = ocorrenciasNoIntervalo(fixas, somarMeses(hoje, -1), daquiUmAno).filter(
    (o) => !pagas.has(chaveOcorrencia(o.fixa_id, o.vencimento)),
  );
  const totalAnual = sumCents(fixas.filter((f) => f.ativa).map((f) => f.valor_cents));

  return (
    <Entrada className="flex flex-col gap-5">
      <Aviso erro={erro} ok={ok} />

      {fixas.length > 0 && (
        <section aria-labelledby="total" className="cartao-escuro rounded-[var(--radius-cartao)] p-5">
          <h2 id="total" className="relative text-sm opacity-80">Total por ano</h2>
          <div className="relative mt-1">
            <ValorGrande cents={totalAnual} />
          </div>
          <p className="relative mt-1 text-sm opacity-70">
            {fixas.filter((f) => f.ativa).length === 1 ? "1 despesa ativa" : `${fixas.filter((f) => f.ativa).length} despesas ativas`} · cerca de {formatCents(Math.round(totalAnual / 12))} por mês
          </p>
        </section>
      )}

      {proximas.length > 0 && (
        <section aria-labelledby="proximas" className="vidro rounded-[var(--radius-cartao)] p-5">
          <h2 id="proximas" className="text-sm text-musgo">Próximos vencimentos</h2>
          <ul className="mt-2 divide-y divide-linha">
            {proximas.slice(0, 6).map((o) => {
              const atrasada = o.vencimento < hoje;
              return (
                <li key={chaveOcorrencia(o.fixa_id, o.vencimento)} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-floresta">
                      {o.nome}
                      {o.parcelas > 1 && <span className="font-normal text-musgo"> {o.parcela}/{o.parcelas}</span>}
                    </p>
                    <p className={`text-xs ${atrasada ? "font-medium text-despesa" : "text-musgo"}`}>
                      {atrasada ? "Atrasada · " : "Vence "}
                      {formatarData(o.vencimento, true)} · {formatCents(o.valor_cents)}
                    </p>
                  </div>
                  <BotaoPagar fixaId={o.fixa_id} vencimento={o.vencimento} volta="/agenda/fixas" nome={o.nome} />
                </li>
              );
            })}
          </ul>
          <Link href="/agenda" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Ver no calendário
          </Link>
        </section>
      )}

      {fixas.length > 0 && (
        <section aria-labelledby="cadastradas" className="vidro rounded-[var(--radius-cartao)] p-5">
          <h2 id="cadastradas" className="text-sm text-musgo">Cadastradas</h2>
          <ul className="mt-2 divide-y divide-linha">
            {fixas.map((f) => (
              <li key={f.id} className={`flex flex-wrap items-center gap-3 py-3 ${f.ativa ? "" : "opacity-60"}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-floresta">
                  <CalendarClock aria-hidden size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {f.nome} {!f.ativa && <span className="text-xs font-normal text-musgo">(pausada)</span>}
                  </p>
                  <p className="text-xs text-musgo">
                    {formatCents(f.valor_cents)}
                    {f.parcelas > 1 ? ` em ${f.parcelas}x` : " à vista"} · dia {f.dia}/{String(f.mes).padStart(2, "0")} ·{" "}
                    {nomeConta.get(f.account_id)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <form action={alternarFixa}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="ativar" value={f.ativa ? "0" : "1"} />
                    <button
                      type="submit"
                      aria-label={`${f.ativa ? "Pausar" : "Reativar"} ${f.nome}`}
                      title={f.ativa ? "Pausar" : "Reativar"}
                      className="grid size-11 place-items-center rounded-full text-musgo hover:bg-tinta/5 hover:text-tinta"
                    >
                      {f.ativa ? <Pause aria-hidden size={16} /> : <Play aria-hidden size={16} />}
                    </button>
                  </form>
                  <form action={excluirFixa}>
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      aria-label={`Excluir ${f.nome}`}
                      title="Excluir"
                      className="grid size-11 place-items-center rounded-full text-musgo hover:bg-despesa-suave hover:text-despesa"
                    >
                      <Trash2 aria-hidden size={16} />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="nova" className="flex flex-col gap-3">
        <h2 id="nova" className="text-xl font-medium tracking-tight">Nova despesa fixa</h2>
        {ativasContas.length === 0 ? (
          <Link href="/contas/nova" className={`${botaoPrimario} self-start`}>
            Cadastre uma conta primeiro
          </Link>
        ) : (
          <FormFixa
            action={criarFixa}
            contas={ativasContas.map((c) => ({ id: c.id, nome: c.nome }))}
            categorias={despesas.map((c) => ({ id: c.id, nome: c.nome }))}
            mesAtual={Number(hoje.slice(5, 7))}
          />
        )}
      </section>
    </Entrada>
  );
}
