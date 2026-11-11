"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { falha, type EstadoForm } from "@/lib/formulario";
import { parseBRLToCents, parseSaldoToCents } from "@/lib/money";

const dia = z.coerce
  .number({ message: "Informe um dia de 1 a 31" })
  .int("Informe um dia de 1 a 31")
  .min(1, "Informe um dia de 1 a 31")
  .max(31, "Informe um dia de 1 a 31");

const contaSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.enum(["corrente", "poupanca", "carteira"]),
    nome: z.string().trim().min(1, "Dê um nome à conta").max(60, "Nome muito longo"),
    saldo: z.string(),
  }),
  z.object({
    tipo: z.literal("cartao"),
    nome: z.string().trim().min(1, "Dê um nome ao cartão").max(60, "Nome muito longo"),
    dia_fechamento: dia,
    dia_vencimento: dia,
    limite: z.string(),
  }),
]);

type Linha = {
  nome: string;
  tipo: string;
  saldo_inicial_cents: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  limite_cents: number | null;
};

/** Lê o formulário. Devolve a linha para o banco ou a mensagem de erro. */
function lerConta(formData: FormData): { linha: Linha } | { erro: string } {
  const entrada = Object.fromEntries(
    ["tipo", "nome", "saldo", "dia_fechamento", "dia_vencimento", "limite"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const r = contaSchema.safeParse(entrada);
  if (!r.success) return { erro: r.error.issues[0].message };
  const c = r.data;

  if (c.tipo === "cartao") {
    let limite_cents: number | null = null;
    if (c.limite.trim() !== "") {
      limite_cents = parseBRLToCents(c.limite);
      if (limite_cents === null) return { erro: "Limite inválido" };
    }
    return {
      linha: {
        nome: c.nome,
        tipo: c.tipo,
        saldo_inicial_cents: 0,
        dia_fechamento: c.dia_fechamento,
        dia_vencimento: c.dia_vencimento,
        limite_cents,
      },
    };
  }

  const saldo = parseSaldoToCents(c.saldo);
  if (saldo === null) return { erro: "Saldo inicial inválido" };
  return {
    linha: {
      nome: c.nome,
      tipo: c.tipo,
      saldo_inicial_cents: saldo,
      dia_fechamento: null,
      dia_vencimento: null,
      limite_cents: null,
    },
  };
}

export async function criarConta(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const lido = lerConta(formData);
  if ("erro" in lido) return falha(formData, lido.erro);

  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase.from("accounts").insert({ ...lido.linha, user_id: user.id });
  if (error) return falha(formData, "Não foi possível salvar a conta. Tente de novo.");

  redirect(`/contas?ok=${encodeURIComponent("Conta criada.")}`);
}

const idSchema = z.uuid();

export async function editarConta(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return falha(formData, "Conta não encontrada.");

  const lido = lerConta(formData);
  if ("erro" in lido) return falha(formData, lido.erro);

  const { supabase } = await exigirUsuario();
  // O tipo não muda depois de criada: trocar cartão por conta mudaria o
  // sentido dos lançamentos já feitos.
  const { tipo, ...campos } = lido.linha;
  const { data, error } = await supabase
    .from("accounts")
    .update(campos)
    .eq("tipo", tipo)
    .eq("id", id.data)
    .select("id");
  if (error || data.length === 0) return falha(formData, "Não foi possível salvar a conta.");

  redirect(`/contas?ok=${encodeURIComponent("Conta atualizada.")}`);
}

export async function alternarArquivada(formData: FormData) {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const arquivar = formData.get("arquivar") === "1";

  const { supabase } = await exigirUsuario();
  await supabase.from("accounts").update({ arquivada: arquivar }).eq("id", id.data);
  refresh();
}
