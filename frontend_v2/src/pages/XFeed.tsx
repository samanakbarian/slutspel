import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456';

type XItem = {
  id: string;
  text: string;
  created_at: string;
  author_name: string;
  author_username: string;
  url: string | null;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
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
  meta: {
    generated_at: string;
    error?: string | null;
  };
};

function colorForSentiment(label: XItem['sentiment_label']) {
  if (label === 'positive') return 'var(--impact-positive)';
  if (label === 'negative') return 'var(--impact-negative)';
  return 'var(--impact-warning)';
}

export function XFeedPage() {
  const [data, setData] = useState<XFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return <div className="page animate-fade-up"><section className="signal-card"><p className="card-kicker">X-flöde</p><h2 className="card-title">Laddar inlägg...</h2></section></div>;
  }
  if (error || !data) {
    return <div className="page animate-fade-up"><section className="signal-card signal-card-critical"><p className="card-kicker">X-flöde</p><h2 className="card-title">Kunde inte ladda</h2><p className="card-text">{error || 'Okänt fel'}</p></section></div>;
  }

  return (
    <div className="page animate-fade-up">
      <section className="signal-card">
        <p className="card-kicker">X-samling (Björklöven)</p>
        <h2 className="card-title">{data.count} träffar</h2>
        <p className="card-text">Positiv {data.sentiment_summary.positive} · Neutral {data.sentiment_summary.neutral} · Negativ {data.sentiment_summary.negative}</p>
        {data.meta.error && <p className="card-text" style={{ color: 'var(--impact-warning)', marginTop: 6 }}>API-varning: {data.meta.error}</p>}
      </section>

      {data.items.map((item) => (
        <section key={item.id} className="signal-card" style={{ borderLeftColor: colorForSentiment(item.sentiment_label) }}>
          <p className="card-kicker">@{item.author_username || item.author_name}</p>
          <p className="card-text" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{item.text}</p>
          <p className="card-text" style={{ marginTop: 8 }}>
            Sentiment: <strong style={{ color: colorForSentiment(item.sentiment_label) }}>{item.sentiment_label}</strong> ({item.sentiment_score})
          </p>
          <p className="card-text" style={{ marginTop: 6 }}>
            ❤️ {item.public_metrics?.like_count || 0} · 🔁 {item.public_metrics?.retweet_count || 0} · 💬 {item.public_metrics?.reply_count || 0}
          </p>
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block', color: 'var(--brand-gold)' }}>
              Öppna på X
            </a>
          )}
        </section>
      ))}
    </div>
  );
}

