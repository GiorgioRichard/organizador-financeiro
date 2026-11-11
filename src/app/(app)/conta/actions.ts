"use server";

import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { backupSchema, restaurarBackup } from "@/lib/backup";
import { type EstadoForm } from "@/lib/formulario";

const erro = (texto: string): EstadoForm => ({ erro: texto, versao: Date.now() });

/** Restaura um backup JSON, substituindo os dados atuais do usuário. */
export async function restaurar(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  if (formData.get("confirmo") !== "sim") return erro("Marque a confirmação de que os dados atuais serão substituídos.");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return erro("Escolha o arquivo de backup (.json).");
  if (arquivo.size > 4 * 1024 * 1024) return erro("Arquivo maior que 4 MB.");

  let json: unknown;
  try {
    json = JSON.parse(await arquivo.text());
  } catch {
    return erro("O arquivo não é um JSON válido.");
  }
  // Valida tudo antes de apagar qualquer coisa
  const r = backupSchema.safeParse(json);
  if (!r.success) {
    const p = r.error.issues[0];
    return erro(`Backup inválido: ${p.message}${p.path.length ? ` (em ${p.path.join(".")})` : ""}`);
  }

  const { supabase, user } = await exigirUsuario();
  let total;
  try {
    total = await restaurarBackup(supabase, user.id, r.data);
  } catch (e) {
    return erro(`A restauração parou no meio: ${(e as Error).message}. Seus dados podem estar incompletos; tente de novo com o mesmo arquivo.`);
  }
  redirect(
    `/conta?ok=${encodeURIComponent(
      `Backup restaurado: ${total.contas} contas, ${total.lancamentos} lançamentos, ${total.recorrentes} recorrentes e ${total.orcamentos} limites.`,
    )}`,
  );
}
