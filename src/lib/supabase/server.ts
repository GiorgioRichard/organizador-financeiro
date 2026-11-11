import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers. */
export async function createClient() {
  // O Supabase confere a validade do token com Date.now(). Com cacheComponents
  // e partialPrefetching, isso quebraria a pré-renderização; connection()
  // adia o uso do cliente para o momento da requisição.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de Server Component: a proxy renova a sessão.
          }
        },
      },
    },
  );
}
