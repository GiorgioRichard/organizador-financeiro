import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROTAS_PUBLICAS = ["/login", "/auth", "/offline"];

/**
 * Renova a sessão do Supabase em cada requisição e protege as rotas privadas.
 * A verificação real de dados continua nas políticas RLS do banco.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehPublica = ROTAS_PUBLICAS.some(
    (rota) =>
      request.nextUrl.pathname === rota ||
      request.nextUrl.pathname.startsWith(`${rota}/`),
  );

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Fora da proxy: arquivos estáticos e os do PWA (manifesto, service worker, ícones)
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icones/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
