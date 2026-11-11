/**
 * Despesas fixas anuais (IPTU, IPVA...): calcula as datas e os valores
 * de cada parcela num ano. Sem acesso a banco, para poder testar.
 */
import { diasNoMes, somarMeses } from "./datas.ts";
import { splitCents } from "./money.ts";

export type DespesaFixa = {
  id: string;
  nome: string;
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
    for (let ano = anoInicio - 1; ano <= anoFim; ano++) {
      for (const o of ocorrenciasDoAno(fixa, ano)) {
        if (o.vencimento >= inicio && o.vencimento <= fim) lista.push(o);
      }
    }
  }
  return lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.nome.localeCompare(b.nome));
}

/** Chave usada para saber se uma parcela já foi paga. */
export function chaveOcorrencia(fixaId: string, vencimento: string): string {
  return `${fixaId}|${vencimento}`;
}
