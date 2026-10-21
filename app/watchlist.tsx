"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Asset = {
  id: string;
  ticker: string;
  nome_empresa: string | null;
  bolsa: string | null;
  moeda: string | null;
  margem_seguranca_alvo: number;
  status_processamento: string;
  preco_atual: number | null;
  valor_intrinseco_estimado: number | null;
  margem_seguranca_atual: number | null;
};

let client: SupabaseClient | null = null;
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

const panel: React.CSSProperties = {
  maxWidth: 1120, margin: "24px auto", padding: "24px",
  border: "1px solid rgba(148,163,184,.22)", borderRadius: 20,
  background: "rgba(15,23,42,.48)", color: "inherit",
};
const field: React.CSSProperties = {
  width: "100%", minWidth: 0, padding: "12px 14px", borderRadius: 10,
  border: "1px solid rgba(148,163,184,.35)", background: "rgba(2,6,23,.35)",
  color: "inherit", font: "inherit",
};
const button: React.CSSProperties = {
  padding: "12px 16px", borderRadius: 10, border: 0,
  background: "#b6f09c", color: "#102015", fontWeight: 700, cursor: "pointer",
};

export default function Watchlist({ userId }: { userId: string | null }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ticker, setTicker] = useState("");
  const [company, setCompany] = useState("");
  const [margin, setMargin] = useState("25");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadAssets = useCallback(async () => {
    if (!userId) { setAssets([]); return; }
    const supabase = getClient();
    if (!supabase) { setMessage("A ligação ao Supabase ainda não está configurada."); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("ativos_monitorizados")
      .select("id,ticker,nome_empresa,bolsa,moeda,margem_seguranca_alvo,status_processamento,preco_atual,valor_intrinseco_estimado,margem_seguranca_atual")
      .eq("utilizador_id", userId)
      .eq("ativo", true)
      .order("created_at", { ascending: false });
    if (error) setMessage("Não foi possível carregar a lista: " + error.message);
    else { setAssets((data ?? []) as Asset[]); setMessage(""); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  async function addAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    const supabase = getClient();
    if (!supabase) { setMessage("A ligação ao Supabase ainda não está configurada."); return; }
    const cleanTicker = ticker.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(cleanTicker)) {
      setMessage("O ticker deve ter até 15 caracteres: letras, números, ponto ou hífen.");
      return;
    }
    setBusy(true); setMessage("");
    const { error } = await supabase.from("ativos_monitorizados").insert({
      utilizador_id: userId,
      ticker: cleanTicker,
      nome_empresa: company.trim() || null,
      margem_seguranca_alvo: Number(margin),
      moeda: "EUR",
    });
    if (error) setMessage("Não foi possível adicionar o ativo: " + error.message);
    else {
      setTicker(""); setCompany(""); setMargin("25");
      setMessage("Ativo adicionado à tua lista.");
      await loadAssets();
    }
    setBusy(false);
  }

  async function removeAsset(id: string) {
    if (!userId) return;
    const supabase = getClient();
    if (!supabase) return;
    setMessage("");
    const { error } = await supabase.from("ativos_monitorizados").delete().eq("id", id).eq("utilizador_id", userId);
    if (error) setMessage("Não foi possível remover o ativo: " + error.message);
    else { setAssets((current) => current.filter((asset) => asset.id !== id)); setMessage("Ativo removido."); }
  }

  if (!userId) return null;

  const money = (value: number | null, currency: string | null) =>
    value == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(value);
  const percent = (value: number | null) => value == null ? "—" : value.toLocaleString("pt-PT", { maximumFractionDigits: 2 }) + "%";

  return (
    <section style={panel} aria-labelledby="watchlist-title">
      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"start",flexWrap:"wrap"}}>
        <div>
          <p style={{fontSize:12,letterSpacing:2,opacity:.7,margin:"0 0 8px"}}>ÁREA PESSOAL · CONTA PRIVADA</p>
          <h2 id="watchlist-title" style={{fontSize:26,margin:"0 0 8px"}}>A minha lista de ativos</h2>
          <p style={{opacity:.75,margin:"0 0 20px"}}>Guarda empresas para acompanhar. Os preços e avaliações só aparecem quando existirem dados de análise.</p>
        </div>
        <button type="button" onClick={() => void loadAssets()} disabled={loading} style={{...button,background:"transparent",color:"inherit",border:"1px solid rgba(148,163,184,.4)"}}>{loading ? "A atualizar…" : "Atualizar lista"}</button>
      </div>

      <form onSubmit={addAsset} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,alignItems:"end",margin:"12px 0 24px"}}>
        <label style={{display:"grid",gap:6,fontSize:13}}>Ticker *<input style={field} value={ticker} onChange={(e)=>setTicker(e.target.value)} placeholder="Ex.: AAPL" maxLength={15} required /></label>
        <label style={{display:"grid",gap:6,fontSize:13}}>Nome da empresa<input style={field} value={company} onChange={(e)=>setCompany(e.target.value)} placeholder="Ex.: Apple Inc." maxLength={200} /></label>
        <label style={{display:"grid",gap:6,fontSize:13}}>Margem de segurança alvo (%)<input style={field} type="number" min="0" max="90" step="1" value={margin} onChange={(e)=>setMargin(e.target.value)} required /></label>
        <button style={button} type="submit" disabled={busy}>{busy ? "A guardar…" : "＋ Adicionar ativo"}</button>
      </form>

      {message && <p role="status" style={{padding:"10px 12px",borderRadius:10,background:"rgba(148,163,184,.1)",fontSize:14}}>{message}</p>}

      {loading ? <p>A carregar os teus ativos…</p> : assets.length === 0 ? (
        <div style={{padding:"24px 12px",textAlign:"center",border:"1px dashed rgba(148,163,184,.3)",borderRadius:14}}>
          <p style={{fontWeight:700,margin:"0 0 6px"}}>A lista ainda está vazia</p>
          <p style={{opacity:.7,margin:0}}>Adiciona o primeiro ticker no formulário acima. Por exemplo, AAPL ou MSFT.</p>
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14,minWidth:650}}>
            <thead><tr style={{textAlign:"left",opacity:.7}}>
              {["Empresa / ticker","Preço atual","Valor intrínseco","Margem atual","Margem alvo",""].map((label)=><th key={label} style={{padding:"12px 10px",borderBottom:"1px solid rgba(148,163,184,.2)",fontWeight:600}}>{label}</th>)}
            </tr></thead>
            <tbody>{assets.map((asset)=><tr key={asset.id}>
              <td style={{padding:"14px 10px",borderBottom:"1px solid rgba(148,163,184,.13)"}}><strong>{asset.ticker}</strong><div style={{opacity:.7,marginTop:3}}>{asset.nome_empresa || "Empresa por identificar"}</div></td>
              <td style={{padding:"14px 10px",borderBottom:"1px solid rgba(148,163,184,.13)"}}>{money(asset.preco_atual,asset.moeda)}</td>
              <td style={{padding:"14px 10px",borderBottom:"1px solid rgba(148,163,184,.13)"}}>{money(asset.valor_intrinseco_estimado,asset.moeda)}</td>
              <td style={{padding:"14px 10px",borderBottom:"1px solid rgba(148,163,184,.13)"}}>{percent(asset.margem_seguranca_atual)}</td>
              <td style={{padding:"14px 10px",borderBottom:"1px solid rgba(148,163,184,.13)"}}>{percent(asset.margem_seguranca_alvo)}</td>
              <td style={{padding:"14px 10px",borderBottom:"1px solid rgba(148,163,184,.13)"}}><button type="button" onClick={()=>void removeAsset(asset.id)} style={{...button,padding:"8px 10px",background:"transparent",color:"inherit",border:"1px solid rgba(248,113,113,.45)"}} aria-label={"Remover "+asset.ticker}>Remover</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <p style={{fontSize:12,opacity:.6,margin:"18px 0 0"}}>Esta lista não executa análises financeiras nem consulta preços em tempo real. Os dados são guardados na tua conta ValueBot.</p>
    </section>
  );
}
