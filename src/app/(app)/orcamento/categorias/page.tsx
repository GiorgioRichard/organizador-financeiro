import { Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { listarCategorias, type Categoria } from "@/lib/financas";
import { Aviso, Carregando, Titulo, botaoPrimario, campo } from "../../ui";
import { criarCategoria, excluirCategoria, renomearCategoria } from "../actions";

type SearchParams = Promise<{ erro?: string; ok?: string }>;

export default function CategoriasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Categorias" subtitulo="Renomeie, crie ou exclua as categorias dos seus lançamentos" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const { erro, ok } = await searchParams;
  const categorias = await listarCategorias(supabase);

  return (
    <Entrada className="flex flex-col gap-5">
      <Aviso erro={erro} ok={ok} />

      <form action={criarCategoria} className="cartao-branco flex flex-col gap-3 rounded-[var(--radius-cartao)] p-5 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          Nova categoria
          <input name="nome" required maxLength={40} placeholder="Ex.: Pets" className={campo} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tipo
          <select name="tipo" defaultValue="despesa" className={campo}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </label>
        <BotaoEnviar className={botaoPrimario}>
          <Plus aria-hidden size={16} /> Criar
        </BotaoEnviar>
      </form>

      <Lista titulo="Despesas" itens={categorias.filter((c) => c.tipo === "despesa")} />
      <Lista titulo="Receitas" itens={categorias.filter((c) => c.tipo === "receita")} />
    </Entrada>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: Categoria[] }) {
  return (
    <section aria-label={titulo} className="vidro rounded-[var(--radius-cartao)] p-5">
      <h2 className="text-sm text-musgo">{titulo}</h2>
      <ul className="mt-2 divide-y divide-linha">
        {itens.map((c) => (
          <li key={c.id} className="flex items-center gap-2 py-2">
            <form action={renomearCategoria} className="flex flex-1 items-center gap-1">
              <input type="hidden" name="id" value={c.id} />
              <label htmlFor={`cat-${c.id}`} className="sr-only">
                Nome da categoria {c.nome}
              </label>
              <input
                id={`cat-${c.id}`}
                name="nome"
                defaultValue={c.nome}
                required
                maxLength={40}
                className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-base font-medium hover:bg-superficie/60 focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-floresta/40"
              />
              <BotaoEnviar pendente="…" className="h-11 rounded-full px-3 text-sm text-floresta underline underline-offset-4">
                Salvar
              </BotaoEnviar>
            </form>
            <form action={excluirCategoria}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                aria-label={`Excluir ${c.nome}`}
                title="Excluir"
                className="grid size-11 place-items-center rounded-full text-musgo hover:bg-despesa-suave hover:text-despesa"
              >
                <Trash2 aria-hidden size={16} />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
