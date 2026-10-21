"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Moeda = "EUR" | "USD" | "GBP";
type Parametros = {
  moeda: Moeda;
  capital: number;
  reforco: number;
  rentabilidade: number;
  anos: number;
  inflacao: number;
  crescimento: number;
};
type PontoAno = {
  ano: number;
  investido: number;
  valor: number;
  ganhos: number;
  valorReal: number;
};

const PADRAO: Parametros = {
  moeda: "EUR",
  capital: 1000,
  reforco: 200,
  rentabilidade: 7,
  anos: 20,
  inflacao: 2,
  crescimento: 0,
};

const LIMITES: Record<Exclude<keyof Parametros, "moeda">, [number, number]> = {
  capital: [0, 100_000_000],
  reforco: [0, 1_000_000],
  rentabilidade: [-99, 100],
  anos: [1, 50],
  inflacao: [0, 30],
  crescimento: [0, 100],
};

function limitar(valor: number, minimo: number, maximo: number) {
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(maximo, Math.max(minimo, valor));
}

function calcular(p: Parametros): PontoAno[] {
  const mensal = Math.pow(1 + p.rentabilidade / 100, 1 / 12) - 1;
  let valor = p.capital;
  let investido = p.capital;
  let reforcoMensal = p.reforco;
  const pontos: PontoAno[] = [{
    ano: 0,
    investido,
    valor,
    ganhos: valor - investido,
    valorReal: valor,
  }];

  for (let mes = 1; mes <= p.anos * 12; mes += 1) {
    valor = valor * (1 + mensal) + reforcoMensal;
    investido += reforcoMensal;

    if (mes % 12 === 0) {
      const ano = mes / 12;
      pontos.push({
        ano,
        investido,
        valor,
        ganhos: valor - investido,
        valorReal: valor / Math.pow(1 + p.inflacao / 100, ano),
      });
      reforcoMensal = p.reforco * Math.pow(1 + p.crescimento / 100, ano);
    }
  }

  return pontos;
}

function formatar(valor: number, moeda: Moeda) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: moeda,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(valor) ? valor : 0);
}


function LinhaCampo({
  id,
  titulo,
  valor,
  minimo,
  maximo,
  passo = 1,
  sufixo,
  prefixo,
  aoAlterar,
}: {
  id: string;
  titulo: string;
  valor: number;
  minimo: number;
  maximo: number;
  passo?: number;
  sufixo?: string;
  prefixo?: string;
  aoAlterar: (valor: number) => void;
}) {
  return (
    <div className="calc-field">
      <label htmlFor={id}>{titulo}</label>
      <div className="calc-input-wrap">
        {prefixo && <span aria-hidden="true">{prefixo}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={minimo}
          max={maximo}
          step={passo}
          value={valor}
          onChange={(event) => {
            const n = Number(event.target.value);
            if (event.target.value !== "") aoAlterar(limitar(n, minimo, maximo));
          }}
        />
        {sufixo && <span aria-hidden="true">{sufixo}</span>}
      </div>
    </div>
  );
}

export default function Calculadora() {
  const [parametros, setParametros] = useState<Parametros>(PADRAO);
  const [pronta, setPronta] = useState(false);
  const [mostrarTabela, setMostrarTabela] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const moeda = url.searchParams.get("moeda");
    const lido: Parametros = { ...PADRAO };
    if (moeda === "EUR" || moeda === "USD" || moeda === "GBP") lido.moeda = moeda;

    (Object.keys(LIMITES) as Array<keyof typeof LIMITES>).forEach((chave) => {
      const valor = url.searchParams.get(chave);
      if (valor !== null && valor.trim() !== "") {
        const [min, max] = LIMITES[chave];
        lido[chave] = limitar(Number(valor), min, max);
      }
    });
    setParametros(lido);
    setPronta(true);
  }, []);

  useEffect(() => {
    if (!pronta) return;
    const temporizador = window.setTimeout(() => {
      const url = new URL(window.location.href);
      (Object.keys(parametros) as Array<keyof Parametros>).forEach((chave) => {
        url.searchParams.set(chave, String(parametros[chave]));
      });
      window.history.replaceState({}, "", url.toString());
    }, 200);
    return () => window.clearTimeout(temporizador);
  }, [parametros, pronta]);

  const atualizar = useCallback(
    (chave: Exclude<keyof Parametros, "moeda">, valor: number) => {
      const [min, max] = LIMITES[chave];
      setParametros((atual) => ({ ...atual, [chave]: limitar(valor, min, max) }));
    },
    [],
  );

  const pontos = useMemo(() => calcular(parametros), [parametros]);
  const final = pontos[pontos.length - 1];
  const maxGrafico = Math.max(1, ...pontos.map((p) => p.valor), ...pontos.map((p) => p.investido));
  const polilinha = (campo: "valor" | "investido") =>
    pontos.map((p, i) => {
      const x = 36 + (i / Math.max(1, pontos.length - 1)) * 628;
      const y = 18 + (1 - p[campo] / maxGrafico) * 204;
      return `${x},${y}`;
    }).join(" ");

  return (
    <main className="site-shell calc-shell">
      <nav className="topbar">
        <Link className="brand" href="/" aria-label="ValueBot AI início">
          <span className="brand-mark">V</span>
          <span>valuebot<span className="brand-ai"> AI</span></span>
        </Link>
        <Link className="button button-secondary calc-back" href="/">Voltar ao início</Link>
      </nav>

      <section className="calc-hero">
        <p className="card-kicker">PLANEAMENTO FINANCEIRO</p>
        <h1>Calculadora de <span>investimento.</span></h1>
        <p className="hero-description">
          Simula como o capital, os reforços regulares e a rentabilidade podem
          evoluir ao longo do tempo. Os resultados são estimativas, não garantias.
        </p>
      </section>

      <section className="calc-layout" aria-label="Parâmetros e resultados">
        <div className="auth-card">
          <div className="auth-content">
            <p className="card-kicker">OS TEUS PARÂMETROS</p>
            <div className="calc-field">
              <label htmlFor="moeda">Moeda de apresentação</label>
              <select id="moeda" value={parametros.moeda} onChange={(e) => setParametros((p) => ({ ...p, moeda: e.target.value as Moeda }))}>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dólar americano (USD)</option>
                <option value="GBP">Libra esterlina (GBP)</option>
              </select>
            </div>
            <LinhaCampo id="capital" titulo="Capital inicial" valor={parametros.capital} minimo={0} maximo={100_000_000} passo={100} aoAlterar={(v) => atualizar("capital", v)} />
            <LinhaCampo id="reforco" titulo="Reforço mensal" valor={parametros.reforco} minimo={0} maximo={1_000_000} passo={10} aoAlterar={(v) => atualizar("reforco", v)} />
            <LinhaCampo id="rentabilidade" titulo="Rentabilidade anual estimada" valor={parametros.rentabilidade} minimo={-99} maximo={100} passo={0.1} sufixo="%" aoAlterar={(v) => atualizar("rentabilidade", v)} />
            <LinhaCampo id="anos" titulo="Horizonte temporal" valor={parametros.anos} minimo={1} maximo={50} sufixo="anos" aoAlterar={(v) => atualizar("anos", Math.round(v))} />
            <LinhaCampo id="inflacao" titulo="Inflação anual estimada" valor={parametros.inflacao} minimo={0} maximo={30} passo={0.1} sufixo="%" aoAlterar={(v) => atualizar("inflacao", v)} />
            <LinhaCampo id="crescimento" titulo="Aumento anual do reforço" valor={parametros.crescimento} minimo={0} maximo={100} passo={0.1} sufixo="%" aoAlterar={(v) => atualizar("crescimento", v)} />
            <button className="button button-secondary full-width calc-reset" type="button" onClick={() => setParametros(PADRAO)}>Repor valores iniciais</button>
            <p className="disclaimer">Os valores são editáveis. A moeda altera apenas a apresentação; não existe conversão cambial.</p>
          </div>
        </div>

        <div className="calc-results">
          <div className="auth-card">
            <div className="auth-content">
              <p className="card-kicker">PROJEÇÃO AO FIM DE {parametros.anos} ANOS</p>
              <p className="calc-main-label">Valor futuro estimado</p>
              <p className="calc-main-value">{formatar(final.valor, parametros.moeda)}</p>
              <div className="calc-metrics">
                <div><span>Capital investido</span><strong>{formatar(final.investido, parametros.moeda)}</strong></div>
                <div><span>Ganhos / perdas estimados</span><strong className={final.ganhos >= 0 ? "calc-positive" : "calc-negative"}>{formatar(final.ganhos, parametros.moeda)}</strong></div>
                <div><span>Valor ajustado à inflação</span><strong>{formatar(final.valorReal, parametros.moeda)}</strong></div>
              </div>
            </div>
          </div>

          <div className="auth-card calc-chart-card">
            <div className="auth-content">
              <p className="card-kicker">EVOLUÇÃO DO CAPITAL</p>
              <div className="calc-legend"><span><i className="legend-value" /> Valor estimado</span><span><i className="legend-invested" /> Capital investido</span></div>
              <svg className="calc-chart" viewBox="0 0 700 250" role="img" aria-label="Gráfico do valor estimado e do capital investido ao longo do tempo">
                {[0, 1, 2, 3, 4].map((n) => <line key={n} x1="36" x2="664" y1={18 + n * 51} y2={18 + n * 51} stroke="rgba(184,207,232,.13)" strokeWidth="1" />)}
                <polyline points={polilinha("investido")} fill="none" stroke="#83b9ff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={polilinha("valor")} fill="none" stroke="#9be5bd" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                <text x="36" y="244" fill="#9aaec3" fontSize="11">Ano 0</text>
                <text x="664" y="244" textAnchor="end" fill="#9aaec3" fontSize="11">Ano {parametros.anos}</text>
              </svg>
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-content">
              <button type="button" className="calc-table-toggle" aria-expanded={mostrarTabela} onClick={() => setMostrarTabela((v) => !v)}>
                <span><span className="card-kicker">DETALHE ANUAL</span><strong>Consultar tabela de evolução</strong></span>
                <span aria-hidden="true">{mostrarTabela ? "−" : "+"}</span>
              </button>
              {mostrarTabela && (
                <div className="calc-table-scroll">
                  <table className="calc-table">
                    <thead><tr><th>Ano</th><th>Investido</th><th>Valor estimado</th><th>Ganhos / perdas</th><th>Valor real</th></tr></thead>
                    <tbody>{pontos.map((p) => <tr key={p.ano}><td>{p.ano}</td><td>{formatar(p.investido, parametros.moeda)}</td><td>{formatar(p.valor, parametros.moeda)}</td><td>{formatar(p.ganhos, parametros.moeda)}</td><td>{formatar(p.valorReal, parametros.moeda)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
              <p className="disclaimer">A simulação não considera impostos, comissões, volatilidade nem alterações reais das taxas de rentabilidade. O desempenho passado não garante resultados futuros.</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="footer"><span className="brand footer-brand"><span className="brand-mark">V</span> valuebot<span className="brand-ai"> AI</span></span><span>Ferramenta informativa — não constitui aconselhamento financeiro.</span><Link href="/">Página inicial</Link></footer>
    </main>
  );
}
