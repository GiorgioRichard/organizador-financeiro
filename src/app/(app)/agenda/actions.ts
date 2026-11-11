"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { ehDataISO } from "@/lib/datas";
import { ocorrenciaEm, type DespesaFixa } from "@/lib/fixas";
import { falha, type EstadoForm } from "@/lib/formulario";
import { parseBRLToCents } from "@/lib/money";

const fixaSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome").max(60, "Nome muito longo"),
  tipo: z.enum(["despesa", "receita"], { message: "Escolha despesa ou receita" }),
  frequencia: z.enum(["mensal", "anual"], { message: "Escolha a frequência" }),
  valor: z.string(),
  mes: z.coerce.number().int().min(1, "Escolha o mês").max(12, "Escolha o mês"),
  dia: z.coerce.number({ message: "Informe o dia" }).int().min(1, "Dia de 1 a 31").max(31, "Dia de 1 a 31"),
  parcelas: z.coerce.number().int().min(1, "Parcelas de 1 a 12").max(12, "Parcelas de 1 a 12"),
  desde: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Escolha o mês de início"),
  account_id: z.uuid("Escolha a conta"),
  category_id: z.uuid("Escolha a categoria"),
});

export async function criarFixa(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const entrada = Object.fromEntries(
    ["nome", "tipo", "frequencia", "valor", "mes", "dia", "parcelas", "desde", "account_id", "category_id"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  // Campos que só existem numa das frequências recebem um valor neutro
  if (entrada.frequencia === "mensal") {
    entrada.parcelas = "1";
    entrada.mes = entrada.desde.slice(5, 7) || "1";
  } else {
    entrada.desde = entrada.desde || new Date().toISOString().slice(0, 7);
    entrada.parcelas ||= "1";
  }
  const r = fixaSchema.safeParse(entrada);
  if (!r.success) return falha(formData, r.error.issues[0].message);

  const valor_cents = parseBRLToCents(r.data.valor);
  if (valor_cents === null) return falha(formData, "Valor inválido. Use, por exemplo, 1.200,00");

  const { supabase, user } = await exigirUsuario();
  const { valor: _valor, desde, ...campos } = r.data;
  void _valor;
  const { error } = await supabase
    .from("despesas_fixas")
    .insert({ ...campos, valor_cents, desde: `${desde}-01`, user_id: user.id });
  if (error) return falha(formData, "Não foi possível salvar. Confira a categoria e tente de novo.");

  redirect(`/agenda/fixas?ok=${encodeURIComponent(`Cadastro salvo: ${r.data.nome}.`)}`);
}

export async function alternarFixa(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const { supabase } = await exigirUsuario();
  await supabase.from("despesas_fixas").update({ ativa: formData.get("ativar") === "1" }).eq("id", id.data);
  refresh();
}

export async function excluirFixa(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const { supabase } = await exigirUsuario();
  // Lançamentos já pagos continuam no extrato (a ligação vira nula).
  await supabase.from("despesas_fixas").delete().eq("id", id.data);
  refresh();
}

/**
 * Paga uma parcela: confere que a data é mesmo uma parcela da despesa
 * e cria o lançamento com o valor e a data de vencimento dela.
 */
export async function pagarParcela(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("fixa_id"));
  const vencimento = String(formData.get("vencimento") ?? "");
  // Volta para a tela de onde veio (só dentro de /agenda), sem avisos antigos.
  const url = new URL(String(formData.get("volta") ?? "/agenda"), "http://local");
  if (!url.pathname.startsWith("/agenda")) url.pathname = "/agenda";
  url.searchParams.delete("ok");
  url.searchParams.delete("erro");
  const com: (chave: "ok" | "erro", texto: string) => never = (chave, texto) => {
    url.searchParams.set(chave, texto);
    redirect(`${url.pathname}${url.search}`);
  };
  if (!id.success || !ehDataISO(vencimento)) com("erro", "Parcela inválida");

  const { supabase, user } = await exigirUsuario();
  const { data: fixa } = await supabase
    .from("despesas_fixas")
    .select("id, nome, tipo, frequencia, desde, valor_cents, category_id, account_id, mes, dia, parcelas, ativa")
    .eq("id", id.data)
    .maybeSingle<DespesaFixa>();
  if (!fixa) com("erro", "Despesa fixa não encontrada");

  const ocorrencia = ocorrenciaEm(fixa, vencimento);
  if (!ocorrencia) com("erro", "Essa data não é uma parcela");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    tipo: fixa.tipo,
    descricao: ocorrencia.parcelas > 1 ? `${fixa.nome} (${ocorrencia.parcela}/${ocorrencia.parcelas})` : fixa.nome,
    valor_cents: ocorrencia.valor_cents,
    data: vencimento,
    account_id: fixa.account_id,
    category_id: fixa.category_id,
    despesa_fixa_id: fixa.id,
    fixa_vencimento: vencimento,
  });
  if (error) {
    com("erro", error.code === "23505" ? "Essa ocorrência já foi registrada" : "Não foi possível registrar o pagamento");
  }
  com("ok", `${fixa.tipo === "receita" ? "Recebimento" : "Pagamento"} registrado: ${fixa.nome}.`);
}
