import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Backup dos dados do usuário em JSON.
 * O arquivo leva tudo o que é dele (contas, categorias, lançamentos,
 * recorrentes e orçamentos) e pode ser restaurado na mesma conta, numa
 * conta nova ou em outro servidor Supabase.
 */

export const VERSAO_BACKUP = 1;

const COLUNAS = {
  accounts: "id, nome, tipo, saldo_inicial_cents, dia_fechamento, dia_vencimento, limite_cents, arquivada",
  categories: "id, nome, tipo",
  despesas_fixas: "id, nome, tipo, frequencia, desde, valor_cents, category_id, account_id, mes, dia, parcelas, ativa",
  transactions:
    "id, tipo, valor_cents, data, descricao, account_id, category_id, transfer_to_account_id, parcela_grupo_id, parcela_n, parcela_total, despesa_fixa_id, fixa_vencimento",
  budgets: "id, category_id, mes, limite_cents",
} as const;

type Tabela = keyof typeof COLUNAS;

/** Busca todas as linhas de uma tabela, de 1.000 em 1.000 (limite da API). */
async function tudo(supabase: SupabaseClient, tabela: Tabela) {
  const linhas: Record<string, unknown>[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(COLUNAS[tabela]).order("id").range(de, de + 999);
    if (error) throw error;
    linhas.push(...(data as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) return linhas;
  }
}

export async function montarBackup(supabase: SupabaseClient, email: string) {
  const [contas, categorias, recorrentes, lancamentos, orcamentos] = await Promise.all([
    tudo(supabase, "accounts"),
    tudo(supabase, "categories"),
    tudo(supabase, "despesas_fixas"),
    tudo(supabase, "transactions"),
    tudo(supabase, "budgets"),
  ]);
  return {
    app: "organizador-financeiro",
    versao: VERSAO_BACKUP,
    exportado_em: new Date().toISOString(),
    usuario: email,
    contas,
    categorias,
    recorrentes,
    lancamentos,
    orcamentos,
  };
}

// ---------- Validação do arquivo na restauração ----------

const uuid = z.uuid();
const cents = z.number().int().safe();
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const backupSchema = z.object({
  app: z.literal("organizador-financeiro", { error: "Este arquivo não é um backup do Organizador" }),
  versao: z.literal(VERSAO_BACKUP, { error: "Versão de backup não suportada" }),
  contas: z.array(
    z.object({
      id: uuid,
      nome: z.string().min(1).max(60),
      tipo: z.enum(["corrente", "poupanca", "carteira", "cartao"]),
      saldo_inicial_cents: cents,
      dia_fechamento: z.number().int().nullable(),
      dia_vencimento: z.number().int().nullable(),
      limite_cents: cents.nullable(),
      arquivada: z.boolean(),
    }),
  ),
  categorias: z.array(z.object({ id: uuid, nome: z.string().min(1).max(40), tipo: z.enum(["receita", "despesa"]) })),
  recorrentes: z.array(
    z.object({
      id: uuid,
      nome: z.string().min(1).max(60),
      tipo: z.enum(["receita", "despesa"]),
      frequencia: z.enum(["anual", "mensal"]),
      desde: data,
      valor_cents: cents,
      category_id: uuid,
      account_id: uuid,
      mes: z.number().int(),
      dia: z.number().int(),
      parcelas: z.number().int(),
      ativa: z.boolean(),
    }),
  ),
  lancamentos: z.array(
    z.object({
      id: uuid,
      tipo: z.enum(["receita", "despesa", "transferencia"]),
      valor_cents: cents,
      data,
      descricao: z.string().min(1).max(120),
      account_id: uuid,
      category_id: uuid.nullable(),
      transfer_to_account_id: uuid.nullable(),
      parcela_grupo_id: uuid.nullable(),
      parcela_n: z.number().int().nullable(),
      parcela_total: z.number().int().nullable(),
      despesa_fixa_id: uuid.nullable(),
      fixa_vencimento: data.nullable(),
    }),
  ),
  orcamentos: z.array(z.object({ id: uuid, category_id: uuid, mes: z.string().regex(/^\d{4}-\d{2}$/), limite_cents: cents })),
});

export type Backup = z.infer<typeof backupSchema>;

/** Insere em lotes de 500 para não estourar o tamanho de uma requisição. */
async function inserir(supabase: SupabaseClient, tabela: Tabela, linhas: Record<string, unknown>[]) {
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from(tabela).insert(linhas.slice(i, i + 500));
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

/**
 * Restaura um backup substituindo os dados atuais do usuário.
 * Todos os ids ganham valores novos (o mesmo arquivo pode ser restaurado
 * em outra conta sem colidir com o original). Categorias com o mesmo nome
 * e tipo das já existentes são reaproveitadas.
 */
export async function restaurarBackup(supabase: SupabaseClient, userId: string, b: Backup) {
  // 1. Apaga os dados atuais (lançamentos antes de contas e recorrentes, por causa das ligações)
  for (const tabela of ["transactions", "budgets", "despesas_fixas", "accounts"] as const) {
    const { error } = await supabase.from(tabela).delete().eq("user_id", userId);
    if (error) throw new Error(`limpar ${tabela}: ${error.message}`);
  }

  const novo = new Map<string, string>();
  const id = (antigo: string | null) => {
    if (!antigo) return null;
    let n = novo.get(antigo);
    if (!n) novo.set(antigo, (n = crypto.randomUUID()));
    return n;
  };

  // 2. Categorias: reaproveita as que já existem (mesmo nome e tipo)
  const { data: existentes, error: errCat } = await supabase.from("categories").select("id, nome, tipo");
  if (errCat) throw errCat;
  const porChave = new Map((existentes ?? []).map((c) => [`${c.tipo}|${c.nome}`, c.id as string]));
  const novasCategorias: Record<string, unknown>[] = [];
  for (const c of b.categorias) {
    const atual = porChave.get(`${c.tipo}|${c.nome}`);
    if (atual) novo.set(c.id, atual);
    else novasCategorias.push({ id: id(c.id), user_id: userId, nome: c.nome, tipo: c.tipo });
  }
  await inserir(supabase, "categories", novasCategorias);

  // 3. Contas, recorrentes, lançamentos e orçamentos com os ids novos
  await inserir(
    supabase,
    "accounts",
    b.contas.map((c) => ({ ...c, id: id(c.id), user_id: userId })),
  );
  await inserir(
    supabase,
    "despesas_fixas",
    b.recorrentes.map((f) => ({ ...f, id: id(f.id), user_id: userId, category_id: id(f.category_id), account_id: id(f.account_id) })),
  );
  await inserir(
    supabase,
    "transactions",
    b.lancamentos.map((l) => ({
      ...l,
      id: id(l.id),
      user_id: userId,
      account_id: id(l.account_id),
      category_id: id(l.category_id),
      transfer_to_account_id: id(l.transfer_to_account_id),
      parcela_grupo_id: id(l.parcela_grupo_id),
      despesa_fixa_id: id(l.despesa_fixa_id),
    })),
  );
  await inserir(
    supabase,
    "budgets",
    b.orcamentos.map((o) => ({ ...o, id: id(o.id), user_id: userId, category_id: id(o.category_id), tipo: "despesa" })),
  );

  return {
    contas: b.contas.length,
    lancamentos: b.lancamentos.length,
    recorrentes: b.recorrentes.length,
    orcamentos: b.orcamentos.length,
  };
}
