import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cicloFatura, type CicloFatura } from "@/lib/datas";
import { sumCents } from "@/lib/money";
import { chaveOcorrencia, type DespesaFixa } from "@/lib/fixas";

export type { DespesaFixa };

export type TipoConta = "corrente" | "poupanca" | "carteira" | "cartao";
export type TipoLancamento = "receita" | "despesa" | "transferencia";

export const NOMES_TIPO_CONTA: Record<TipoConta, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  carteira: "Carteira",
  cartao: "Cartão de crédito",
};

export type Conta = {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldo_inicial_cents: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  limite_cents: number | null;
  arquivada: boolean;
};

export type ContaComSaldo = Conta & {
  saldo_cents: number;
  /** Só para cartões: fatura em aberto que contém `hoje`. */
  fatura?: CicloFatura & { total_cents: number };
};

export type Categoria = { id: string; nome: string; tipo: "receita" | "despesa" };

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  valor_cents: number;
  data: string;
  descricao: string;
  account_id: string;
  category_id: string | null;
  transfer_to_account_id: string | null;
  parcela_grupo_id: string | null;
  parcela_n: number | null;
  parcela_total: number | null;
};

const COLUNAS_CONTA =
  "id, nome, tipo, saldo_inicial_cents, dia_fechamento, dia_vencimento, limite_cents, arquivada";

export async function listarContas(supabase: SupabaseClient): Promise<Conta[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select(COLUNAS_CONTA)
    .order("arquivada")
    .order("nome");
  if (error) throw error;
  return data as Conta[];
}

export async function buscarConta(supabase: SupabaseClient, id: string): Promise<Conta | null> {
  const { data, error } = await supabase.from("accounts").select(COLUNAS_CONTA).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Conta | null;
}

export async function listarCategorias(supabase: SupabaseClient): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categories").select("id, nome, tipo").order("nome");
  if (error) throw error;
  return data as Categoria[];
}

export async function listarFixas(supabase: SupabaseClient): Promise<DespesaFixa[]> {
  const { data, error } = await supabase
    .from("despesas_fixas")
    .select("id, nome, valor_cents, category_id, account_id, mes, dia, parcelas, ativa")
    .order("mes")
    .order("dia");
  if (error) throw error;
  return data as DespesaFixa[];
}

/** Chaves (fixa|vencimento) das parcelas já pagas entre `inicio` e `fim`. */
export async function parcelasPagas(supabase: SupabaseClient, inicio: string, fim: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("transactions")
    .select("despesa_fixa_id, fixa_vencimento")
    .not("despesa_fixa_id", "is", null)
    .gte("fixa_vencimento", inicio)
    .lte("fixa_vencimento", fim);
  if (error) throw error;
  return new Set(
    (data as { despesa_fixa_id: string; fixa_vencimento: string }[]).map((t) =>
      chaveOcorrencia(t.despesa_fixa_id, t.fixa_vencimento),
    ),
  );
}

/**
 * Contas com saldo até `hoje` e, para cartões, a fatura atual
 * (compras menos estornos dentro do ciclo que contém `hoje`).
 */
export async function contasComSaldo(
  supabase: SupabaseClient,
  hoje: string,
): Promise<ContaComSaldo[]> {
  const [contas, saldos] = await Promise.all([
    listarContas(supabase),
    supabase.rpc("saldos_contas", { ate: hoje }),
  ]);
  if (saldos.error) throw saldos.error;
  const saldoPorConta = new Map(
    (saldos.data as { account_id: string; saldo_cents: number }[]).map((s) => [
      s.account_id,
      Number(s.saldo_cents),
    ]),
  );

  return Promise.all(
    contas.map(async (conta): Promise<ContaComSaldo> => {
      const saldo_cents = saldoPorConta.get(conta.id) ?? conta.saldo_inicial_cents;
      if (conta.tipo !== "cartao" || conta.dia_fechamento === null || conta.dia_vencimento === null) {
        return { ...conta, saldo_cents };
      }
      const ciclo = cicloFatura(conta.dia_fechamento, conta.dia_vencimento, hoje);
      const { data, error } = await supabase
        .from("transactions")
        .select("tipo, valor_cents")
        .eq("account_id", conta.id)
        .in("tipo", ["despesa", "receita"])
        .gte("data", ciclo.inicio)
        .lte("data", ciclo.fechamento);
      if (error) throw error;
      const total_cents = sumCents(
        (data as { tipo: string; valor_cents: number }[]).map((t) =>
          t.tipo === "despesa" ? t.valor_cents : -t.valor_cents,
        ),
      );
      return { ...conta, saldo_cents, fatura: { ...ciclo, total_cents } };
    }),
  );
}
