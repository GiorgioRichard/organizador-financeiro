import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { entrar, cadastrar } from "@/app/auth/actions";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoSenha } from "@/components/campo-senha";
import { Rodape } from "@/components/rodape";

type SearchParams = Promise<{ modo?: string; erro?: string; confirmar?: string }>;

const campo =
  "w-full rounded-2xl border border-superficie bg-superficie/80 px-4 py-3 text-[15px] text-tinta placeholder:text-musgo/60 focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-floresta/40";

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Suspense fallback={<div className="vidro h-96 animate-pulse rounded-[var(--radius-cartao)]" />}>
        <FormularioLogin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FormularioLogin({ searchParams }: { searchParams: SearchParams }) {
  const { modo, erro, confirmar } = await searchParams;
  const cadastrando = modo === "cadastrar";

  return (
    <>
      <nav aria-label="Acesso" className="vidro flex self-start rounded-full p-1">
        {[
          { href: "/login?modo=entrar", rotulo: "Entrar", ativo: !cadastrando },
          { href: "/login?modo=cadastrar", rotulo: "Criar conta", ativo: cadastrando },
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
        <h1 className="text-[2rem] font-medium leading-tight tracking-[-0.035em]">
          {cadastrando ? "Comece a organizar suas finanças" : "Bem-vindo de volta!"}
        </h1>
        <p className="mt-1 text-sm text-musgo">
          {cadastrando ? "Crie sua conta em segundos" : "Entre para ver o resumo das suas contas"}
        </p>
      </header>

      {confirmar && (
        <p role="status" className="rounded-2xl border border-superficie bg-menta/60 px-4 py-3 text-sm text-floresta">
          Enviamos um e-mail de confirmação. Confirme e depois entre.
        </p>
      )}

      {erro && (
        <p role="alert" className="rounded-2xl border border-superficie bg-despesa-suave px-4 py-3 text-sm text-despesa">
          {erro}
        </p>
      )}

      <form
        action={cadastrando ? cadastrar : entrar}
        className="cartao-branco flex flex-col gap-4 rounded-[var(--radius-cartao)] p-5"
      >
        {cadastrando && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Como quer ser chamado
            <input name="nome" autoComplete="given-name" required maxLength={60} className={campo} />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={254} className={campo} />
        </label>

        <CampoSenha
          name="senha"
          rotulo="Senha"
          autoComplete={cadastrando ? "new-password" : "current-password"}
          className={campo}
          dica={cadastrando ? "Mínimo de 8 caracteres." : undefined}
        />

        {cadastrando && (
          <CampoSenha name="confirmacao" rotulo="Confirme a senha" autoComplete="new-password" className={campo} />
        )}

        <BotaoEnviar
          pendente={cadastrando ? "Criando conta…" : "Entrando…"}
          className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-floresta px-5 text-sm font-medium text-sobre-floresta hover:bg-floresta-2"
        >
          {cadastrando ? "Criar conta" : "Entrar"} <ArrowUpRight aria-hidden size={16} />
        </BotaoEnviar>
      </form>

      <Rodape />
    </>
  );
}
