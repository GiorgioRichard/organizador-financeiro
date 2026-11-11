/**
 * Lançamentos fixos e recorrentes:
 *  * anuais (IPTU, IPVA...): vencem em mes/dia, à vista ou em parcelas;
 *  * mensais (aluguel, salário...): vencem todo mês no dia, a partir de `desde`.
 * Calcula datas e valores de cada ocorrência. Sem acesso a banco, para testar.
 */
import { diasNoMes, intervaloDoMes, mesDe, somarMeses, somarMesesAoMes } from "./datas.ts";
import { splitCents } from "./money.ts";

export type DespesaFixa = {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  frequencia: "anual" | "mensal";
  /** Primeiro dia em que a recorrência vale (AAAA-MM-DD). */
  desde: string;
  valor_cents: number;
  category_id: string;
  account_id: string;
  mes: number;
  dia: number;
  parcelas: number;
  ativa: boolean;
};

export type Ocorrencia = {
  fixa_id: string;
  nome: string;
  tipo: "receita" | "despesa";
  vencimento: string;
  valor_cents: number;
  parcela: number;
  parcelas: number;
};

/** Parcelas de uma despesa fixa no ciclo que começa em `ano`. */
export function ocorrenciasDoAno(fixa: DespesaFixa, ano: number): Ocorrencia[] {
  const dia = Math.min(fixa.dia, diasNoMes(ano, fixa.mes));
  const primeira = `${ano}-${String(fixa.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return splitCents(fixa.valor_cents, fixa.parcelas).map((valor_cents, i) => ({
    fixa_id: fixa.id,
    nome: fixa.nome,
    tipo: fixa.tipo,
    vencimento: somarMeses(primeira, i),
    valor_cents,
    parcela: i + 1,
    parcelas: fixa.parcelas,
  }));
}

/**
 * Parcelas que vencem entre `inicio` e `fim` (inclusive). Olha também o
 * ano anterior, porque um ciclo que começa em novembro avança pelo ano
 * seguinte.
 */
export function ocorrenciasNoIntervalo(
  fixas: readonly DespesaFixa[],
  inicio: string,
  fim: string,
): Ocorrencia[] {
  const anoInicio = Number(inicio.slice(0, 4));
  const anoFim = Number(fim.slice(0, 4));
  const lista: Ocorrencia[] = [];
  for (const fixa of fixas) {
    if (!fixa.ativa) continue;
    if (fixa.frequencia === "mensal") {
      lista.push(...mensaisNoIntervalo(fixa, inicio, fim));
      continue;
    }
    for (let ano = anoInicio - 1; ano <= anoFim; ano++) {
      for (const o of ocorrenciasDoAno(fixa, ano)) {
        if (o.vencimento >= inicio && o.vencimento <= fim) lista.push(o);
      }
    }
  }
  return lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.nome.localeCompare(b.nome));
}

/** Ocorrências de uma recorrência mensal, a partir do mês de `desde`. */
function mensaisNoIntervalo(fixa: DespesaFixa, inicio: string, fim: string): Ocorrencia[] {
  const lista: Ocorrencia[] = [];
  let mes = mesDe(inicio < fixa.desde ? fixa.desde : inicio);
  while (mes <= mesDe(fim)) {
    const [a, m] = mes.split("-").map(Number);
    const vencimento = `${mes}-${String(Math.min(fixa.dia, diasNoMes(a, m))).padStart(2, "0")}`;
    if (vencimento >= inicio && vencimento <= fim && vencimento >= intervaloDoMes(mesDe(fixa.desde)).inicio) {
      lista.push({
        fixa_id: fixa.id,
        nome: fixa.nome,
        tipo: fixa.tipo,
        vencimento,
        valor_cents: fixa.valor_cents,
        parcela: 1,
        parcelas: 1,
      });
    }
    mes = somarMesesAoMes(mes, 1);
  }
  return lista;
}

/** A ocorrência que vence exatamente em `data`, se houver (ativa ou não). */
export function ocorrenciaEm(fixa: DespesaFixa, data: string): Ocorrencia | undefined {
  return ocorrenciasNoIntervalo([{ ...fixa, ativa: true }], data, data)[0];
}

/** Chave usada para saber se uma parcela já foi paga. */
export function chaveOcorrencia(fixaId: string, vencimento: string): string {
  return `${fixaId}|${vencimento}`;
}
