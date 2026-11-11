import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBRLToCents, parseSaldoToCents, splitCents, sumCents } from "./money.ts";

test("parseBRLToCents aceita formatos comuns", () => {
  assert.equal(parseBRLToCents("1.234,56"), 123456);
  assert.equal(parseBRLToCents("R$ 10"), 1000);
  assert.equal(parseBRLToCents("1234.5"), 123450);
  assert.equal(parseBRLToCents("0,01"), 1);
});

test("parseBRLToCents lê ponto com 3 dígitos como milhar", () => {
  assert.equal(parseBRLToCents("3.000"), 300000);
  assert.equal(parseBRLToCents("12.500"), 1250000);
  assert.equal(parseBRLToCents("10.50"), 1050);
  assert.equal(parseBRLToCents("1.234.567"), 123456700);
});

test("parseBRLToCents rejeita zero, negativo e lixo", () => {
  assert.equal(parseBRLToCents("0"), null);
  assert.equal(parseBRLToCents("-5"), null);
  assert.equal(parseBRLToCents("abc"), null);
  assert.equal(parseBRLToCents("1,234"), null);
});

test("parseSaldoToCents aceita zero, negativo e vazio", () => {
  assert.equal(parseSaldoToCents(""), 0);
  assert.equal(parseSaldoToCents("0"), 0);
  assert.equal(parseSaldoToCents("-1.500,00"), -150000);
  assert.equal(parseSaldoToCents("250,75"), 25075);
  assert.equal(parseSaldoToCents("x"), null);
});

test("splitCents joga a sobra na última parcela", () => {
  assert.deepEqual(splitCents(1000, 3), [333, 333, 334]);
  assert.equal(sumCents(splitCents(99999, 7)), 99999);
});
