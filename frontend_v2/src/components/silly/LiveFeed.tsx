import { useSillyStore } from '../../store/useSillyStore';
import type { NewsTag } from '../../types/silly';

const TAG_COLORS: Record<NewsTag, string> = {
    BEKRÄFTAT_NYFÖRVÄRV: 'var(--brand-green-light)',
    BEKRÄFTAD_FÖRLUST: 'var(--impact-negative)',
    HETT_RYKTE: 'var(--brand-gold)',
    KONTRAKTSFÖRLÄNGNING: 'var(--impact-neutral)',
    FORUM_RYKTE: '#a78bfa',
    ÖVRIGT: 'var(--text-muted)'
};

const TAG_LABELS: Record<NewsTag, string> = {
    BEKRÄFTAT_NYFÖRVÄRV: 'BEKRÄFTAT NYFÖRVÄRV',
    BEKRÄFTAD_FÖRLUST: 'BEKRÄFTAD FÖRLUST',
    HETT_RYKTE: 'HETT RYKTE',
    KONTRAKTSFÖRLÄNGNING: 'KONTRAKTSFÖRLÄNGNING',
    FORUM_RYKTE: 'FORUMRYKTE',
    ÖVRIGT: 'ÖVRIGA NYHETER',
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
        'ALL_SILLY', 'BEKRÄFTAT_NYFÖRVÄRV', 'BEKRÄFTAD_FÖRLUST', 'HETT_RYKTE', 'KONTRAKTSFÖRLÄNGNING', 'ÖVRIGT'
    ];

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '1rem' }}>📰 Realtidsflödet</h3>
            
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {filterOptions.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setNewsFilter(tag)}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: newsFilter === tag ? (tag === 'ALL_SILLY' ? 'var(--brand-gold)' : TAG_COLORS[tag as NewsTag]) : 'var(--sponsor-border)',
                            background: newsFilter === tag ? (tag === 'ALL_SILLY' ? 'var(--brand-gold)' : TAG_COLORS[tag as NewsTag]) : 'var(--sponsor-bg)',
                            color: newsFilter === tag ? '#111' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tag === 'ALL_SILLY' ? 'Silly Season' : TAG_LABELS[tag as NewsTag]}
                    </button>
                ))}
            </div>

            {/* News Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredNews.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Inga nyheter att visa.</p>
                )}
                {filteredNews.map((news, idx) => (
                    <div key={idx} style={{ 
                        padding: '1rem', 
                        background: 'var(--sponsor-bg)', 
                        border: '1px solid var(--sponsor-border)', 
                        borderRadius: '8px',
                        borderLeft: `4px solid ${TAG_COLORS[news.tag]}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: TAG_COLORS[news.tag], letterSpacing: '0.05em' }}>
                                {TAG_LABELS[news.tag]}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {new Date(news.date).toLocaleDateString('sv-SE')} • {news.source}
                            </span>
                        </div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                            <a href={news.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)' }}>
                                {news.title}
                            </a>
                        </h4>
                        
                        {/* Impact / AI Analysis Rendering */}
                        {news.impact && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {news.impact.impact_points && (
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--impact-negative)' }}>
                                        {news.impact.impact_points}
                                    </span>
                                )}
                                {news.impact.impact_toi && (
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--impact-negative)' }}>
                                        {news.impact.impact_toi}
                                    </span>
                                )}
                            </div>
                        )}

                        {news.ai_analysis && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <strong>AI Sentiment:</strong>
                                    <div style={{ width: '100px', height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${news.ai_analysis.sentiment_pct}%`, 
                                            height: '100%', 
                                            background: news.ai_analysis.sentiment_pct > 70 ? 'var(--impact-positive)' : news.ai_analysis.sentiment_pct > 40 ? 'var(--brand-gold)' : 'var(--impact-negative)' 
                                        }}></div>
                                    </div>
                                    <span>{news.ai_analysis.sentiment_pct}%</span>
                                </div>
                                {(news.ai_analysis.pros.length > 0 || news.ai_analysis.cons.length > 0) && (
                                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)' }}>
                                        {news.ai_analysis.pros.length > 0 && <div><span style={{ color: 'var(--impact-positive)' }}>+</span> {news.ai_analysis.pros.join(', ')}</div>}
                                        {news.ai_analysis.cons.length > 0 && <div><span style={{ color: 'var(--impact-negative)' }}>-</span> {news.ai_analysis.cons.join(', ')}</div>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
