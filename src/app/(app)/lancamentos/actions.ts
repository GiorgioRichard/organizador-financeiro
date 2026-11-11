"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { ehDataISO, mesDe, somarMeses } from "@/lib/datas";
import { falha, type EstadoForm } from "@/lib/formulario";
import { parseBRLToCents, splitCents } from "@/lib/money";

const comum = {
  descricao: z.string().trim().min(1, "Descreva o lançamento").max(120, "Descrição muito longa"),
  valor: z.string(),
  data: z.string().refine(ehDataISO, "Data inválida"),
  account_id: z.uuid("Escolha a conta"),
};

const lancamentoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("receita"),
    ...comum,
    category_id: z.uuid("Escolha a categoria"),
  }),
  z.object({
    tipo: z.literal("despesa"),
    ...comum,
    category_id: z.uuid("Escolha a categoria"),
    parcelas: z.coerce
      .number()
      .int("Número de parcelas inválido")
      .min(1, "Número de parcelas inválido")
      .max(120, "No máximo 120 parcelas"),
  }),
  z.object({
    tipo: z.literal("transferencia"),
    ...comum,
    transfer_to_account_id: z.uuid("Escolha a conta de destino"),
  }),
], { error: "Escolha se é despesa, receita ou transferência" });

type Lido = z.infer<typeof lancamentoSchema> & { valor_cents: number };

/** Valida o formulário. Devolve os dados ou a mensagem de erro. */
function ler(formData: FormData): Lido | string {
  const entrada = Object.fromEntries(
    ["tipo", "descricao", "valor", "data", "account_id", "category_id", "transfer_to_account_id", "parcelas"].map(
      (k) => [k, String(formData.get(k) ?? "")],
    ),
  );
  if (entrada.parcelas === "") entrada.parcelas = "1";

  const r = lancamentoSchema.safeParse(entrada);
  if (!r.success) return r.error.issues[0].message;

  const valor_cents = parseBRLToCents(r.data.valor);
  if (valor_cents === null) return "Valor inválido. Use, por exemplo, 150,90";

  if (r.data.tipo === "transferencia" && r.data.transfer_to_account_id === r.data.account_id) {
    return "Origem e destino precisam ser contas diferentes";
  }
  return { ...r.data, valor_cents };
}

function camposComuns(l: Lido) {
  return {
    descricao: l.descricao,
    account_id: l.account_id,
    category_id: l.tipo === "transferencia" ? null : l.category_id,
    transfer_to_account_id: l.tipo === "transferencia" ? l.transfer_to_account_id : null,
  };
}

export async function criarLancamento(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const l = ler(formData);
  if (typeof l === "string") return falha(formData, l);

  const { supabase, user } = await exigirUsuario();
  const base = { user_id: user.id, tipo: l.tipo, ...camposComuns(l) };

  type Linha = typeof base & {
    valor_cents: number;
    data: string;
    parcela_grupo_id?: string;
    parcela_n?: number;
    parcela_total?: number;
  };
  let linhas: Linha[];
  if (l.tipo === "despesa" && l.parcelas > 1) {
    // Cada parcela cai no mesmo dia dos meses seguintes; a sobra de
    // centavos vai para a última. Um único insert grava todas ou nenhuma.
    const grupo = crypto.randomUUID();
    linhas = splitCents(l.valor_cents, l.parcelas).map((v, i) => ({
      ...base,
      valor_cents: v,
      data: somarMeses(l.data, i),
      parcela_grupo_id: grupo,
      parcela_n: i + 1,
      parcela_total: l.parcelas,
    }));
  } else {
    linhas = [{ ...base, valor_cents: l.valor_cents, data: l.data }];
  }

  const { error } = await supabase.from("transactions").insert(linhas);
  if (error) return falha(formData, "Não foi possível salvar o lançamento. Tente de novo.");

  const ok = linhas.length > 1 ? `${linhas.length} parcelas lançadas.` : "Lançamento salvo.";
  redirect(`/lancamentos?mes=${mesDe(l.data)}&ok=${encodeURIComponent(ok)}`);
}

/**
 * Edita um lançamento. O tipo não muda (mudaria o sentido do saldo);
 * numa compra parcelada, só esta parcela é alterada.
 */
export async function editarLancamento(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return falha(formData, "Lançamento não encontrado");

  const l = ler(formData);
  if (typeof l === "string") return falha(formData, l);

  const { supabase } = await exigirUsuario();
  const { data, error } = await supabase
    .from("transactions")
    .update({ ...camposComuns(l), valor_cents: l.valor_cents, data: l.data })
    .eq("id", id.data)
    .eq("tipo", l.tipo)
    .select("id");
  if (error || !data?.length) return falha(formData, "Não foi possível salvar as alterações.");

  redirect(`/lancamentos?mes=${mesDe(l.data)}&ok=${encodeURIComponent("Lançamento atualizado.")}`);
}

export async function excluirLancamento(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const todasParcelas = formData.get("grupo") === "1";

  const { supabase } = await exigirUsuario();
  if (todasParcelas) {
    const { data } = await supabase
      .from("transactions")
      .select("parcela_grupo_id")
      .eq("id", id.data)
      .maybeSingle();
    if (data?.parcela_grupo_id) {
      await supabase.from("transactions").delete().eq("parcela_grupo_id", data.parcela_grupo_id);
      refresh();
      return;
    }
  }
  await supabase.from("transactions").delete().eq("id", id.data);
  refresh();
}
