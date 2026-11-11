import Link from "next/link";
import { CalendarClock, CalendarCheck, CreditCard, ArrowUpRight } from "lucide-react";
import { diasEntre, formatarData } from "@/lib/datas";
import type { ContaComSaldo } from "@/lib/financas";
import { formatCents } from "@/lib/money";
import { ValorGrande, botaoMenta } from "./ui";

/**
 * Cartão de crédito em destaque: fatura atual, uso do limite numa barra
 * segmentada com marcador e, num quadro branco, em que dia do ciclo
 * estamos, com fechamento e vencimento.
 */
export function CartaoFatura({ conta, hoje, acao = true }: { conta: ContaComSaldo; hoje: string; acao?: boolean }) {
  const fatura = conta.fatura;
  if (!fatura) return null;

  const total = Math.max(0, fatura.total_cents);
  const limite = conta.limite_cents;
  const fracao = limite ? Math.min(1, total / limite) : null;

  const diaDoCiclo = diasEntre(fatura.inicio, hoje) + 1;
  const diasNoCiclo = diasEntre(fatura.inicio, fatura.fechamento) + 1;
  const faltam = diasEntre(hoje, fatura.fechamento);

  return (
    <article className="cartao-escuro rounded-[var(--radius-cartao)] p-5">
      <header className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-cartao/80">{conta.nome}</p>
          <p className="text-xs text-cartao/50">Fatura atual</p>
        </div>
        <span className="grid size-11 place-items-center rounded-full border border-cartao/20 text-cartao/80">
          <CreditCard aria-hidden size={18} />
        </span>
      </header>

      <div className="relative mt-4">
        <ValorGrande cents={total} />
        <p className="mt-1 text-sm text-cartao/60">
          {limite ? (
            <>
              Gasto do limite de <span className="font-medium text-cartao">{formatCents(limite)}</span>
            </>
          ) : (
            "Sem limite cadastrado"
          )}
        </p>
      </div>

      {fracao !== null && limite && (
        <div className="relative mt-5">
          <BarraSegmentada fracao={fracao} />
          <p className="mt-2 text-sm font-medium">
            {formatCents(Math.max(0, limite - total))} <span className="font-normal text-cartao/60">disponível</span>
          </p>
        </div>
      )}

      <div className="cartao-branco relative mt-5 rounded-3xl p-4 text-tinta">
        <p className="text-center text-sm font-medium">
          Dia {diaDoCiclo} de {diasNoCiclo} do ciclo
        </p>
        <PontosDoCiclo feitos={diaDoCiclo} total={diasNoCiclo} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="flex items-center gap-1.5 text-musgo">
            <CalendarClock aria-hidden size={14} />
            Fecha <span className="font-medium text-tinta">{formatarData(fatura.fechamento)}</span>
            {faltam > 0 && <span>({faltam}d)</span>}
          </p>
          <p className="flex items-center justify-end gap-1.5 text-musgo">
            <CalendarCheck aria-hidden size={14} />
            Vence <span className="font-medium text-tinta">{formatarData(fatura.vencimento)}</span>
          </p>
        </div>
      </div>

      {acao && (
        <Link href="/lancamentos" className={`${botaoMenta} relative mt-4`}>
          Ver lançamentos <ArrowUpRight aria-hidden size={16} />
        </Link>
      )}
    </article>
  );
}

/** Trilho em segmentos, preenchimento em degradê até o marcador. */
function BarraSegmentada({ fracao }: { fracao: number }) {
  const pct = fracao * 100;
  return (
    <div
      role="progressbar"
      aria-label="Limite usado"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="relative h-9"
    >
      <div className="absolute inset-0 grid grid-cols-8 gap-[3px] overflow-hidden rounded-md">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="bg-cartao/[0.08]" />
        ))}
      </div>
      <div
        className="absolute inset-y-0 left-0 rounded-l-md bg-[linear-gradient(90deg,transparent_55%,color-mix(in_oklab,var(--cartao)_85%,transparent))]"
        style={{ width: `${pct}%` }}
      />
      <span className="absolute -top-2 bottom-0 w-0.5 -translate-x-1/2 bg-cartao" style={{ left: `${pct}%` }}>
        <span className="absolute -left-[5px] -top-1 size-3 rounded-full border-2 border-cartao bg-cartao-fundo" />
      </span>
    </div>
  );
}

/** Até 7 bolinhas representando o avanço do ciclo, como a sequência de dias do modelo. */
function PontosDoCiclo({ feitos, total }: { feitos: number; total: number }) {
  const pontos = 7;
  const marcados = Math.round((Math.min(feitos, total) / total) * pontos);
  return (
    <div aria-hidden className="mt-3 flex justify-center gap-2">
      {Array.from({ length: pontos }, (_, i) => (
        <span
          key={i}
          className={
            i < marcados
              ? "grid size-8 place-items-center rounded-full border border-menta-forte bg-menta text-floresta"
              : "size-8 rounded-full bg-tinta/10"
          }
        >
          {i < marcados && (
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}
