"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credenciaisSchema = z.object({
  email: z.email({ message: "E-mail inválido" }).max(254),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72),
});

function lerCredenciais(formData: FormData) {
  const resultado = credenciaisSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    senha: String(formData.get("senha") ?? ""),
  });
  if (!resultado.success) return resultado;
  return {
    success: true as const,
    data: { email: resultado.data.email, password: resultado.data.senha },
  };
}

function voltarComErro(modo: "entrar" | "cadastrar", erro: string): never {
  redirect(`/login?modo=${modo}&erro=${encodeURIComponent(erro)}`);
}

export async function entrar(formData: FormData) {
  const resultado = lerCredenciais(formData);
  if (!resultado.success) {
    voltarComErro("entrar", resultado.error.issues[0].message);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(resultado.data);
  if (error) {
    // Mensagem genérica para não revelar se o e-mail existe
    voltarComErro("entrar", "E-mail ou senha incorretos");
  }

  redirect("/dashboard");
}

export async function cadastrar(formData: FormData) {
  const resultado = lerCredenciais(formData);
  if (!resultado.success) {
    voltarComErro("cadastrar", resultado.error.issues[0].message);
  }
  const nome = z
    .string()
    .trim()
    .min(1, "Diga como quer ser chamado")
    .max(60, "Nome muito longo")
    .safeParse(String(formData.get("nome") ?? ""));
  if (!nome.success) voltarComErro("cadastrar", nome.error.issues[0].message);
  if (formData.get("confirmacao") !== formData.get("senha")) {
    voltarComErro("cadastrar", "As senhas não conferem");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...resultado.data,
    options: { data: { nome: nome.data } },
  });
  if (error) {
    voltarComErro("cadastrar", "Não foi possível criar a conta. Tente novamente.");
  }

  // Com confirmação de e-mail ativa, a sessão só existe após confirmar.
  if (!data.session) {
    redirect("/login?modo=entrar&confirmar=1");
  }

  redirect("/dashboard");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
