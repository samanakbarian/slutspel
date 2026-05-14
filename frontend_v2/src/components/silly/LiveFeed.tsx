import { useSillyStore } from '../../store/useSillyStore';
import type { NewsTag } from '../../types/silly';

const TAG_COLORS: Record<NewsTag, string> = {
    BEKRÄFTAT_NYFÖRVÄRV: 'var(--impact-positive)',
    BEKRÄFTAD_FÖRLUST: 'var(--impact-negative)',
    HETT_RYKTE: 'var(--brand-gold)',
    KONTRAKTSFÖRLÄNGNING: 'var(--impact-neutral)',
    FORUM_RYKTE: '#a78bfa',
    ÖVRIGT: 'var(--text-muted)'
};

const TAG_LABELS: Record<NewsTag, string> = {
    BEKRÄFTAT_NYFÖRVÄRV: 'NYFÖRVÄRV',
    BEKRÄFTAD_FÖRLUST: 'FÖRLUST',
    HETT_RYKTE: 'RYKTE',
    KONTRAKTSFÖRLÄNGNING: 'FÖRLÄNGNING',
    FORUM_RYKTE: 'FORUMRYKTE',
    ÖVRIGT: 'ÖVRIGT',
};

export function LiveFeed() {
    const { data, newsFilter, setNewsFilter } = useSillyStore();

    if (!data) return null;

    const filteredNews = data.news_feed.filter(n => {
        if (newsFilter === 'ALL_SILLY') return n.tag !== 'ÖVRIGT' && n.tag !== 'FORUM_RYKTE';
        if (newsFilter === 'ÖVRIGT') return n.tag === 'ÖVRIGT';
        return n.tag === newsFilter;
    });

    const filterOptions: (NewsTag | 'ALL_SILLY')[] = [
        'ALL_SILLY', 'BEKRÄFTAT_NYFÖRVÄRV', 'BEKRÄFTAD_FÖRLUST', 'HETT_RYKTE', 'KONTRAKTSFÖRLÄNGNING'
    ];

    return (
        <div className="signal-card" style={{ padding: '1rem' }}>
            <p className="card-kicker" style={{ marginBottom: '0.75rem' }}>📰 Nyhetsflödet</p>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {filterOptions.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setNewsFilter(tag)}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: 'none',
                            background: newsFilter === tag
                                ? (tag === 'ALL_SILLY' ? 'var(--brand-gold)' : TAG_COLORS[tag as NewsTag])
                                : 'rgba(255,255,255,0.06)',
                            color: newsFilter === tag ? '#111' : 'var(--text-muted)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tag === 'ALL_SILLY' ? 'Alla' : TAG_LABELS[tag as NewsTag]}
                    </button>
                ))}
            </div>

            {/* News Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredNews.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Inga nyheter att visa.</p>
                )}
                {filteredNews.slice(0, 20).map((news, idx) => (
                    <div key={news.id || idx} style={{
                        padding: '0.7rem 0.8rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${TAG_COLORS[news.tag] || 'var(--text-muted)'}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: TAG_COLORS[news.tag],
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase'
                            }}>
                                {TAG_LABELS[news.tag] || news.tag}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                {news.date} • {news.source}
                            </span>
                        </div>
                        <h4 style={{ fontSize: '0.88rem', marginBottom: '0.15rem', lineHeight: 1.3 }}>
                            {news.url ? (
                                <a href={news.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                    {news.title} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>↗</span>
                                </a>
                            ) : news.title}
                        </h4>
                        {news.body && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: '0.2rem' }}>{news.body}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
