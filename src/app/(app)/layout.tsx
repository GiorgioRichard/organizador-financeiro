import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { sair } from "@/app/auth/actions";
import { Rodape } from "@/components/rodape";
import { exigirUsuario } from "@/lib/auth";
import { MenuInferior, Segmentado } from "./navegacao";
import { SeletorTema } from "./seletor-tema";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Acessibilidade: pula o menu direto para o conteúdo */}
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-floresta px-4 py-2 text-sm font-medium text-sobre-floresta focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {/* Lê a URL: precisa de Suspense para não travar a pré-renderização */}
        <Suspense fallback={<div className="vidro h-11 w-44 rounded-full" />}>
          <Segmentado />
        </Suspense>
        <Suspense fallback={<div className="vidro size-12 rounded-full" />}>
          <Avatar />
        </Suspense>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6">{children}</div>
      <div className="pb-24">
        <Rodape />
      </div>
      <Suspense fallback={null}>
        <MenuInferior />
      </Suspense>
    </div>
  );
}

/** Círculo com as iniciais; abre um menu com o nome, o tema e "Sair". */
async function Avatar() {
  const { user } = await exigirUsuario();
  const email = user.email ?? "";
  const nome = typeof user.user_metadata?.nome === "string" ? user.user_metadata.nome : "";
  const base = nome || email;
  const partes = base.split(/[\s@._-]+/).filter(Boolean);
  const iniciais = (partes.length > 1 ? partes[0][0] + partes[1][0] : base.slice(0, 2)).toUpperCase();

  return (
    <details className="relative">
      <summary
        aria-label={`Conta de ${nome || email}`}
        className="grid size-12 cursor-pointer list-none place-items-center rounded-full border-2 border-superficie bg-floresta text-sm font-semibold text-sobre-floresta shadow-[0_6px_16px_-6px_rgb(15_59_51/0.5)] [&::-webkit-details-marker]:hidden"
      >
        {iniciais}
      </summary>
      <div className="cartao-branco absolute right-0 z-30 mt-2 w-72 rounded-2xl bg-superficie p-4">
        <p className="text-xs text-musgo">Conectado como</p>
        {nome && <p className="truncate text-sm font-medium">{nome}</p>}
        <p className={`truncate ${nome ? "text-xs text-musgo" : "text-sm font-medium"}`}>{email}</p>
        <div className="mt-4">
          <SeletorTema />
        </div>
        <Link
          href="/conta/senha"
          className="mt-3 flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm hover:bg-tinta/5"
        >
          <KeyRound aria-hidden size={16} /> Alterar senha
        </Link>
        <form action={sair} className="mt-2">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-floresta px-4 text-sm font-medium text-sobre-floresta hover:bg-floresta-2"
          >
            <LogOut aria-hidden size={16} /> Sair
          </button>
        </form>
      </div>
    </details>
  );
}
