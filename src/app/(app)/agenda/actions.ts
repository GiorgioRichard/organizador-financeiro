"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { ehDataISO } from "@/lib/datas";
import { ocorrenciasDoAno, type DespesaFixa } from "@/lib/fixas";
import { parseBRLToCents } from "@/lib/money";

const fixaSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome à despesa").max(60, "Nome muito longo"),
  valor: z.string(),
  mes: z.coerce.number().int().min(1, "Escolha o mês").max(12, "Escolha o mês"),
  dia: z.coerce.number({ message: "Informe o dia" }).int().min(1, "Dia de 1 a 31").max(31, "Dia de 1 a 31"),
  parcelas: z.coerce.number().int().min(1, "Parcelas de 1 a 12").max(12, "Parcelas de 1 a 12"),
  account_id: z.uuid("Escolha a conta"),
  category_id: z.uuid("Escolha a categoria"),
});

function voltar(erro: string): never {
  redirect(`/agenda/fixas?erro=${encodeURIComponent(erro)}`);
}

export async function criarFixa(formData: FormData) {
  const entrada = Object.fromEntries(
    ["nome", "valor", "mes", "dia", "parcelas", "account_id", "category_id"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  if (entrada.parcelas === "") entrada.parcelas = "1";
  const r = fixaSchema.safeParse(entrada);
  if (!r.success) voltar(r.error.issues[0].message);

  const valor_cents = parseBRLToCents(r.data.valor);
  if (valor_cents === null) voltar("Valor inválido");

  const { supabase, user } = await exigirUsuario();
  const { valor: _valor, ...campos } = r.data;
  void _valor;
  const { error } = await supabase.from("despesas_fixas").insert({ ...campos, valor_cents, user_id: user.id });
  if (error) voltar("Não foi possível salvar a despesa fixa.");

  redirect(`/agenda/fixas?ok=${encodeURIComponent(`${r.data.nome} cadastrada.`)}`);
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
    .select("id, nome, valor_cents, category_id, account_id, mes, dia, parcelas, ativa")
    .eq("id", id.data)
    .maybeSingle<DespesaFixa>();
  if (!fixa) com("erro", "Despesa fixa não encontrada");

  const ano = Number(vencimento.slice(0, 4));
  const ocorrencia = [...ocorrenciasDoAno(fixa, ano), ...ocorrenciasDoAno(fixa, ano - 1)].find(
    (o) => o.vencimento === vencimento,
  );
  if (!ocorrencia) com("erro", "Essa data não é uma parcela");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    tipo: "despesa",
    descricao: ocorrencia.parcelas > 1 ? `${fixa.nome} (${ocorrencia.parcela}/${ocorrencia.parcelas})` : fixa.nome,
    valor_cents: ocorrencia.valor_cents,
    data: vencimento,
    account_id: fixa.account_id,
    category_id: fixa.category_id,
    despesa_fixa_id: fixa.id,
    fixa_vencimento: vencimento,
  });
  if (error) {
    com("erro", error.code === "23505" ? "Essa parcela já está paga" : "Não foi possível registrar o pagamento");
  }
  com("ok", `${fixa.nome} marcada como paga.`);
}
