import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Cliente Supabase e usuário atual para telas e ações privadas.
 * A proxy já protege as rotas; esta é a segunda barreira. Sem sessão,
 * manda para o login. `cache` faz o layout e a página dividirem a mesma
 * consulta dentro de uma requisição.
 */
export const exigirUsuario = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});
