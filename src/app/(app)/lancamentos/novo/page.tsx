import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehDataISO, hojeISO } from "@/lib/datas";
import { listarCategorias, listarContas } from "@/lib/financas";
import { Aviso, Carregando, Titulo, botaoPrimario } from "../../ui";
import { criarLancamento } from "../actions";
import { FormLancamento } from "../form-lancamento";

type SearchParams = Promise<{ erro?: string; data?: string }>;

export default function NovoLancamentoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Novo lançamento" subtitulo="Receita, despesa ou transferência entre suas contas" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const { erro, data } = await searchParams;
  const [contas, categorias] = await Promise.all([listarContas(supabase), listarCategorias(supabase)]);
  const ativas = contas.filter((c) => !c.arquivada);

  if (ativas.length === 0) {
    return (
      <div className="vidro flex flex-col items-start gap-4 rounded-[var(--radius-cartao)] p-6">
        <p className="text-sm text-musgo">Antes de lançar, cadastre uma conta.</p>
        <Link href="/contas/nova" className={botaoPrimario}>
          Cadastrar conta <ArrowUpRight aria-hidden size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <Aviso erro={erro} />
      <FormLancamento
        action={criarLancamento}
        contas={ativas.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias}
        hoje={data && ehDataISO(data) ? data : hojeISO()}
      />
    </>
  );
}
