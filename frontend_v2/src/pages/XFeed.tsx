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
  if (label === 'positive') return '#4ade80';
  if (label === 'negative') return '#f87171';
  return '#94a3b8';
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
      <section className="signal-card x-hero">
        <p className="card-kicker">X-pulsen</p>
        <h2 className="card-title">{data.count} träffar · Live-läge</h2>
        <p className="card-text">
          Uppdaterad {new Date(data.meta.generated_at).toLocaleString('sv-SE')} · Intervall {data.meta.cache_minutes || 60} min · {data.meta.from_cache ? 'cache' : 'ny hämtning'}
        </p>
        <div className="x-stats-grid">
          <div className="x-stat"><div className="x-stat-value">{data.sentiment_summary.positive_pct}%</div><p className="card-text">Positiv ton</p></div>
          <div className="x-stat"><div className="x-stat-value">{data.sentiment_summary.neutral}</div><p className="card-text">Neutrala</p></div>
          <div className="x-stat"><div className="x-stat-value">{data.sentiment_summary.negative_pct}%</div><p className="card-text">Negativ ton</p></div>
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

      <section className="signal-card x-controls">
        <p className="card-kicker">Kontroller</p>
        <div className="x-chip-row">
          <button className={`x-chip ${sortMode === 'latest' ? 'active' : ''}`} onClick={() => setSortMode('latest')}>Senaste</button>
          <button className={`x-chip ${sortMode === 'impact' ? 'active' : ''}`} onClick={() => setSortMode('impact')}>Högst impact</button>
          <button className={`x-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Alla</button>
          <button className={`x-chip ${filter === 'positive' ? 'active' : ''}`} onClick={() => setFilter('positive')}>Positiva</button>
          <button className={`x-chip ${filter === 'negative' ? 'active' : ''}`} onClick={() => setFilter('negative')}>Negativa</button>
        </div>
      </section>

      <section className="signal-card x-top-signals">
        <p className="card-kicker">Toppsignaler</p>
        {topSignals.map((item) => (
          <div key={`top-${item.id}`} className="x-top-item">
            <p className="card-text x-top-meta" style={{ color: sentimentColor(item.sentiment_label) }}>@{item.author_username || item.author_name} · score {Math.round(impactScore(item))}</p>
            <p className="card-text x-top-text">{item.text.slice(0, 180)}{item.text.length > 180 ? '…' : ''}</p>
          </div>
        ))}
      </section>

      {filteredItems.map((item) => (
        <section key={item.id} className="signal-card x-feed-item" style={{ borderLeftColor: sentimentColor(item.sentiment_label) }}>
          <p className="card-kicker x-feed-author">@{item.author_username || item.author_name}</p>
          <p className="card-text x-feed-text">{item.text}</p>
          <p className="card-text x-feed-meta">
            {new Date(item.created_at).toLocaleString('sv-SE')} · ❤️ {item.public_metrics?.like_count || 0} · 🔁 {item.public_metrics?.retweet_count || 0} · 💬 {item.public_metrics?.reply_count || 0}
          </p>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="x-link">Öppna på X</a>}
        </section>
      ))}
    </div>
  );
}
