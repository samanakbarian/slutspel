import { useEffect, useMemo, useState } from 'react';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_API_URL = 'https://loven-stats-api-324947473206.europe-west1.run.app';
const API_URL = (!RAW_API_URL || RAW_API_URL.includes('localhost') || !RAW_API_URL.includes('loven-stats-api-324947473206.europe-west1.run.app'))
  ? DEFAULT_API_URL
  : RAW_API_URL;

type Sentiment = 'positive' | 'neutral' | 'negative';
type SortMode = 'latest' | 'impact';
type FilterMode = 'all' | Sentiment;

type XItem = {
  id: string;
  text: string;
  created_at: string;
  author_name: string;
  author_username: string;
  url: string | null;
  sentiment_label: Sentiment;
  sentiment_score: number;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    impression_count?: number;
  };
};

type XFeedResponse = {
  query: string;
  count: number;
  items: XItem[];
  sentiment_summary: {
    positive: number;
    neutral: number;
    negative: number;
    positive_pct: number;
    negative_pct: number;
  };
  ai_summary?: {
    enabled: boolean;
    summary: string;
    model: string | null;
    error: string | null;
  };
  meta: {
    generated_at: string;
    from_cache?: boolean;
    cache_minutes?: number;
    error?: string | null;
  };
};

function sentimentColor(label: Sentiment) {
  if (label === 'positive') return 'var(--impact-positive)';
  if (label === 'negative') return 'var(--impact-negative)';
  return 'var(--impact-warning)';
}

function impactScore(item: XItem) {
  const m = item.public_metrics || {};
  return (m.like_count || 0) + ((m.retweet_count || 0) * 2) + ((m.reply_count || 0) * 1.5);
}

export function XFeedPage() {
  const [data, setData] = useState<XFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/x-feed`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const rows = data.items.filter((item) => filter === 'all' ? true : item.sentiment_label === filter);
    if (sortMode === 'impact') {
      return rows.sort((a, b) => impactScore(b) - impactScore(a));
    }
    return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [data, filter, sortMode]);

  const topSignals = useMemo(() => filteredItems.slice(0, 3), [filteredItems]);

  if (isLoading) {
    return <div className="page animate-fade-up"><section className="signal-card"><p className="card-kicker">X-flöde</p><h2 className="card-title">Laddar inlägg...</h2></section></div>;
  }
  if (error || !data) {
    return <div className="page animate-fade-up"><section className="signal-card signal-card-critical"><p className="card-kicker">X-flöde</p><h2 className="card-title">Kunde inte ladda</h2><p className="card-text">{error || 'Okänt fel'}</p><p className="card-text" style={{ marginTop: 8, opacity: 0.8 }}>API_URL i denna build: <code>{API_URL}</code></p></section></div>;
  }

  return (
    <div className="page animate-fade-up">
      <section className="signal-card signal-card-primary">
        <p className="card-kicker">X-pulsen</p>
        <h2 className="card-title">{data.count} träffar · Live-läge</h2>
        <p className="card-text">
          Uppdaterad {new Date(data.meta.generated_at).toLocaleString('sv-SE')} · Intervall {data.meta.cache_minutes || 60} min · {data.meta.from_cache ? 'cache' : 'ny hämtning'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
          <div><div className="compact-line" style={{ color: 'var(--impact-positive)' }}>{data.sentiment_summary.positive_pct}%</div><p className="card-text">Positiv ton</p></div>
          <div><div className="compact-line">{data.sentiment_summary.neutral}</div><p className="card-text">Neutrala</p></div>
          <div><div className="compact-line" style={{ color: 'var(--impact-negative)' }}>{data.sentiment_summary.negative_pct}%</div><p className="card-text">Negativ ton</p></div>
        </div>
      </section>

      {data.ai_summary?.summary ? (
        <section className="signal-card">
          <p className="card-kicker">Sammanfattning</p>
          <p className="card-text" style={{ color: 'var(--text-primary)' }}>{data.ai_summary.summary}</p>
          <p className="card-text" style={{ marginTop: 6 }}>Modell: {data.ai_summary.model || '—'}</p>
        </section>
      ) : (
        <section className="signal-card signal-card-warning">
          <p className="card-kicker">Sammanfattning</p>
          <p className="card-text">AI-sammanfattning saknas just nu ({data.ai_summary?.error || 'okänt skäl'}).</p>
        </section>
      )}

      <section className="signal-card">
        <p className="card-kicker">Kontroller</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button onClick={() => setSortMode('latest')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: sortMode === 'latest' ? 'rgba(37,163,90,.2)' : 'transparent', color: 'var(--text-primary)' }}>Senaste</button>
          <button onClick={() => setSortMode('impact')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: sortMode === 'impact' ? 'rgba(37,163,90,.2)' : 'transparent', color: 'var(--text-primary)' }}>Högst impact</button>
          <button onClick={() => setFilter('all')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: filter === 'all' ? 'rgba(37,163,90,.2)' : 'transparent', color: 'var(--text-primary)' }}>Alla</button>
          <button onClick={() => setFilter('positive')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: filter === 'positive' ? 'rgba(37,163,90,.2)' : 'transparent', color: 'var(--text-primary)' }}>Positiva</button>
          <button onClick={() => setFilter('negative')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: filter === 'negative' ? 'rgba(37,163,90,.2)' : 'transparent', color: 'var(--text-primary)' }}>Negativa</button>
        </div>
      </section>

      <section className="signal-card">
        <p className="card-kicker">Toppsignaler</p>
        {topSignals.map((item) => (
          <div key={`top-${item.id}`} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <p className="card-text" style={{ color: sentimentColor(item.sentiment_label), fontWeight: 700 }}>@{item.author_username || item.author_name} · score {Math.round(impactScore(item))}</p>
            <p className="card-text">{item.text.slice(0, 180)}{item.text.length > 180 ? '…' : ''}</p>
          </div>
        ))}
      </section>

      {filteredItems.map((item) => (
        <section key={item.id} className="signal-card" style={{ borderLeftColor: sentimentColor(item.sentiment_label), padding: '0.75rem' }}>
          <p className="card-kicker">@{item.author_username || item.author_name}</p>
          <p className="card-text" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{item.text}</p>
          <p className="card-text" style={{ marginTop: 6 }}>
            {new Date(item.created_at).toLocaleString('sv-SE')} · ❤️ {item.public_metrics?.like_count || 0} · 🔁 {item.public_metrics?.retweet_count || 0} · 💬 {item.public_metrics?.reply_count || 0}
          </p>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: 'inline-block', color: 'var(--brand-gold)' }}>Öppna på X</a>}
        </section>
      ))}
    </div>
  );
}

