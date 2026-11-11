import { Suspense } from "react";
import Link from "next/link";
import { Entrada } from "@/components/entrada";
import { FormAcesso } from "@/components/form-acesso";
import { Aviso, Titulo, botaoPrimario } from "../../ui";

type SearchParams = Promise<{ ok?: string }>;

export default function SenhaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Nova senha" subtitulo="Escolha uma senha com pelo menos 8 caracteres" />
      <Suspense fallback={null}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { ok } = await searchParams;
  if (ok) {
    return (
      <Entrada className="flex flex-col items-start gap-4">
        <Aviso ok="Senha alterada. Use a nova senha no próximo acesso." />
        <Link href="/dashboard" className={botaoPrimario}>
          Ir para o painel
        </Link>
      </Entrada>
    );
  }
  return (
    <Entrada className="flex flex-col gap-4">
      <FormAcesso modo="nova-senha" />
    </Entrada>
  );
}
