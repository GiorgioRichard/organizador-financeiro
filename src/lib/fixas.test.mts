import { test } from "node:test";
import assert from "node:assert/strict";
import { ocorrenciaEm, ocorrenciasDoAno, ocorrenciasNoIntervalo, type DespesaFixa } from "./fixas.ts";

const base: DespesaFixa = {
  id: "f1",
  nome: "IPTU",
  tipo: "despesa",
  frequencia: "anual",
  desde: "2026-01-01",
  valor_cents: 100000,
  category_id: "c",
  account_id: "a",
  mes: 2,
  dia: 10,
  parcelas: 1,
  ativa: true,
};

test("à vista: uma ocorrência no mês e dia", () => {
  const [o] = ocorrenciasDoAno(base, 2027);
  assert.equal(o.vencimento, "2027-02-10");
  assert.equal(o.valor_cents, 100000);
});

test("parcelado: meses seguidos e sobra na última", () => {
  const os = ocorrenciasDoAno({ ...base, valor_cents: 100000, parcelas: 3 }, 2027);
  assert.deepEqual(os.map((o) => o.vencimento), ["2027-02-10", "2027-03-10", "2027-04-10"]);
  assert.deepEqual(os.map((o) => o.valor_cents), [33333, 33333, 33334]);
});

test("dia 31 em fevereiro cai no último dia", () => {
  assert.equal(ocorrenciasDoAno({ ...base, dia: 31 }, 2027)[0].vencimento, "2027-02-28");
});

test("ciclo que começa em novembro aparece em janeiro do ano seguinte", () => {
  const ipva = { ...base, id: "f2", nome: "IPVA", mes: 11, dia: 20, parcelas: 3 };
  const jan = ocorrenciasNoIntervalo([ipva], "2027-01-01", "2027-01-31");
  assert.equal(jan.length, 1);
  assert.equal(jan[0].vencimento, "2027-01-20");
  assert.equal(jan[0].parcela, 3);
});

test("despesa inativa não gera ocorrências", () => {
  assert.equal(ocorrenciasNoIntervalo([{ ...base, ativa: false }], "2027-01-01", "2027-12-31").length, 0);
});

test("mensal: todo mês no dia, a partir de desde", () => {
  const aluguel = { ...base, id: "m1", nome: "Aluguel", frequencia: "mensal" as const, dia: 31, desde: "2026-11-15" };
  const os = ocorrenciasNoIntervalo([aluguel], "2026-10-01", "2027-02-28");
  assert.deepEqual(os.map((o) => o.vencimento), ["2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28"]);
  assert.ok(os.every((o) => o.valor_cents === 100000));
});

test("mensal: o mês de início conta mesmo se o dia já passou", () => {
  const salario = { ...base, tipo: "receita" as const, frequencia: "mensal" as const, dia: 5, desde: "2026-11-20" };
  assert.equal(ocorrenciasNoIntervalo([salario], "2026-11-01", "2026-11-30")[0]?.vencimento, "2026-11-05");
  assert.equal(ocorrenciasNoIntervalo([salario], "2026-11-01", "2026-11-30")[0]?.tipo, "receita");
});

test("ocorrenciaEm confere a data exata", () => {
  assert.equal(ocorrenciaEm(base, "2027-02-10")?.valor_cents, 100000);
  assert.equal(ocorrenciaEm(base, "2027-02-11"), undefined);
});
