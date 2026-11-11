import { Suspense } from "react";
import Link from "next/link";
import { FormAcesso, type ModoAcesso } from "@/components/form-acesso";
import { Rodape } from "@/components/rodape";

type SearchParams = Promise<{ modo?: string; erro?: string; confirmar?: string; enviado?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Suspense fallback={<div className="vidro h-96 animate-pulse rounded-[var(--radius-cartao)]" />}>
        <FormularioLogin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const TEXTOS: Record<Exclude<ModoAcesso, "nova-senha">, [string, string]> = {
  entrar: ["Bem-vindo de volta!", "Entre para ver o resumo das suas contas"],
  cadastrar: ["Comece a organizar suas finanças", "Crie sua conta em segundos"],
  recuperar: ["Esqueceu a senha?", "Informe seu e-mail e enviaremos um link para criar uma nova"],
};

async function FormularioLogin({ searchParams }: { searchParams: SearchParams }) {
  const { modo: bruto, erro, confirmar, enviado } = await searchParams;
  const modo: Exclude<ModoAcesso, "nova-senha"> = bruto === "cadastrar" || bruto === "recuperar" ? bruto : "entrar";
  const [titulo, subtitulo] = TEXTOS[modo];

  return (
    <>
      <nav aria-label="Acesso" className="vidro flex self-start rounded-full p-1">
        {[
          { href: "/login?modo=entrar", rotulo: "Entrar", ativo: modo !== "cadastrar" },
          { href: "/login?modo=cadastrar", rotulo: "Criar conta", ativo: modo === "cadastrar" },
        ].map((aba) => (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={aba.ativo ? "page" : undefined}
            className={
              aba.ativo
                ? "sombra-suave rounded-full bg-superficie px-4 py-1.5 text-sm font-medium"
                : "rounded-full px-4 py-1.5 text-sm text-musgo hover:text-tinta"
            }
          >
            {aba.rotulo}
          </Link>
        ))}
      </nav>

      <header>
        <h1 className="text-[2rem] font-medium leading-tight tracking-[-0.035em]">{titulo}</h1>
        <p className="mt-1 text-sm text-musgo">{subtitulo}</p>
      </header>

      {(confirmar || enviado) && (
        <p role="status" className="rounded-2xl border border-superficie bg-menta/60 px-4 py-3 text-sm text-floresta">
          {enviado
            ? "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha."
            : "Enviamos um e-mail de confirmação. Confirme e depois entre."}
        </p>
      )}

      {erro && (
        <p role="alert" className="rounded-2xl border border-superficie bg-despesa-suave px-4 py-3 text-sm text-despesa">
          {erro}
        </p>
      )}

      {/* key: troca de modo começa com o formulário limpo */}
      <FormAcesso key={modo} modo={modo} />

      {modo === "entrar" && (
        <Link href="/login?modo=recuperar" className="inline-flex min-h-11 items-center self-center text-sm underline underline-offset-4">
          Esqueci minha senha
        </Link>
      )}
      {modo === "recuperar" && (
        <Link href="/login?modo=entrar" className="inline-flex min-h-11 items-center self-center text-sm underline underline-offset-4">
          Voltar para entrar
        </Link>
      )}

      <Rodape />
    </>
  );
}
