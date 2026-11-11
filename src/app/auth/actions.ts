"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { falha, type EstadoForm } from "@/lib/formulario";
import { createClient } from "@/lib/supabase/server";

const email = z.email({ message: "E-mail inválido" }).max(254);
const senha = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72, "Senha muito longa");

const lerEmail = (formData: FormData) => String(formData.get("email") ?? "").trim().toLowerCase();

export async function entrar(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = z.object({ email, senha }).safeParse({ email: lerEmail(formData), senha: formData.get("senha") ?? "" });
  if (!r.success) return falha(formData, r.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.senha });
  // Mensagem genérica para não revelar se o e-mail existe
  if (error) return falha(formData, "E-mail ou senha incorretos");

  redirect("/dashboard");
}

export async function cadastrar(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = z
    .object({
      nome: z.string().trim().min(1, "Diga como quer ser chamado").max(60, "Nome muito longo"),
      email,
      senha,
    })
    .safeParse({ nome: formData.get("nome") ?? "", email: lerEmail(formData), senha: formData.get("senha") ?? "" });
  if (!r.success) return falha(formData, r.error.issues[0].message);
  if (formData.get("confirmacao") !== r.data.senha) return falha(formData, "As senhas não conferem");

  // Na nuvem o Supabase confirma o e-mail: o link volta para /auth/confirmar,
  // que cria a sessão e leva ao painel.
  const origem = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: r.data.email,
    password: r.data.senha,
    options: { data: { nome: r.data.nome }, emailRedirectTo: `${origem}/auth/confirmar?proximo=/dashboard` },
  });
  if (error) return falha(formData, "Não foi possível criar a conta. Tente novamente.");

  // Com confirmação de e-mail ativa, a sessão só existe após confirmar.
  if (!data.session) redirect("/login?modo=entrar&confirmar=1");
  redirect("/dashboard");
}

/**
 * Envia o e-mail de recuperação. A resposta é a mesma exista ou não a
 * conta, para não revelar quais e-mails estão cadastrados.
 */
export async function recuperarSenha(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = email.safeParse(lerEmail(formData));
  if (!r.success) return falha(formData, r.error.issues[0].message);

  const origem = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(r.data, {
    redirectTo: `${origem}/auth/confirmar?proximo=/conta/senha`,
  });
  redirect("/login?modo=entrar&enviado=1");
}

/** Troca a senha de quem está logado (inclusive vindo do link de recuperação). */
export async function definirSenha(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = senha.safeParse(formData.get("senha") ?? "");
  if (!r.success) return falha(formData, r.error.issues[0].message);
  if (formData.get("confirmacao") !== r.data) return falha(formData, "As senhas não conferem");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: r.data });
  if (error) {
    return falha(
      formData,
      error.code === "same_password" ? "A nova senha precisa ser diferente da atual" : "Não foi possível trocar a senha.",
    );
  }
  redirect("/conta/senha?ok=1");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
