import { estimateIntrinsicValue } from "./dcf.ts";

function dadosValidos() {
  return {
    profile: { price: 200, marketCap: 2_000_000_000, currency: "USD" },
    balanceRows: [{
      date: "2026-06-30",
      cashAndCashEquivalents: 100_000_000,
      shortTermInvestments: 25_000_000,
      totalDebt: 50_000_000,
    }],
    cashRows: [
      { date: "2026-06-30", freeCashFlow: 120_000_000 },
      { date: "2025-06-30", freeCashFlow: 110_000_000 },
      { date: "2024-06-30", freeCashFlow: 100_000_000 },
    ],
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("devolve valor DCF e três cenários para dados válidos", () => {
  const d = dadosValidos();
  const result = estimateIntrinsicValue(d.profile, d.balanceRows, d.cashRows);
  assert(result !== null, "Era esperado um resultado DCF.");
  assert(typeof result.value === "number" && result.value > 0, "O valor base deve ser positivo.");
  assert(Array.isArray(result.scenarios) && result.scenarios.length === 3, "Devem existir três cenários.");
  assert(result.scenarios.some((s: any) => s.nome === "conservador"), "Falta o cenário conservador.");
  assert(result.scenarios.some((s: any) => s.nome === "base"), "Falta o cenário base.");
  assert(result.scenarios.some((s: any) => s.nome === "otimista"), "Falta o cenário otimista.");
});

Deno.test("rejeita preço ou capitalização inválidos", () => {
  const d = dadosValidos();
  d.profile.price = 0;
  assert(estimateIntrinsicValue(d.profile, d.balanceRows, d.cashRows) === null, "Preço zero deve ser rejeitado.");
});

Deno.test("rejeita menos de três anos de fluxos de caixa", () => {
  const d = dadosValidos();
  d.cashRows = d.cashRows.slice(0, 2);
  assert(estimateIntrinsicValue(d.profile, d.balanceRows, d.cashRows) === null, "Dois anos não são suficientes.");
});

Deno.test("rejeita fluxo de caixa livre negativo", () => {
  const d = dadosValidos();
  d.cashRows[0].freeCashFlow = -1;
  assert(estimateIntrinsicValue(d.profile, d.balanceRows, d.cashRows) === null, "FCF negativo deve ser rejeitado.");
});

Deno.test("rejeita balanço incompleto", () => {
  const d = dadosValidos();
  delete (d.balanceRows[0] as Record<string, unknown>).totalDebt;
  assert(estimateIntrinsicValue(d.profile, d.balanceRows, d.cashRows) === null, "Balanço sem dívida explícita deve ser rejeitado.");
});

Deno.test("rejeita demonstrações financeiras desatualizadas", () => {
  const d = dadosValidos();
  d.cashRows = [
    { date: "2023-06-30", freeCashFlow: 120_000_000 },
    { date: "2022-06-30", freeCashFlow: 110_000_000 },
    { date: "2021-06-30", freeCashFlow: 100_000_000 },
  ];
  d.balanceRows[0].date = "2023-06-30";
  assert(estimateIntrinsicValue(d.profile, d.balanceRows, d.cashRows) === null, "Dados com mais de 550 dias devem ser rejeitados.");
});
