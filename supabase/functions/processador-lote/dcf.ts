export function estimateIntrinsicValue(profile: any, balanceRows: any[], cashRows: any[]) {
  const price = Number(profile?.price);
  const marketCap = Number(profile?.marketCap);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(marketCap) || marketCap <= 0) return null;
  if (!Array.isArray(cashRows) || cashRows.length < 3 || !Array.isArray(balanceRows) || balanceRows.length < 1) return null;

  const now = Date.now();
  const maxAgeMs = 550 * 24 * 60 * 60 * 1000;
  const maxStatementGapMs = 180 * 24 * 60 * 60 * 1000;
  const datedCashRows = cashRows.filter((r: any) => typeof r?.date === "string" && Number.isFinite(Date.parse(r.date)));
  const distinctCashYears = new Set(datedCashRows.map((r: any) => new Date(r.date).getUTCFullYear()));
  if (distinctCashYears.size < 3) return null;
  const latestCashDate = datedCashRows[0]?.date;
  const latestBalanceDate = balanceRows[0]?.date;
  if (datedCashRows.length < 3 || !latestCashDate || !latestBalanceDate) return null;
  const cashDateMs = Date.parse(latestCashDate);
  const balanceDateMs = Date.parse(latestBalanceDate);
  if (!Number.isFinite(cashDateMs) || !Number.isFinite(balanceDateMs)) return null;
  if (cashDateMs > now + 7 * 24 * 60 * 60 * 1000 || balanceDateMs > now + 7 * 24 * 60 * 60 * 1000) return null;
  if (now - cashDateMs > maxAgeMs || now - balanceDateMs > maxAgeMs) return null;
  if (Math.abs(cashDateMs - balanceDateMs) > maxStatementGapMs) return null;

  const fcfs = datedCashRows.map((r: any) => Number(r?.freeCashFlow));
  if (fcfs.length < 3 || fcfs.some((v: number) => !Number.isFinite(v) || v <= 0)) return null;
  const baseFcf = fcfs[0];
  const latestBalance = balanceRows[0] ?? {};
  const rawCash = latestBalance.cashAndCashEquivalents;
  const rawShortTermInvestments = latestBalance.shortTermInvestments;
  const rawDebt = latestBalance.totalDebt;
  if ([rawCash, rawShortTermInvestments, rawDebt].some((v: unknown) => v === undefined || v === null || v === "")) return null;
  const cash = Number(rawCash);
  const shortTermInvestments = Number(rawShortTermInvestments);
  const debt = Number(rawDebt);
  if (![cash, shortTermInvestments, debt].every((v: number) => Number.isFinite(v) && v >= 0)) return null;
  const shares = marketCap / price;
  if (!Number.isFinite(shares) || shares <= 0) return null;

  const scenarios = [
    { name: "conservador", growth: 0.02, discount: 0.10, terminalGrowth: 0.02 },
    { name: "base", growth: 0.05, discount: 0.09, terminalGrowth: 0.025 },
    { name: "otimista", growth: 0.08, discount: 0.08, terminalGrowth: 0.03 }
  ];
  const calculateScenario = (growth: number, discount: number, terminalGrowth: number) => {
    if (discount <= terminalGrowth) return null;
    let explicitPresentValue = 0;
    let projectedFcf = baseFcf;
    for (let year = 1; year <= 5; year++) {
      projectedFcf *= (1 + growth);
      explicitPresentValue += projectedFcf / Math.pow(1 + discount, year);
    }
    const terminalValue = projectedFcf * (1 + terminalGrowth) / (discount - terminalGrowth);
    const terminalPresentValue = terminalValue / Math.pow(1 + discount, 5);
    const enterpriseValue = explicitPresentValue + terminalPresentValue;
    const equityValue = enterpriseValue + cash + shortTermInvestments - debt;
    const valuePerShare = equityValue / shares;
    if (!Number.isFinite(valuePerShare) || valuePerShare <= 0) return null;
    return {
      value: Math.round(valuePerShare * 100) / 100,
      valor_presente_fluxos_explicitos: Math.round(explicitPresentValue),
      valor_presente_terminal: Math.round(terminalPresentValue),
      peso_terminal_pct: enterpriseValue > 0
        ? Math.round((terminalPresentValue / enterpriseValue) * 10000) / 100
        : null,
      valor_capital_proprio: Math.round(equityValue)
    };
  };
  const scenarioValues = scenarios.map((s) => {
    const result = calculateScenario(s.growth, s.discount, s.terminalGrowth);
    return {
      nome: s.name,
      valor_por_acao: result?.value ?? null,
      valor_presente_fluxos_explicitos: result?.valor_presente_fluxos_explicitos ?? null,
      valor_presente_terminal: result?.valor_presente_terminal ?? null,
      peso_terminal_pct: result?.peso_terminal_pct ?? null,
      valor_capital_proprio: result?.valor_capital_proprio ?? null,
      crescimento_fcf_anual: `${s.growth * 100}%`,
      taxa_desconto: `${s.discount * 100}%`,
      crescimento_terminal: `${s.terminalGrowth * 100}%`
    };
  });
  const baseScenario = scenarioValues.find((s) => s.nome === "base");
  if (baseScenario?.valor_por_acao == null) return null;

  return {
    value: baseScenario.valor_por_acao,
    currency: typeof profile.currency === "string" ? profile.currency : null,
    method: "DCF simplificado sobre fluxo de caixa livre anual, com cenários",
    data_referencia_fluxo_caixa: latestCashDate,
    data_referencia_balanco: latestBalanceDate,
    preco_perfil: price,
    capitalizacao_bolsa_perfil: marketCap,
    data_preco: "O fornecedor não disponibilizou timestamp da cotação neste endpoint",
    anos_fluxo_caixa_considerados: datedCashRows.map((r: any) => r.date),
    scenarios: scenarioValues,
    assumptions: { crescimento_fcf_anual: "5%", taxa_desconto: "9%", crescimento_terminal: "2,5%", horizonte_explicito_anos: 5 },
    base_fcf_anual: baseFcf,
    caixa: cash,
    investimentos_curto_prazo: shortTermInvestments,
    divida_total: debt,
    numero_acoes_estimado: Math.round(shares),
    aviso: "Estimativa indicativa, muito sensível às premissas; os cenários não são previsões. Não é aconselhamento financeiro.",
    alerta_peso_terminal: scenarioValues.some(
      (scenario) => scenario.peso_terminal_pct !== null &&
        scenario.peso_terminal_pct > 80
    )
      ? "O valor terminal representa mais de 80% do valor operacional em pelo menos um cenário. A avaliação é especialmente sensível às premissas de longo prazo."
      : null
  };
}
