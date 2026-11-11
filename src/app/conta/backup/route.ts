import { exigirUsuario } from "@/lib/auth";
import { montarBackup } from "@/lib/backup";
import { hojeISO } from "@/lib/datas";

/** GET /conta/backup: baixa todos os dados do usuário em JSON. */
export async function GET() {
  const { supabase, user } = await exigirUsuario();
  const backup = await montarBackup(supabase, user.email ?? "");
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="organizador-backup-${hojeISO()}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
