"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { ehMes } from "@/lib/datas";
import { parseBRLToCents } from "@/lib/money";

function volta(caminho: string, chave: "ok" | "erro", texto: string): never {
  const sep = caminho.includes("?") ? "&" : "?";
  redirect(`${caminho}${sep}${chave}=${encodeURIComponent(texto)}`);
}

/**
 * Define o limite mensal de uma categoria a partir de `mes` (vale para
 * os meses seguintes até ser trocado). Campo vazio remove o limite.
 */
export async function definirLimite(formData: FormData) {
  const categoria = z.uuid().safeParse(formData.get("category_id"));
  const mes = String(formData.get("mes") ?? "");
  const destino = `/orcamento?mes=${ehMes(mes) ? mes : ""}`;
  if (!categoria.success || !ehMes(mes)) volta("/orcamento", "erro", "Categoria inválida");

  const { supabase, user } = await exigirUsuario();
  const texto = String(formData.get("limite") ?? "").trim();

  if (texto === "") {
    await supabase.from("budgets").delete().eq("category_id", categoria.data);
    volta(destino, "ok", "Limite removido.");
  }

  const limite_cents = parseBRLToCents(texto);
  if (limite_cents === null) volta(destino, "erro", "Limite inválido. Use, por exemplo, 800,00");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoria.data, mes, limite_cents, tipo: "despesa" },
      { onConflict: "user_id,category_id,mes" },
    );
  if (error) volta(destino, "erro", "Não foi possível salvar o limite.");
  volta(destino, "ok", "Limite salvo.");
}

const nomeSchema = z.string().trim().min(1, "Dê um nome à categoria").max(40, "Nome muito longo");

export async function criarCategoria(formData: FormData) {
  const nome = nomeSchema.safeParse(formData.get("nome"));
  const tipo = z.enum(["receita", "despesa"]).safeParse(formData.get("tipo"));
  if (!nome.success) volta("/orcamento/categorias", "erro", nome.error.issues[0].message);
  if (!tipo.success) volta("/orcamento/categorias", "erro", "Escolha receita ou despesa");

  const { supabase, user } = await exigirUsuario();
  const { error } = await supabase.from("categories").insert({ user_id: user.id, nome: nome.data, tipo: tipo.data });
  if (error) {
    volta("/orcamento/categorias", "erro", error.code === "23505" ? "Já existe uma categoria com esse nome" : "Não foi possível criar.");
  }
  volta("/orcamento/categorias", "ok", `${nome.data} criada.`);
}

export async function renomearCategoria(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  const nome = nomeSchema.safeParse(formData.get("nome"));
  if (!id.success) volta("/orcamento/categorias", "erro", "Categoria inválida");
  if (!nome.success) volta("/orcamento/categorias", "erro", nome.error.issues[0].message);

  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("categories").update({ nome: nome.data }).eq("id", id.data);
  if (error) {
    volta("/orcamento/categorias", "erro", error.code === "23505" ? "Já existe uma categoria com esse nome" : "Não foi possível renomear.");
  }
  refresh();
}

export async function excluirCategoria(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.from("categories").delete().eq("id", id.data);
  if (error) {
    // 23503: a categoria ainda é usada por lançamentos ou recorrências
    volta(
      "/orcamento/categorias",
      "erro",
      error.code === "23503"
        ? "Essa categoria está em uso por lançamentos ou recorrências. Troque a categoria deles antes de excluir."
        : "Não foi possível excluir.",
    );
  }
  volta("/orcamento/categorias", "ok", "Categoria excluída.");
}
