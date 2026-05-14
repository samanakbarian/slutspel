import { useEffect } from 'react';
import { useSillyStore } from '../store/useSillyStore';
import { LiveFeed } from '../components/silly/LiveFeed';

export function SillySeason() {
    const { data, isLoading, error, fetchData } = useSillyStore();

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className="page animate-fade-up">
                <section className="signal-card">
                    <p className="card-kicker">Rykten & Nyheter</p>
                    <h2 className="card-title">Laddar nyhetsflödet...</h2>
                </section>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page animate-fade-up">
                <section className="signal-card signal-card-critical">
                    <p className="card-kicker">Rykten & Nyheter</p>
                    <h2 className="card-title">Kunde inte hämta data</h2>
                    <p className="card-text">{error}</p>
                    <button
                        onClick={() => fetchData()}
                        style={{
                            marginTop: '0.75rem',
                            padding: '0.4rem 1rem',
                            background: 'var(--brand-green)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Försök igen
                    </button>
                </section>
            </div>
        );
    }

    if (!data) return null;

    const totalArticles = data.news_feed?.length || 0;
    const tagCounts = data._meta?.tagCounts || {};

    return (
        <div className="page animate-fade-up">
            {/* Header */}
            <section className="signal-card signal-card-primary">
                <p className="card-kicker">Silly Season {data.season}</p>
                <h2 className="card-title">{data.headline || 'Nyhetsflödet'}</h2>
                <p className="card-text">
                    {totalArticles} nyheter skrapade
                    {data._meta?.lastRefresh && (
                        <> • Senast {new Date(data._meta.lastRefresh).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                </p>
            </section>

            {/* Tag Stats */}
            {Object.keys(tagCounts).length > 0 && (
                <section className="signal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    {Object.entries(tagCounts).map(([tag, count]) => {
                        const colors: Record<string, string> = {
                            'BEKRÄFTAT_NYFÖRVÄRV': 'var(--impact-positive)',
                            'KONTRAKTSFÖRLÄNGNING': 'var(--impact-neutral)',
                            'BEKRÄFTAD_FÖRLUST': 'var(--impact-negative)',
                            'HETT_RYKTE': 'var(--brand-gold)',
                        };
                        const labels: Record<string, string> = {
                            'BEKRÄFTAT_NYFÖRVÄRV': 'Nyförvärv',
                            'KONTRAKTSFÖRLÄNGNING': 'Förlängningar',
                            'BEKRÄFTAD_FÖRLUST': 'Förluster',
                            'HETT_RYKTE': 'Rykten',
                        };
                        return (
                            <div key={tag} className="signal-card" style={{ borderLeftColor: colors[tag] || 'var(--text-muted)', textAlign: 'center', padding: '0.7rem' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: colors[tag] || 'var(--text-muted)' }}>{count}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {labels[tag] || tag}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {/* Live Feed */}
            <LiveFeed />
        </div>
    );
}
