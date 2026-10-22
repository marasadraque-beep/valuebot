export const ALLOWED_SYMBOLS = [
  "AAPL", "MSFT",
  "EDP.LS", "GALP.LS", "JMT.LS",
  "PETR4.SA", "WEGE3.SA", "ITUB4.SA",
  "VWCE.DE", "IWDA.AS", "EXSA.DE",
] as const;

export const ENDPOINTS = [
  "profile",
  "quote",
  "income-statement",
  "balance-sheet-statement",
  "cash-flow-statement",
  "discounted-cash-flow",
] as const;

export const MAX_SYMBOLS_PER_REQUEST = 4;

export type SymbolValidation =
  | { ok: true; symbols: string[] }
  | { ok: false; status: 400; error: string; maxSymbolsPerRequest?: number; allowedSymbols?: readonly string[] };

export function validateSymbolsBody(body: unknown): SymbolValidation {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "O corpo deve ser um objeto JSON." };
  }
  if (!("symbols" in body)) {
    return { ok: false, status: 400, error: "Indica a lista de símbolos." };
  }
  const requested = (body as { symbols?: unknown }).symbols;
  if (
    !Array.isArray(requested) ||
    requested.length === 0 ||
    requested.length > MAX_SYMBOLS_PER_REQUEST ||
    !requested.every((value) =>
      typeof value === "string" &&
      (ALLOWED_SYMBOLS as readonly string[]).includes(value)
    )
  ) {
    return {
      ok: false,
      status: 400,
      error: "Lista de símbolos inválida ou acima do limite por pedido.",
      maxSymbolsPerRequest: MAX_SYMBOLS_PER_REQUEST,
      allowedSymbols: ALLOWED_SYMBOLS,
    };
  }
  return { ok: true, symbols: [...new Set(requested as string[])] };
}
