import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { API_URL } from '../config/api';
import { dagrubrik, klockan } from '../lib/feed';

type SortMode = 'latest' | 'impact';

type XItem = {
  id: string;
  text: string;
  created_at: string;
  author_name: string;
  author_username: string;
  url: string | null;
  sentiment_label: string;
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

function impactScore(item: XItem): number {
  const m = item.public_metrics;
  if (!m) return 0;
  return (m.like_count ?? 0) + (m.retweet_count ?? 0) * 2 + (m.reply_count ?? 0) * 1.5;
}

function xTid(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const nu = new Date();
  const min = Math.round((nu.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'nyss';
  if (min < 60) return `${min} min sedan`;
  const tim = Math.round(min / 60);
  if (tim < 12) return `${tim} h sedan`;
  return `${dagrubrik(iso)} · ${klockan(iso)}`;
}

export function XFeedPage() {
  const [data, setData] = useState<XFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [expanderade, setExpanderade] = useState<Set<string>>(new Set());

  useEffect(() => {
    let aktiv = true;
    const hamta = () =>
      fetch(`${API_URL}/api/v1/x-feed`, { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
        .then((j: XFeedResponse) => { if (aktiv) { setData(j); setError(null); } })
        .catch((e: Error) => { if (aktiv) setError(e.message); });
    hamta();
    const id = setInterval(hamta, 120_000);
    return () => { aktiv = false; clearInterval(id); };
  }, []);

  const poster = useMemo(() => {
    if (!data?.items) return [];
    const listan = [...data.items];
    if (sortMode === 'impact') listan.sort((a, b) => impactScore(b) - impactScore(a));
    else listan.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return listan;
  }, [data, sortMode]);

  const toggleExpand = (id: string) => {
    setExpanderade(prev => {
      const ny = new Set(prev);
      if (ny.has(id)) ny.delete(id); else ny.add(id);
      return ny;
    });
  };

  if (error && !data) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">X-flödet</p>
          <p className="mc-text">Kunde inte hämta flödet: {error}</p>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card">
          <p className="mc-kicker">X-flödet</p>
          <p className="mc-text">Laddar…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page animate-fade-up">
      <section className="mc-card xf-header">
        <p className="mc-kicker">X-flödet</p>
        <p className="xf-subtitle">
          {data.count} inlägg · uppdaterat {klockan(data.meta.generated_at)}
        </p>
      </section>

      <div className="mc-seg" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={sortMode === 'latest'}
          className={`mc-segbtn${sortMode === 'latest' ? ' mc-on' : ''}`}
          onClick={() => setSortMode('latest')}
        >
          Senaste
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sortMode === 'impact'}
          className={`mc-segbtn${sortMode === 'impact' ? ' mc-on' : ''}`}
          onClick={() => setSortMode('impact')}
        >
          Mest reaktioner
        </button>
      </div>

      {poster.length > 0 ? (
        <div className="xf-feed">
          {poster.map(item => {
            const m = item.public_metrics;
            const likes = m?.like_count ?? 0;
            const reposts = m?.retweet_count ?? 0;
            const svar = m?.reply_count ?? 0;
            const lang = item.text.length > 280;
            const expanded = expanderade.has(item.id);
            const displayName = item.author_name || item.author_username;

            return (
              <article key={item.id} className="xf-post">
                <span className="xf-avatar">
                  {(displayName || '?')[0].toUpperCase()}
                </span>
                <div>
                  <p className="xf-head">
                    <span className="xf-name">{displayName}</span>
                    {item.author_name && item.author_username && (
                      <span className="xf-handle">@{item.author_username}</span>
                    )}
                    <span className="xf-sep">·</span>
                    <span className="xf-tid">{xTid(item.created_at)}</span>
                  </p>
                  <p className={`xf-text${lang && !expanded ? ' xf-clamp' : ''}`}>
                    {item.text}
                  </p>
                  {lang && (
                    <button className="xf-toggle" onClick={() => toggleExpand(item.id)}>
                      {expanded ? 'Visa mindre' : 'Visa mer ›'}
                    </button>
                  )}
                  <p className="xf-actions">
                    {likes > 0 && <span className="xf-stat"><Heart size={14} strokeWidth={1.5} /> {likes}</span>}
                    {reposts > 0 && <span className="xf-stat"><Repeat2 size={14} strokeWidth={1.5} /> {reposts}</span>}
                    {svar > 0 && <span className="xf-stat"><MessageCircle size={14} strokeWidth={1.5} /> {svar}</span>}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="xf-open">
                        Öppna på X <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="mc-card">
          <p className="mc-text">Inga inlägg just nu.</p>
        </section>
      )}
    </div>
  );
}
