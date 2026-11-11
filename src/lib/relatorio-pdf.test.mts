import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { gerarRelatorioPDF } from "./relatorio-pdf.ts";

test("gera PDF válido, com várias páginas e caracteres fora da fonte", async () => {
  const bytes = await gerarRelatorioPDF({
    titulo: "Relatório de novembro de 2026",
    geradoEm: "11/11/2026",
    usuario: "Teste",
    resumo: { receitas: 525000, despesas: 40000, resultado: 485000, saldoContas: 1925000 },
    categorias: [{ nome: "Moradia", gasto: 40000, parte: 100, limite: 30000 }],
    fixas: [{ nome: "IPTU (1/3)", vencimento: "10/11/2026", valor: 40000, situacao: "Paga", receita: false }],
    lancamentos: Array.from({ length: 80 }, (_, i) => ({
      data: "05/11",
      descricao: i === 0 ? "Café ☕ com açúcar → padaria" : `Lançamento ${i}`,
      detalhe: "Alimentação · Banco",
      valor: 1990,
      tipo: "despesa" as const,
    })),
  });
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 2, "80 lançamentos devem ocupar mais de uma página");
  assert.equal(doc.getTitle(), "Relatório de novembro de 2026");
});
