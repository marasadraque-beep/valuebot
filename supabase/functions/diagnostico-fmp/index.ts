import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const ALLOWED_SYMBOLS = [
  "AAPL", "MSFT",
  "EDP.LS", "GALP.LS", "JMT.LS",
  "PETR4.SA", "WEGE3.SA", "ITUB4.SA",
  "VWCE.DE", "IWDA.AS", "EXSA.DE",
] as const;

const ENDPOINTS = [
  "profile",
  "quote",
  "income-statement",
  "balance-sheet-statement",
  "cash-flow-statement",
  "discounted-cash-flow",
] as const;

type EndpointResult = {
  endpoint: string;
  status: number;
  classification:
    | "resposta_com_dados"
    | "sem_dados"
    | "sem_acesso_ou_autenticacao"
    | "limite_de_pedidos"
    | "erro_http"
    | "formato_invalido"
    | "erro_de_rede_ou_timeout";
  records?: number;
  returnedSymbol?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

async function checkEndpoint(
  endpoint: string,
  symbol: string,
  apiKey: string,
): Promise<EndpointResult> {
  try {
    const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);

    if (endpoint.endsWith("-statement")) {
      url.searchParams.set("limit", "5");
      url.searchParams.set("period", "annual");
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401 || response.status === 403) {
      return {
        endpoint,
        status: response.status,
        classification: "sem_acesso_ou_autenticacao",
      };
    }

    if (response.status === 429) {
      return {
        endpoint,
        status: response.status,
        classification: "limite_de_pedidos",
      };
    }

    if (!response.ok) {
      return {
        endpoint,
        status: response.status,
        classification: "erro_http",
      };
    }

    if (!Array.isArray(data)) {
      return {
        endpoint,
        status: response.status,
        classification: "formato_invalido",
      };
    }

    if (data.length === 0) {
      return {
        endpoint,
        status: response.status,
        classification: "sem_dados",
        records: 0,
      };
    }

    const first = data[0];
    if (!first || typeof first !== "object") {
      return {
        endpoint,
        status: response.status,
        classification: "formato_invalido",
        records: data.length,
      };
    }

    return {
      endpoint,
      status: response.status,
      classification: "resposta_com_dados",
      records: data.length,
      ...(typeof first.symbol === "string"
        ? { returnedSymbol: first.symbol }
        : {}),
    };
  } catch {
    return {
      endpoint,
      status: 0,
      classification: "erro_de_rede_ou_timeout",
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Utiliza POST." }, 405);
  }

  // Protege a chave e evita que utilizadores autenticados comuns gastem
  // quota da subscrição FMP. Usa o mesmo segredo interno do processador.
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return json({ error: "Não autorizado." }, 401);
  }

  const apiKey = Deno.env.get("FMP_API_KEY");
  if (!apiKey) {
    return json({
      ok: false,
      error: "O segredo FMP_API_KEY não está configurado.",
    }, 500);
  }

  let requested: unknown = ALLOWED_SYMBOLS;
  const rawBody = await req.text();

  if (rawBody.trim().length > 0) {
    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "JSON inválido." }, 400);
    }

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return json({ error: "O corpo deve ser um objeto JSON." }, 400);
    }

    if ("symbols" in body) {
      requested = (body as { symbols?: unknown }).symbols;
    } else {
      return json({ error: "Indica a lista de símbolos." }, 400);
    }
  }

  if (
    !Array.isArray(requested) ||
    requested.length === 0 ||
    requested.length > ALLOWED_SYMBOLS.length ||
    !requested.every(
      (value) =>
        typeof value === "string" &&
        (ALLOWED_SYMBOLS as readonly string[]).includes(value),
    )
  ) {
    return json({
      error: "Lista de símbolos inválida.",
      allowedSymbols: ALLOWED_SYMBOLS,
    }, 400);
  }

  const symbols = [...new Set(requested as string[])];
  const tasks = symbols.flatMap((symbol) =>
    ENDPOINTS.map((endpoint) => ({ symbol, endpoint }))
  );
  const results: Array<{ symbol: string; result: EndpointResult }> = [];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= tasks.length) return;

      const task = tasks[index];
      const result = await checkEndpoint(
        task.endpoint,
        task.symbol,
        apiKey,
      );
      results.push({ symbol: task.symbol, result });
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(4, tasks.length) },
      () => worker(),
    ),
  );

  const summary = symbols.map((symbol) => {
    const checks = results.filter((entry) => entry.symbol === symbol);
    return {
      symbol,
      endpoints: checks.map((entry) => entry.result),
      withData: checks.filter(
        (entry) => entry.result.classification === "resposta_com_dados",
      ).length,
      total: ENDPOINTS.length,
    };
  });

  return json({
    ok: true,
    mode: "read_only",
    databaseWrites: false,
    analysisQuotaUsed: false,
    symbolsChecked: symbols.length,
    requestsAttempted: results.length,
    summary,
  });
});
