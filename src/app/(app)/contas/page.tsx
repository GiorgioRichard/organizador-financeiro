import { Suspense } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Landmark, PiggyBank, Plus, Wallet, Pencil, type LucideIcon } from "lucide-react";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";
import { contasComSaldo, NOMES_TIPO_CONTA, type ContaComSaldo, type TipoConta } from "@/lib/financas";
import { sumCents } from "@/lib/money";
import { CartaoFatura } from "../cartao-fatura";
import { Aviso, Carregando, Titulo, Valor, ValorGrande, botaoPrimario } from "../ui";
import { alternarArquivada } from "./actions";

type SearchParams = Promise<{ erro?: string; ok?: string }>;

export default function ContasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Contas e cartões" subtitulo="Saldos de hoje e faturas em aberto" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const ICONES: Record<Exclude<TipoConta, "cartao">, LucideIcon> = {
  corrente: Landmark,
  poupanca: PiggyBank,
  carteira: Wallet,
};

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await exigirUsuario();
  const { erro, ok } = await searchParams;
  const hoje = hojeISO();
  const contas = await contasComSaldo(supabase, hoje);
  const ativas = contas.filter((c) => !c.arquivada);
  const comuns = ativas.filter((c) => c.tipo !== "cartao");
  const cartoes = ativas.filter((c) => c.tipo === "cartao");
  const arquivadas = contas.filter((c) => c.arquivada);

  return (
    <Entrada className="flex flex-col gap-5">
      <Aviso erro={erro} ok={ok} />

      {ativas.length === 0 ? (
        <div className="vidro flex flex-col items-start gap-4 rounded-[var(--radius-cartao)] p-6">
          <p className="text-sm text-musgo">Nenhuma conta ainda. Comece pela sua conta corrente ou carteira.</p>
          <Link href="/contas/nova" className={botaoPrimario}>
            <Plus aria-hidden size={16} /> Nova conta
          </Link>
        </div>
      ) : (
        <>
          {comuns.length > 0 && (
            <section aria-labelledby="contas" className="vidro rounded-[var(--radius-cartao)] p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 id="contas" className="text-sm text-musgo">Saldo em contas</h2>
                  <ValorGrande cents={sumCents(comuns.map((c) => c.saldo_cents))} tamanho="text-4xl" />
                </div>
                <Link href="/contas/nova" aria-label="Nova conta" className="grid size-10 place-items-center rounded-full bg-superficie shadow-sm">
                  <Plus aria-hidden size={18} />
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-linha">
                {comuns.map((c) => (
                  <ItemConta key={c.id} conta={c} />
                ))}
              </ul>
            </section>
          )}

          {cartoes.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <CartaoFatura conta={c} hoje={hoje} acao={false} />
              <AcoesConta conta={c} />
            </div>
          ))}
        </>
      )}

      {arquivadas.length > 0 && (
        <section aria-labelledby="arquivadas" className="vidro rounded-[var(--radius-cartao)] p-5 opacity-80">
          <h2 id="arquivadas" className="text-sm text-musgo">Arquivadas</h2>
          <ul className="mt-2 divide-y divide-linha">
            {arquivadas.map((c) => (
              <ItemConta key={c.id} conta={c} />
            ))}
          </ul>
        </section>
      )}
    </Entrada>
  );
}

function ItemConta({ conta }: { conta: ContaComSaldo }) {
  const Icone = conta.tipo === "cartao" ? Wallet : ICONES[conta.tipo];
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-floresta shadow-sm">
        <Icone aria-hidden size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-floresta">{conta.nome}</p>
        <p className="text-xs text-musgo">{NOMES_TIPO_CONTA[conta.tipo]}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-medium">
          <Valor cents={conta.saldo_cents} />
        </span>
        <AcoesConta conta={conta} compacto />
      </div>
    </li>
  );
}

function AcoesConta({ conta, compacto = false }: { conta: ContaComSaldo; compacto?: boolean }) {
  const classe = compacto
    ? "inline-flex items-center gap-1 text-xs text-musgo hover:text-tinta"
    : "vidro inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm hover:bg-superficie/70";
  const tam = compacto ? 12 : 14;
  return (
    <div className={`flex gap-2 ${compacto ? "" : "justify-end"}`}>
      <Link href={`/contas/${conta.id}`} className={classe}>
        <Pencil aria-hidden size={tam} /> Editar
      </Link>
      <form action={alternarArquivada}>
        <input type="hidden" name="id" value={conta.id} />
        <input type="hidden" name="arquivar" value={conta.arquivada ? "0" : "1"} />
        <button type="submit" className={classe} aria-label={`${conta.arquivada ? "Reativar" : "Arquivar"} ${conta.nome}`}>
          {conta.arquivada ? <ArchiveRestore aria-hidden size={tam} /> : <Archive aria-hidden size={tam} />}
          {conta.arquivada ? "Reativar" : "Arquivar"}
        </button>
      </form>
    </div>
  );
}
