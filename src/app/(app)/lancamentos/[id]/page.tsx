import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";
import { listarCategorias, listarContas, type Lancamento } from "@/lib/financas";
import { formatCents } from "@/lib/money";
import { Carregando, Titulo } from "../../ui";
import { editarLancamento } from "../actions";
import { FormLancamento } from "../form-lancamento";

type Props = { params: Promise<{ id: string }> };

export default function EditarLancamentoPage(props: Props) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Suspense fallback={<Carregando />}>
        <Conteudo {...props} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ params }: Props) {
  const { supabase } = await exigirUsuario();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [{ data }, contas, categorias] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, tipo, valor_cents, data, descricao, account_id, category_id, transfer_to_account_id, parcela_grupo_id, parcela_n, parcela_total")
      .eq("id", id)
      .maybeSingle<Lancamento>(),
    listarContas(supabase),
    listarCategorias(supabase),
  ]);
  if (!data) notFound();

  // Conta arquivada continua na lista se for a do lançamento
  const usadas = new Set([data.account_id, data.transfer_to_account_id]);
  const opcoes = contas.filter((c) => !c.arquivada || usadas.has(c.id));

  return (
    <Entrada className="flex flex-col gap-5">
      <Titulo
        titulo="Editar lançamento"
        subtitulo={data.parcela_total ? `Parcela ${data.parcela_n} de ${data.parcela_total}: só esta parcela muda` : data.descricao}
      />
      <FormLancamento
        action={editarLancamento}
        contas={opcoes.map((c) => ({ id: c.id, nome: c.nome }))}
        categorias={categorias}
        hoje={hojeISO()}
        inicial={{
          id: data.id,
          tipo: data.tipo,
          valor: formatCents(data.valor_cents).replace(/[^\d,]/g, ""),
          descricao: data.descricao,
          data: data.data,
          account_id: data.account_id,
          category_id: data.category_id ?? "",
          transfer_to_account_id: data.transfer_to_account_id ?? "",
        }}
      />
    </Entrada>
  );
}
