import { ALLOWED_SYMBOLS, ENDPOINTS, MAX_SYMBOLS_PER_REQUEST, validateSymbolsBody } from "./validation.ts";

Deno.test("aceita símbolos autorizados e remove duplicados preservando ordem", () => {
  const result = validateSymbolsBody({ symbols: ["AAPL", "MSFT", "AAPL"] });
  if (!result.ok) throw new Error("Esperava validação bem-sucedida.");
  if (result.symbols.length !== 2 || result.symbols[0] !== "AAPL" || result.symbols[1] !== "MSFT") {
    throw new Error("Normalização de símbolos incorreta.");
  }
});

Deno.test("rejeita corpo nulo, arrays e primitivos", () => {
  for (const body of [null, [], "AAPL", 42, true]) {
    if (validateSymbolsBody(body).ok) throw new Error("Corpo inválido aceite.");
  }
});

Deno.test("rejeita campo symbols ausente ou lista inválida", () => {
  for (const body of [{}, { symbols: "AAPL" }, { symbols: null }, { symbols: [] }]) {
    if (validateSymbolsBody(body).ok) throw new Error("Lista inválida aceite.");
  }
});

Deno.test("rejeita símbolos fora da allowlist", () => {
  const result = validateSymbolsBody({ symbols: ["INVALID"] });
  if (result.ok || !result.allowedSymbols?.includes("AAPL")) throw new Error("Allowlist não aplicada.");
});

Deno.test("limita a quatro símbolos por pedido", () => {
  const result = validateSymbolsBody({ symbols: ["AAPL", "MSFT", "EDP.LS", "GALP.LS", "JMT.LS"] });
  if (result.ok || result.maxSymbolsPerRequest !== MAX_SYMBOLS_PER_REQUEST) throw new Error("Limite não aplicado.");
});

Deno.test("catálogo e endpoints têm os tamanhos esperados", () => {
  if (ALLOWED_SYMBOLS.length !== 11 || ENDPOINTS.length !== 6) throw new Error("Catálogo inesperado.");
});
