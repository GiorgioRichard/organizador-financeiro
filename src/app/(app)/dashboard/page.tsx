import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Plus, Settings2, TrendingUp } from "lucide-react";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { diasEntre, hojeISO, intervaloDoMes, mesDe, nomeDoMes } from "@/lib/datas";
import { contasComSaldo, NOMES_TIPO_CONTA } from "@/lib/financas";
import { formatCents, sumCents } from "@/lib/money";
import { CartaoFatura } from "../cartao-fatura";
import { Carregando, Progresso, Titulo, Valor, ValorGrande, botaoClaro, botaoPrimario } from "../ui";

export default function DashboardPage() {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Bem-vindo de volta!" subtitulo="Aqui está o resumo das suas contas" />
      <Suspense fallback={<Carregando />}>
        <Painel />
      </Suspense>
    </main>
  );
}

async function Painel() {
  const { supabase, user } = await exigirUsuario();
  const hoje = hojeISO();
  const mes = mesDe(hoje);
  const { inicio, fim } = intervaloDoMes(mes);

  const [contas, doMes] = await Promise.all([
    contasComSaldo(supabase, hoje),
    supabase
      .from("transactions")
      .select("tipo, valor_cents")
      .in("tipo", ["receita", "despesa"])
      .gte("data", inicio)
      .lte("data", fim),
  ]);
  if (doMes.error) throw doMes.error;

  const ativas = contas.filter((c) => !c.arquivada);
  if (ativas.length === 0) {
    return (
      <div className="vidro flex flex-col items-start gap-4 rounded-[var(--radius-cartao)] p-6">
        <p className="text-xl font-medium tracking-tight">Comece cadastrando uma conta</p>
        <p className="text-sm text-musgo">
          Conta corrente, poupança, carteira ou cartão. Depois é só lançar receitas e despesas.
        </p>
        <Link href="/contas/nova" className={botaoPrimario}>
          Cadastrar conta <ArrowUpRight aria-hidden size={16} />
        </Link>
      </div>
    );
  }

  const contasComuns = ativas.filter((c) => c.tipo !== "cartao");
  const cartoes = ativas.filter((c) => c.tipo === "cartao");
  const emContas = sumCents(contasComuns.map((c) => c.saldo_cents));
  const lancs = doMes.data as { tipo: string; valor_cents: number }[];
  const receitas = sumCents(lancs.filter((l) => l.tipo === "receita").map((l) => l.valor_cents));
  const despesas = sumCents(lancs.filter((l) => l.tipo === "despesa").map((l) => l.valor_cents));
  const resultado = receitas - despesas;
  const diasRestantes = diasEntre(hoje, fim);
  const nome =
    typeof user.user_metadata?.nome === "string" && user.user_metadata.nome
      ? user.user_metadata.nome
      : (user.email ?? "").split("@")[0];
  const nomeMes = nomeDoMes(mes).split(" ")[0];

  return (
    <Entrada className="flex flex-col gap-5">
      {/* Carteira: moldura de vidro com o cartão escuro do saldo */}
      <section aria-label="Saldo" className="vidro rounded-[2rem] p-2">
        <div className="flex items-center justify-between px-3 pb-2 pt-1 text-sm">
          <span className="font-medium">{nome}</span>
          <span className="text-musgo">
            {contasComuns.length} {contasComuns.length === 1 ? "conta" : "contas"}
          </span>
        </div>
        <div className="cartao-escuro flex min-h-44 flex-col justify-between rounded-[1.5rem] p-5">
          <div className="relative flex justify-end">
            <span className="selo rounded-lg px-2.5 py-1 text-xs font-semibold first-letter:uppercase">
              {nomeMes}
            </span>
          </div>
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <ValorGrande cents={emContas} />
              <p className="mt-1 text-sm text-cartao/80">Saldo em contas</p>
            </div>
            <span aria-hidden className="mb-1 flex gap-1 rounded-full border border-cartao/25 px-2 py-1">
              {contasComuns.slice(0, 4).map((c, i) => (
                <span key={c.id} className={`size-1.5 rounded-full ${i === 0 ? "bg-cartao" : "bg-cartao/40"}`} />
              ))}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link href="/contas" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-3 text-sm text-tinta/80 hover:text-tinta">
            <Settings2 aria-hidden size={16} /> Gerenciar
          </Link>
          <Link href="/lancamentos/novo" className={`${botaoClaro} whitespace-nowrap`}>
            <Plus aria-hidden size={16} /> Lançar
          </Link>
        </div>
      </section>

      {/* Resultado do mês: cartão branco com barra de gastos */}
      <section aria-labelledby="resultado" className="cartao-branco rounded-[var(--radius-cartao)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-menta/70 text-floresta">
              <TrendingUp aria-hidden size={16} />
            </span>
            <h2 id="resultado" className="text-xl font-medium tracking-tight">
              Resultado: <Valor cents={resultado} />
            </h2>
          </div>
          <Link
            href={`/lancamentos?mes=${mes}`}
            aria-label={`Lançamentos de ${nomeDoMes(mes)}`}
            className="grid size-9 place-items-center rounded-full border border-linha hover:bg-tinta/5"
          >
            <ArrowUpRight aria-hidden size={16} />
          </Link>
        </div>
        <p className="mt-3 text-sm text-musgo">
          {receitas > 0
            ? `Você gastou ${formatCents(despesas)} dos ${formatCents(receitas)} que entraram em ${nomeMes}.`
            : `Nenhuma receita lançada em ${nomeMes} ainda.`}
        </p>
        <div className="mt-4 flex items-end justify-between text-sm">
          <p>
            <span className="numero text-xl font-medium">{formatCents(despesas)}</span>
            <span className="text-musgo"> / {formatCents(receitas)}</span>
          </p>
          <p className="text-musgo">
            {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
          </p>
        </div>
        <div className="mt-2">
          <Progresso fracao={receitas > 0 ? despesas / receitas : despesas > 0 ? 1 : 0} rotulo="Gastos sobre receitas do mês" />
        </div>
      </section>

      {cartoes.map((c) => (
        <CartaoFatura key={c.id} conta={c} hoje={hoje} />
      ))}

      {/* Contas: lista em vidro, como "conversas recentes" */}
      <section aria-labelledby="contas" className="vidro rounded-[var(--radius-cartao)] p-5">
        <div className="flex items-center justify-between">
          <h2 id="contas" className="text-sm text-musgo">Suas contas</h2>
          <Link href="/contas" className="text-sm font-medium underline underline-offset-4">
            Ver todas
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-linha">
          {ativas.map((c) => (
            <li key={c.id}>
              <Link href={`/contas/${c.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium text-floresta">{c.nome}</span>
                  <span className="block text-xs text-musgo">{NOMES_TIPO_CONTA[c.tipo]}</span>
                </span>
                <span className="flex items-center gap-2">
                  {c.tipo === "cartao" ? (
                    <span className="numero">{formatCents(c.fatura?.total_cents ?? 0)}</span>
                  ) : (
                    <Valor cents={c.saldo_cents} />
                  )}
                  <ChevronRight aria-hidden size={16} className="text-musgo" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Entrada>
  );
}
