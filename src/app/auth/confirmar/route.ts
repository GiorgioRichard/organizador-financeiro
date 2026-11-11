import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links enviados por e-mail (recuperar senha, confirmar
 * cadastro). Troca o código do link por uma sessão e segue para
 * `proximo` (só caminhos internos, para não virar redirecionador aberto).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const proximoBruto = searchParams.get("proximo") ?? "/dashboard";
  const proximo = proximoBruto.startsWith("/") && !proximoBruto.startsWith("//") ? proximoBruto : "/dashboard";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { error: new Error("link sem código") };

  if (error) {
    const msg = "Este link expirou ou já foi usado. Peça um novo.";
    return NextResponse.redirect(new URL(`/login?modo=recuperar&erro=${encodeURIComponent(msg)}`, origin));
  }
  return NextResponse.redirect(new URL(proximo, origin));
}
