import type { NextRequest } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { ehMes, formatarData, hojeISO, intervaloDoMes, mesDe, nomeDoMes } from "@/lib/datas";
import { chaveOcorrencia, ocorrenciasNoIntervalo } from "@/lib/fixas";
import { contasComSaldo, listarCategorias, listarFixas, parcelasPagas, type Lancamento } from "@/lib/financas";
import { sumCents } from "@/lib/money";
import { gerarRelatorioPDF } from "@/lib/relatorio-pdf";

/** GET /relatorio/pdf?mes=AAAA-MM: baixa o relatório do mês em PDF. */
export async function GET(request: NextRequest) {
  const { supabase, user } = await exigirUsuario();
  const hoje = hojeISO();
  const pedido = request.nextUrl.searchParams.get("mes") ?? "";
  const mes = ehMes(pedido) ? pedido : mesDe(hoje);
  const { inicio, fim } = intervaloDoMes(mes);

  const [contas, categorias, fixas, pagas, lancs, limites] = await Promise.all([
    contasComSaldo(supabase, hoje),
    listarCategorias(supabase),
    listarFixas(supabase),
    parcelasPagas(supabase, inicio, fim),
    supabase
      .from("transactions")
      .select("id, tipo, valor_cents, data, descricao, account_id, category_id, transfer_to_account_id, parcela_grupo_id, parcela_n, parcela_total")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data")
      .order("created_at"),
    supabase.from("budgets").select("category_id, limite_cents").lte("mes", mes).order("mes"),
  ]);
  if (lancs.error) throw lancs.error;
  const lancamentos = lancs.data as Lancamento[];

  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const limitePor = new Map<string, number>();
  for (const b of (limites.data ?? []) as { category_id: string; limite_cents: number }[]) limitePor.set(b.category_id, b.limite_cents);

  const receitas = sumCents(lancamentos.filter((l) => l.tipo === "receita").map((l) => l.valor_cents));
  const despesas = sumCents(lancamentos.filter((l) => l.tipo === "despesa").map((l) => l.valor_cents));
  const gastoPor = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo === "despesa" && l.category_id) gastoPor.set(l.category_id, (gastoPor.get(l.category_id) ?? 0) + l.valor_cents);
  }

  const nome = typeof user.user_metadata?.nome === "string" && user.user_metadata.nome ? user.user_metadata.nome : (user.email ?? "");
  const bytes = await gerarRelatorioPDF({
    titulo: `Relatório de ${nomeDoMes(mes)}`,
    geradoEm: formatarData(hoje, true),
    usuario: nome,
    resumo: {
      receitas,
      despesas,
      resultado: receitas - despesas,
      saldoContas: sumCents(contas.filter((c) => !c.arquivada && c.tipo !== "cartao").map((c) => c.saldo_cents)),
    },
    categorias: categorias
      .filter((c) => c.tipo === "despesa")
      .map((c) => {
        const gasto = gastoPor.get(c.id) ?? 0;
        return { nome: c.nome, gasto, parte: despesas > 0 ? Math.round((gasto / despesas) * 100) : 0, limite: limitePor.get(c.id) };
      })
      .sort((a, b) => b.gasto - a.gasto),
    fixas: ocorrenciasNoIntervalo(fixas, inicio, fim).map((o) => {
      const paga = pagas.has(chaveOcorrencia(o.fixa_id, o.vencimento));
      const receita = o.tipo === "receita";
      const situacao = paga ? (receita ? "Recebida" : "Paga") : o.vencimento < hoje ? (receita ? "A receber" : "Atrasada") : "Em aberto";
      return {
        nome: o.parcelas > 1 ? `${o.nome} (${o.parcela}/${o.parcelas})` : o.nome,
        vencimento: formatarData(o.vencimento, true),
        valor: o.valor_cents,
        situacao,
        receita,
      };
    }),
    lancamentos: lancamentos.map((l) => ({
      data: formatarData(l.data),
      descricao: l.parcela_total ? `${l.descricao} (${l.parcela_n}/${l.parcela_total})` : l.descricao,
      detalhe:
        l.tipo === "transferencia"
          ? `${nomeConta.get(l.account_id) ?? ""} -> ${nomeConta.get(l.transfer_to_account_id ?? "") ?? ""}`
          : `${nomeCategoria.get(l.category_id ?? "") ?? ""} · ${nomeConta.get(l.account_id) ?? ""}`,
      valor: l.valor_cents,
      tipo: l.tipo,
    })),
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${mes}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
