/**
 * Utilitários monetários. Todo cálculo é feito em centavos (inteiros),
 * nunca em ponto flutuante, para evitar erros de arredondamento.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Converte texto digitado pelo usuário (ex.: "1.234,56", "1234.5", "10")
 * em centavos. Retorna null se o valor for inválido.
 */
export function parseBRLToCents(input: string): number | null {
  const cents = parseAbsoluto(input.trim().replace(/\s/g, "").replace(/^R\$/i, ""));
  return cents !== null && cents > 0 ? cents : null;
}

/**
 * Como parseBRLToCents, mas para saldos: aceita zero, sinal negativo
 * ("-1.500,00") e campo vazio (vira 0).
 */
export function parseSaldoToCents(input: string): number | null {
  let raw = input.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (raw === "") return 0;
  const negativo = raw.startsWith("-");
  if (negativo) raw = raw.slice(1).replace(/^R\$/i, "");
  const cents = parseAbsoluto(raw);
  if (cents === null) return null;
  return negativo && cents !== 0 ? -cents : cents;
}

/** Valor sem sinal em centavos (zero permitido), ou null se inválido. */
function parseAbsoluto(raw: string): number | null {
  if (raw === "") return null;

  let normalized: string;
  if (raw.includes(",")) {
    // Formato brasileiro: ponto como milhar, vírgula como decimal
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if ((raw.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(raw)) {
    // Vários pontos sem vírgula, ou um ponto seguido de 3 dígitos ("3.000"):
    // no Brasil, o ponto aí é separador de milhar
    normalized = raw.replace(/\./g, "");
  } else {
    normalized = raw;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [inteiro, fracao = ""] = normalized.split(".");
  const cents = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

/** Formata centavos como moeda brasileira, ex.: 123456 -> "R$ 1.234,56". */
export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}

/** Soma valores em centavos garantindo que o resultado seja inteiro seguro. */
export function sumCents(values: readonly number[]): number {
  const total = values.reduce((acc, v) => acc + v, 0);
  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Soma monetária fora do intervalo seguro");
  }
  return total;
}

/**
 * Divide um total em N parcelas inteiras. A diferença de centavos vai
 * para a última parcela, de forma que a soma seja exatamente o total.
 */
export function splitCents(totalCents: number, parts: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new RangeError("Total deve ser inteiro e positivo");
  }
  if (!Number.isInteger(parts) || parts < 1) {
    throw new RangeError("Número de parcelas inválido");
  }
  const base = Math.floor(totalCents / parts);
  const resto = totalCents - base * parts;
  return Array.from({ length: parts }, (_, i) =>
    i === parts - 1 ? base + resto : base,
  );
}
