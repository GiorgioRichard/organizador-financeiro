import { Suspense } from "react";
import { Aviso, Titulo } from "../../ui";
import { criarConta } from "../actions";
import { FormConta } from "../form-conta";

type SearchParams = Promise<{ erro?: string }>;

export default function NovaContaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Nova conta" subtitulo="Conta corrente, poupança, carteira ou cartão de crédito" />
      <Suspense fallback={null}>
        <Erro searchParams={searchParams} />
      </Suspense>
      <FormConta action={criarConta} />
    </main>
  );
}

async function Erro({ searchParams }: { searchParams: SearchParams }) {
  const { erro } = await searchParams;
  return <Aviso erro={erro} />;
}
