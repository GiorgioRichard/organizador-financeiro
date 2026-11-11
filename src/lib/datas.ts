/**
 * Datas como texto ISO "AAAA-MM-DD" (sem hora), iguais à coluna `date`
 * do banco. Evita surpresas de fuso: "hoje" é sempre o dia em São Paulo.
 */

const FUSO = "America/Sao_Paulo";

/** Dia de hoje em São Paulo, ex.: "2026-11-11". */
export function hojeISO(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.split("-").map(Number);
  return [a, m, d];
}

function montar(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Quantidade de dias do mês (mes de 1 a 12). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Valida "AAAA-MM-DD" e se o dia existe no mês. */
export function ehDataISO(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = partes(texto);
  return m >= 1 && m <= 12 && d >= 1 && d <= diasNoMes(a, m);
}

/** Valida "AAAA-MM". */
export function ehMes(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

/** Data com o dia ajustado ao fim do mês quando ele não existe (31/02 -> 28/02). */
function dataNoMes(ano: number, mes: number, dia: number): string {
  return montar(ano, mes, Math.min(dia, diasNoMes(ano, mes)));
}

/**
 * Soma meses mantendo o dia, ajustado ao fim do mês quando preciso.
 * Ex.: 31/01 + 1 mês = 28/02 (ou 29/02 em ano bissexto).
 */
export function somarMeses(iso: string, n: number): string {
  const [a, m, d] = partes(iso);
  const total = a * 12 + (m - 1) + n;
  return dataNoMes(Math.floor(total / 12), (total % 12) + 1, d);
}

export function somarDias(iso: string, n: number): string {
  const [a, m, d] = partes(iso);
  const data = new Date(Date.UTC(a, m - 1, d + n));
  return montar(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
}

/** Dias de `de` até `ate` (positivo se `ate` for depois). */
export function diasEntre(de: string, ate: string): number {
  const utc = (iso: string) => {
    const [a, m, d] = partes(iso);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((utc(ate) - utc(de)) / 86_400_000);
}

/** "2026-11-11" -> "2026-11" */
export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

/** Desloca um mês "AAAA-MM" em n meses. */
export function somarMesesAoMes(mes: string, n: number): string {
  return mesDe(somarMeses(`${mes}-01`, n));
}

/** Primeiro e último dia de um mês "AAAA-MM". */
export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
  const [a, m] = mes.split("-").map(Number);
  return { inicio: montar(a, m, 1), fim: montar(a, m, diasNoMes(a, m)) };
}

export type CicloFatura = {
  /** Primeira data de compra que entra nesta fatura. */
  inicio: string;
  /** Última data de compra que entra nesta fatura. */
  fechamento: string;
  vencimento: string;
};

/**
 * Fatura do cartão em que cai uma compra feita em `data`.
 * Compras até o dia de fechamento (inclusive) entram na fatura que fecha
 * naquele mês; depois disso, na do mês seguinte. O vencimento é o próximo
 * dia de vencimento depois do fechamento.
 */
export function cicloFatura(
  diaFechamento: number,
  diaVencimento: number,
  data: string,
): CicloFatura {
  const mes = mesDe(data);
  const fechamentoNoMes = diaDoMes(mes, diaFechamento);
  const mesFatura = data <= fechamentoNoMes ? mes : somarMesesAoMes(mes, 1);

  const fechamento = diaDoMes(mesFatura, diaFechamento);
  const inicio = somarDias(diaDoMes(somarMesesAoMes(mesFatura, -1), diaFechamento), 1);
  const vencimentoNoMes = diaDoMes(mesFatura, diaVencimento);
  const vencimento =
    vencimentoNoMes > fechamento
      ? vencimentoNoMes
      : diaDoMes(somarMesesAoMes(mesFatura, 1), diaVencimento);

  return { inicio, fechamento, vencimento };
}

/** Dia `dia` do mês "AAAA-MM", ajustado ao fim do mês quando não existe. */
function diaDoMes(mes: string, dia: number): string {
  const [a, m] = mes.split("-").map(Number);
  return dataNoMes(a, m, dia);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-11" -> "novembro de 2026" */
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

/** "2026-11-05" -> "05/11" ou, com ano, "05/11/2026" */
export function formatarData(iso: string, comAno = false): string {
  const [a, m, d] = iso.split("-");
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`;
}
