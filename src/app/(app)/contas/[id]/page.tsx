import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { buscarConta } from "@/lib/financas";
import { formatCents } from "@/lib/money";
import { Aviso, Carregando, Titulo } from "../../ui";
import { editarConta } from "../actions";
import { FormConta } from "../form-conta";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default function EditarContaPage(props: Props) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Suspense fallback={<Carregando />}>
        <Conteudo {...props} />
      </Suspense>
    </main>
  );
}

/** Centavos no formato do campo: 123456 -> "1234,56". */
function paraCampo(cents: number): string {
  return formatCents(cents).replace(/[^\d,-]/g, "");
}

async function Conteudo({ params, searchParams }: Props) {
  const { supabase } = await exigirUsuario();
  const { id } = await params;
  const { erro } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const conta = await buscarConta(supabase, id);
  if (!conta) notFound();

  return (
    <Entrada className="flex flex-col gap-5">
      <Titulo titulo={conta.nome} subtitulo="Editar conta" />
      <Aviso erro={erro} />
      <FormConta
        action={editarConta}
        conta={{
          id: conta.id,
          nome: conta.nome,
          tipo: conta.tipo,
          saldo: conta.saldo_inicial_cents === 0 ? "" : paraCampo(conta.saldo_inicial_cents),
          dia_fechamento: conta.dia_fechamento,
          dia_vencimento: conta.dia_vencimento,
          limite: conta.limite_cents === null ? "" : paraCampo(conta.limite_cents),
        }}
      />
    </Entrada>
  );
}
