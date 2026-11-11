import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cicloFatura,
  ehDataISO,
  hojeISO,
  intervaloDoMes,
  somarMeses,
  somarMesesAoMes,
} from "./datas.ts";

test("hojeISO usa o fuso de São Paulo", () => {
  // 02:00 UTC de 12/11 ainda é 23:00 de 11/11 em São Paulo
  assert.equal(hojeISO(new Date("2026-11-12T02:00:00Z")), "2026-11-11");
  assert.equal(hojeISO(new Date("2026-11-12T03:00:00Z")), "2026-11-12");
});

test("somarMeses ajusta ao fim do mês", () => {
  assert.equal(somarMeses("2026-01-31", 1), "2026-02-28");
  assert.equal(somarMeses("2028-01-31", 1), "2028-02-29");
  assert.equal(somarMeses("2026-11-15", 3), "2027-02-15");
  assert.equal(somarMeses("2026-01-10", -1), "2025-12-10");
});

test("somarMesesAoMes e intervaloDoMes", () => {
  assert.equal(somarMesesAoMes("2026-12", 1), "2027-01");
  assert.equal(somarMesesAoMes("2026-01", -1), "2025-12");
  assert.deepEqual(intervaloDoMes("2026-02"), { inicio: "2026-02-01", fim: "2026-02-28" });
});

test("ehDataISO rejeita dias inexistentes", () => {
  assert.equal(ehDataISO("2026-02-29"), false);
  assert.equal(ehDataISO("2028-02-29"), true);
  assert.equal(ehDataISO("2026-13-01"), false);
  assert.equal(ehDataISO("11/11/2026"), false);
});

test("cicloFatura: compra até o fechamento entra na fatura do mês", () => {
  // fecha dia 5, vence dia 12
  assert.deepEqual(cicloFatura(5, 12, "2026-11-05"), {
    inicio: "2026-10-06",
    fechamento: "2026-11-05",
    vencimento: "2026-11-12",
  });
});

test("cicloFatura: compra depois do fechamento vai para a próxima", () => {
  assert.deepEqual(cicloFatura(5, 12, "2026-11-06"), {
    inicio: "2026-11-06",
    fechamento: "2026-12-05",
    vencimento: "2026-12-12",
  });
});

test("cicloFatura: vencimento no mês seguinte ao fechamento", () => {
  // fecha dia 25, vence dia 3
  assert.deepEqual(cicloFatura(25, 3, "2026-12-20"), {
    inicio: "2026-11-26",
    fechamento: "2026-12-25",
    vencimento: "2027-01-03",
  });
});

test("cicloFatura: fechamento dia 31 em mês curto", () => {
  assert.deepEqual(cicloFatura(31, 8, "2026-02-15"), {
    inicio: "2026-02-01",
    fechamento: "2026-02-28",
    vencimento: "2026-03-08",
  });
});
