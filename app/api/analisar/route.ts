import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) {
    return Response.json({ error: "Inicia sessão para pedir uma análise." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: "A ligação ao Supabase não está configurada." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: "Sessão inválida. Inicia sessão novamente." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "O pedido não contém JSON válido." }, { status: 400 });
  }

  const prompt = typeof body === "object" && body !== null && "prompt" in body
    ? (body as { prompt?: unknown }).prompt
    : null;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 6000) {
    return Response.json({ error: "Escreve uma pergunta até 6.000 caracteres." }, { status: 400 });
  }

  try {
    const result = streamText({
      model: process.env.VALUEBOT_AI_MODEL || "openai/gpt-5.4",
      system: [
        "És o assistente de análise fundamentalista do ValueBot.",
        "Responde em português europeu, de forma clara e estruturada.",
        "Não inventes preços, indicadores, resultados empresariais nem fontes.",
        "Se não tiveres dados financeiros atuais fornecidos no pedido, explica essa limitação e pede os dados necessários.",
        "Distingue factos, pressupostos e estimativas. Explica riscos e incertezas.",
        "Não apresentes a resposta como aconselhamento financeiro personalizado."
      ].join(" "),
      prompt: prompt.trim(),
      abortSignal: request.signal,
    });

    return result.toTextStreamResponse();
  } catch {
    return Response.json({ error: "Não foi possível iniciar a análise de IA. Confirma a configuração do AI Gateway." }, { status: 502 });
  }
}
