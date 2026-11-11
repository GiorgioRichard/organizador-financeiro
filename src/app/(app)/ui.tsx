import type { ReactNode } from "react";
import { FileDown } from "lucide-react";
import { formatCents } from "@/lib/money";

/** Estilos compartilhados dos formulários e botões das telas privadas. */
export const campo =
  "w-full rounded-2xl border border-superficie bg-superficie/80 px-4 py-3 text-base font-normal text-tinta placeholder:text-musgo/60 focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-floresta/40";
export const rotulo = "flex flex-col gap-1.5 text-sm font-medium text-tinta";
export const botaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-full bg-floresta px-5 py-3 text-sm font-medium text-sobre-floresta shadow-[0_10px_24px_-12px_rgb(15_59_51/0.7)] transition hover:bg-floresta-2";
export const botaoClaro =
  "inline-flex items-center justify-center gap-2 rounded-full bg-superficie px-5 py-3 text-sm font-medium text-tinta shadow-[0_6px_18px_-10px_rgb(15_59_51/0.45)] transition hover:bg-superficie/80";
export const botaoMenta =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-menta px-5 py-3 text-sm font-medium text-floresta transition hover:bg-menta-forte";

export function Titulo({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div>
      <h1 className="text-[2rem] font-medium leading-tight tracking-[-0.035em]">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-sm text-musgo">{subtitulo}</p>}
    </div>
  );
}

export function Aviso({ erro, ok }: { erro?: string; ok?: string }) {
  if (erro) {
    return (
      <p role="alert" className="rounded-2xl border border-superficie bg-despesa-suave px-4 py-3 text-sm text-despesa">
        {erro}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="rounded-2xl border border-superficie bg-menta/60 px-4 py-3 text-sm text-floresta">
        {ok}
      </p>
    );
  }
  return null;
}

/** Valor em linha, com cor: verde se positivo, vermelho se negativo. */
export function Valor({ cents: bruto, sinal = false }: { cents: number; sinal?: boolean }) {
  const cents = bruto || 0; // evita "-R$ 0,00" quando o valor é -0
  const cor = cents > 0 ? "text-receita" : cents < 0 ? "text-despesa" : "";
  const texto = formatCents(cents);
  return <span className={`numero ${cor}`}>{sinal && cents > 0 ? `+${texto}` : texto}</span>;
}

/**
 * Valor de destaque: "R$" pequeno no alto, reais grandes e centavos
 * pequenos, como "$1,976.00" no cartão do modelo.
 */
export function ValorGrande({ cents: bruto, tamanho = "text-5xl" }: { cents: number; tamanho?: string }) {
  const cents = bruto || 0;
  const negativo = cents < 0;
  const abs = Math.abs(cents);
  const reais = new Intl.NumberFormat("pt-BR").format(Math.floor(abs / 100));
  const centavos = String(abs % 100).padStart(2, "0");
  return (
    <span className="numero inline-flex items-start font-medium" aria-label={formatCents(cents)}>
      <span aria-hidden className="mr-1 mt-[0.35em] text-sm opacity-70">
        {negativo ? "-R$" : "R$"}
      </span>
      <span aria-hidden className={`${tamanho} leading-none`}>
        {reais}
      </span>
      <span aria-hidden className="mt-auto pb-[0.15em] text-sm opacity-70">
        ,{centavos}
      </span>
    </span>
  );
}

/** Indicador pequeno com rótulo e valor, em vidro. */
export function Indicador({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="vidro rounded-3xl px-4 py-3">
      <p className="text-xs text-musgo">{titulo}</p>
      <p className="mt-0.5 text-[0.95rem] font-medium sm:text-lg">{children}</p>
    </div>
  );
}

/** Baixa o relatório do mês em PDF (gerado no servidor). */
export function BotaoPDF({ mes }: { mes: string }) {
  return (
    <a
      href={`/relatorio/pdf?mes=${mes}`}
      download={`relatorio-${mes}.pdf`}
      className="vidro inline-flex min-h-11 items-center gap-2 self-start rounded-full px-4 text-sm font-medium hover:bg-superficie"
    >
      <FileDown aria-hidden size={16} /> Relatório PDF
    </a>
  );
}

export function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <div className="vidro h-56 animate-pulse rounded-[var(--radius-cartao)]" />
      <div className="vidro h-32 animate-pulse rounded-[var(--radius-cartao)]" />
    </div>
  );
}

/** Barra de progresso clara (trilho cinza, preenchimento verde-escuro). */
export function Progresso({ fracao, rotulo }: { fracao: number; rotulo: string }) {
  const pct = Math.max(0, Math.min(1, fracao)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-2.5 w-full overflow-hidden rounded-full bg-tinta/10"
    >
      <div className="h-full rounded-full bg-floresta" style={{ width: `${pct}%` }} />
    </div>
  );
}
