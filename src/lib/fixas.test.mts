import { test } from "node:test";
import assert from "node:assert/strict";
import { ocorrenciasDoAno, ocorrenciasNoIntervalo, type DespesaFixa } from "./fixas.ts";

const base: DespesaFixa = {
  id: "f1",
  nome: "IPTU",
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
