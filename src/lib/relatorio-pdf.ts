/**
 * Relatório mensal em PDF (A4), gerado no servidor com pdf-lib.
 * Recebe os dados já calculados e devolve os bytes do arquivo.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatCents } from "./money.ts";

export type DadosRelatorio = {
  titulo: string; // "Relatório de novembro de 2026"
  geradoEm: string; // "11/11/2026"
  usuario: string;
  resumo: { receitas: number; despesas: number; resultado: number; saldoContas: number };
  categorias: { nome: string; gasto: number; parte: number; limite?: number }[];
  fixas: { nome: string; vencimento: string; valor: number; situacao: string; receita: boolean }[];
  lancamentos: { data: string; descricao: string; detalhe: string; valor: number; tipo: "receita" | "despesa" | "transferencia" }[];
};

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = 48;
const COR = {
  floresta: rgb(0.059, 0.231, 0.2),
  tinta: rgb(0.06, 0.12, 0.105),
  musgo: rgb(0.37, 0.435, 0.41),
  linha: rgb(0.88, 0.9, 0.885),
  receita: rgb(0.122, 0.478, 0.322),
  despesa: rgb(0.69, 0.278, 0.231),
  menta: rgb(0.89, 0.95, 0.91),
};

export async function gerarRelatorioPDF(d: DadosRelatorio): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(d.titulo);
  pdf.setAuthor("Organizador financeiro");
  pdf.setLanguage("pt-BR");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  // As fontes padrão do PDF só têm o alfabeto latino básico (com acentos);
  // trocamos o que não existir nelas para não quebrar a geração.
  const seguro = (texto: string) =>
    [...texto.replace(/→/g, "->").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")]
      .map((c) => {
        try {
          normal.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");

  let pagina: PDFPage = pdf.addPage([A4.largura, A4.altura]);
  let y = A4.altura - MARGEM;

  const texto = (t: string, x: number, yy: number, o: { tam?: number; fonte?: PDFFont; cor?: ReturnType<typeof rgb> } = {}) =>
    pagina.drawText(seguro(t), { x, y: yy, size: o.tam ?? 10, font: o.fonte ?? normal, color: o.cor ?? COR.tinta });
  const largura = (t: string, tam = 10, fonte = normal) => fonte.widthOfTextAtSize(seguro(t), tam);
  const direita = (t: string, xFim: number, yy: number, o: { tam?: number; fonte?: PDFFont; cor?: ReturnType<typeof rgb> } = {}) =>
    texto(t, xFim - largura(t, o.tam ?? 10, o.fonte ?? normal), yy, o);
  const cortar = (t: string, max: number, tam = 10) => {
    let s = seguro(t);
    if (normal.widthOfTextAtSize(s, tam) <= max) return s;
    while (s.length > 1 && normal.widthOfTextAtSize(`${s}...`, tam) > max) s = s.slice(0, -1);
    return `${s}...`;
  };
  const novaPagina = () => {
    pagina = pdf.addPage([A4.largura, A4.altura]);
    y = A4.altura - MARGEM;
  };
  /** Garante espaço; se não houver, começa outra página. */
  const espaco = (altura: number) => {
    if (y - altura < MARGEM + 30) novaPagina();
  };

  // Cabeçalho
  pagina.drawRectangle({ x: 0, y: A4.altura - 8, width: A4.largura, height: 8, color: COR.floresta });
  texto("ORGANIZADOR FINANCEIRO", MARGEM, y, { tam: 8, fonte: negrito, cor: COR.musgo });
  y -= 26;
  texto(d.titulo, MARGEM, y, { tam: 22, fonte: negrito });
  y -= 18;
  texto(`Gerado em ${d.geradoEm} para ${d.usuario}`, MARGEM, y, { tam: 9, cor: COR.musgo });
  y -= 30;

  // Resumo em quatro caixas
  const caixas: [string, number, ReturnType<typeof rgb>][] = [
    ["Receitas", d.resumo.receitas, COR.receita],
    ["Despesas", -d.resumo.despesas, COR.despesa],
    ["Resultado", d.resumo.resultado, d.resumo.resultado < 0 ? COR.despesa : COR.receita],
    ["Saldo em contas hoje", d.resumo.saldoContas, COR.tinta],
  ];
  const lCaixa = (A4.largura - 2 * MARGEM - 3 * 8) / 4;
  caixas.forEach(([rotulo, valor, cor], i) => {
    const x = MARGEM + i * (lCaixa + 8);
    pagina.drawRectangle({ x, y: y - 46, width: lCaixa, height: 52, color: COR.menta });
    texto(rotulo, x + 8, y - 8, { tam: 8, cor: COR.musgo });
    texto(formatCents(valor || 0), x + 8, y - 30, { tam: 13, fonte: negrito, cor });
  });
  y -= 76;

  const secao = (titulo: string) => {
    espaco(48);
    texto(titulo, MARGEM, y, { tam: 13, fonte: negrito });
    y -= 8;
    pagina.drawLine({ start: { x: MARGEM, y }, end: { x: A4.largura - MARGEM, y }, thickness: 1, color: COR.floresta });
    y -= 16;
  };
  const linhaTabela = () => {
    pagina.drawLine({ start: { x: MARGEM, y: y - 5 }, end: { x: A4.largura - MARGEM, y: y - 5 }, thickness: 0.5, color: COR.linha });
    y -= 18;
  };
  const cabecalho = (colunas: [string, number, "e" | "d"][]) => {
    for (const [t, x, lado] of colunas) {
      if (lado === "d") direita(t, x, y, { tam: 8, fonte: negrito, cor: COR.musgo });
      else texto(t, x, y, { tam: 8, fonte: negrito, cor: COR.musgo });
    }
    y -= 16;
  };
  const fim = A4.largura - MARGEM;

  // Despesas por categoria
  secao("Despesas por categoria");
  const comGasto = d.categorias.filter((c) => c.gasto > 0 || c.limite);
  if (comGasto.length === 0) {
    texto("Nenhuma despesa no período.", MARGEM, y, { cor: COR.musgo });
    y -= 22;
  } else {
    cabecalho([["CATEGORIA", MARGEM, "e"], ["GASTO", fim - 170, "d"], ["% DO TOTAL", fim - 90, "d"], ["LIMITE", fim, "d"]]);
    for (const c of comGasto) {
      espaco(18);
      texto(cortar(c.nome, 220), MARGEM, y);
      direita(formatCents(c.gasto), fim - 170, y);
      direita(`${c.parte}%`, fim - 90, y, { cor: COR.musgo });
      const passou = c.limite !== undefined && c.gasto > c.limite;
      direita(c.limite ? formatCents(c.limite) : "-", fim, y, { cor: passou ? COR.despesa : COR.musgo, fonte: passou ? negrito : normal });
      linhaTabela();
    }
    y -= 8;
  }

  // Fixas e recorrentes
  if (d.fixas.length > 0) {
    secao("Fixas e recorrentes do mês");
    cabecalho([["NOME", MARGEM, "e"], ["VENCIMENTO", fim - 210, "e"], ["VALOR", fim - 90, "d"], ["SITUAÇÃO", fim, "d"]]);
    for (const f of d.fixas) {
      espaco(18);
      texto(cortar(f.nome, 230), MARGEM, y);
      texto(f.vencimento, fim - 210, y, { cor: COR.musgo });
      direita(formatCents(f.valor), fim - 90, y, { cor: f.receita ? COR.receita : COR.tinta });
      const cor = f.situacao === "Atrasada" ? COR.despesa : f.situacao.startsWith("Pag") || f.situacao.startsWith("Receb") ? COR.receita : COR.musgo;
      direita(f.situacao, fim, y, { cor, fonte: f.situacao === "Atrasada" ? negrito : normal });
      linhaTabela();
    }
    y -= 8;
  }

  // Lançamentos
  secao(`Lançamentos (${d.lancamentos.length})`);
  if (d.lancamentos.length === 0) {
    texto("Nenhum lançamento no período.", MARGEM, y, { cor: COR.musgo });
    y -= 22;
  } else {
    cabecalho([["DATA", MARGEM, "e"], ["DESCRIÇÃO", MARGEM + 46, "e"], ["CATEGORIA / CONTA", MARGEM + 250, "e"], ["VALOR", fim, "d"]]);
    for (const l of d.lancamentos) {
      espaco(18);
      texto(l.data, MARGEM, y, { cor: COR.musgo });
      texto(cortar(l.descricao, 196), MARGEM + 46, y);
      texto(cortar(l.detalhe, 150, 9), MARGEM + 250, y, { tam: 9, cor: COR.musgo });
      const valor = l.tipo === "receita" ? l.valor : l.tipo === "despesa" ? -l.valor : l.valor;
      const cor = l.tipo === "receita" ? COR.receita : l.tipo === "despesa" ? COR.despesa : COR.musgo;
      direita(`${l.tipo === "receita" ? "+" : ""}${formatCents(valor)}`, fim, y, { cor });
      linhaTabela();
    }
  }

  // Rodapé com assinatura e numeração em todas as páginas
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText("Criado por Giorgio Richard © 2026", { x: MARGEM, y: 24, size: 8, font: normal, color: COR.musgo });
    const num = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(num, { x: fim - normal.widthOfTextAtSize(num, 8), y: 24, size: 8, font: normal, color: COR.musgo });
  });

  return pdf.save();
}
