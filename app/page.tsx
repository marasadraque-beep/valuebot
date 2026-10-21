"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import Watchlist from "./watchlist";

type UserInfo = { id: string; email?: string };
let supabase: SupabaseClient | null = null;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !key ||
    url.includes("YOUR_PROJECT_ID") ||
    key.includes("YOUR_SUPABASE")
  ) {
    return null;
  }

  if (!supabase) supabase = createClient(url, key);
  return supabase;
}

export default function Home() {
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = getSupabase();
    setConfigured(Boolean(client));

    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data } = client.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const client = getSupabase();

    if (!client) {
      setMessage(
        "Falta configurar a ligação ao Supabase. Segue as instruções do README."
      );
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setUser(data.user);
        } else {
          setMessage(
            "Registo recebido. Confirma o endereço de email, se o Supabase pedir essa confirmação, e depois inicia sessão."
          );
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setUser(data.user);
        setMessage("Sessão iniciada com sucesso.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação."
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const client = getSupabase();

    if (client) await client.auth.signOut();

    setUser(null);
    setMessage("Terminaste a sessão.");
  }

  return (
    <main className="site-shell">
      <nav className="topbar">
        <Link className="brand" href="/" aria-label="ValueBot AI início">
          <span className="brand-mark">V</span>
          <span>
            valuebot<span className="brand-ai"> AI</span>
          </span>
        </Link>

        <span className="topbar-label">
          <span className="status-dot" /> INVESTIMENTO COM FUNDAMENTO
        </span>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> INVESTE COM CLAREZA
          </div>

          <h1>
            Decisões melhores.
            <br />
            <span>Fundamentos sólidos.</span>
          </h1>

          <p className="hero-description">
            Analisa empresas, acompanha o valor intrínseco e descobre a margem
            de segurança — com informação organizada para apoiar as tuas decisões.
          </p>

          <div className="feature-list">
            <div className="feature">
              <span className="feature-icon">↗</span>
              <div>
                <strong>Análise fundamentalista</strong>
                <small>Indicadores financeiros num só lugar</small>
              </div>
            </div>

            <div className="feature">
              <span className="feature-icon">◎</span>
              <div>
                <strong>Margem de segurança</strong>
                <small>Compara preço e valor estimado</small>
              </div>
            </div>

            <div className="feature">
              <span className="feature-icon">✳</span>
              <div>
                <strong>Inteligência artificial</strong>
                <small>Resumos estruturados e riscos a considerar</small>
              </div>
            </div>
          </div>

          <p className="disclaimer">
            Ferramenta de análise informativa. Não constitui aconselhamento financeiro.
          </p>
        </div>

        <aside className="auth-card">
          <div className="card-orb orb-one" />
          <div className="card-orb orb-two" />

          {user ? (
            <div className="auth-content">
              <div className="card-symbol">✓</div>
              <p className="card-kicker">SESSÃO ATIVA</p>
              <h2>Bem-vindo ao ValueBot.</h2>
              <p className="card-description">
                Iniciaste sessão com <strong>{user.email}</strong>.
              </p>

              <div className="next-step">
                <span className="next-step-number">01</span>
                <div>
                  <strong>Próxima etapa</strong>
                  <p>
                    Já podes consultar e gerir a tua lista de ativos. As avaliações aparecem quando estiverem disponíveis.
                  </p>
                </div>
              </div>

              <button
                className="button button-secondary full-width"
                onClick={signOut}
              >
                Terminar sessão
              </button>
            </div>
          ) : (
            <div className="auth-content">
              <p className="card-kicker">
                {mode === "signup" ? "COMEÇA AQUI" : "BEM-VINDO DE VOLTA"}
              </p>

              <h2>
                {mode === "signup"
                  ? "Cria a tua conta."
                  : "Entra na tua conta."}
              </h2>

              <p className="card-description">
                {mode === "signup"
                  ? "O teu espaço para analisar investimentos com método."
                  : "Continua a acompanhar as tuas análises."}
              </p>

              <div className="auth-tabs">
                <button
                  type="button"
                  className={mode === "signup" ? "tab active" : "tab"}
                  onClick={() => {
                    setMode("signup");
                    setMessage("");
                  }}
                >
                  Criar conta
                </button>

                <button
                  type="button"
                  className={mode === "login" ? "tab active" : "tab"}
                  onClick={() => {
                    setMode("login");
                    setMessage("");
                  }}
                >
                  Iniciar sessão
                </button>
              </div>

              <form onSubmit={handleAuth} className="auth-form">
                <label htmlFor="email">Endereço de email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <label htmlFor="password">Palavra-passe</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  placeholder="Mínimo de 8 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />

                <button
                  className="button button-primary full-width"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "A processar…"
                    : mode === "signup"
                      ? "Criar conta"
                      : "Iniciar sessão"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              {message && (
                <p className="feedback" role="status">
                  {message}
                </p>
              )}

              {!configured && (
                <p className="setup-note">
                  A ligação ao Supabase ainda precisa de ser configurada antes
                  de poderes criar uma conta.
                </p>
              )}

              <p className="privacy-note">
                <span>♢</span> A tua conta e os teus dados devem estar
                protegidos por políticas de acesso.
              </p>
            </div>
          )}
        </aside>
      </section>

      <Watchlist userId={user?.id ?? null} />

      <section className="preview-section">
        <div className="section-heading">
          <div>
            <p className="card-kicker">O TEU ESPAÇO DE ANÁLISE</p>
            <h2>Investir com um plano, não com palpites.</h2>
          </div>
          <span className="preview-tag">PRÉ-VISUALIZAÇÃO</span>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">LISTA DE ATIVOS</span>
            <span className="metric-icon">⌁</span>
            <strong>A acompanhar</strong>
            <p>Organiza as empresas que queres estudar.</p>
          </article>

          <article className="metric-card">
            <span className="metric-label">VALOR INTRÍNSECO</span>
            <span className="metric-icon">◈</span>
            <strong>Valor estimado</strong>
            <p>Compara os fundamentos com o preço.</p>
          </article>

          <article className="metric-card">
            <span className="metric-label">MARGEM DE SEGURANÇA</span>
            <span className="metric-icon">◎</span>
            <strong>Disciplina primeiro</strong>
            <p>Define uma margem antes de decidir.</p>
          </article>
        </div>
      </section>

      <footer className="footer">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark">V</span>
          <span>
            valuebot<span className="brand-ai"> AI</span>
          </span>
        </Link>

        <span>Feito para decisões mais informadas.</span>
        <span>© {new Date().getFullYear()} ValueBot AI</span>
      </footer>
    </main>
  );
}
