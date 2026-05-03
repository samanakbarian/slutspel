import { useEffect } from 'react';
import { useSillyStore } from '../store/useSillyStore';
import { LiveFeed } from '../components/silly/LiveFeed';
import { RumorMeter } from '../components/silly/RumorMeter';
import { SquadRink } from '../components/silly/SquadRink';

export function SillySeason() {
    const { data, isLoading, error, fetchData } = useSillyStore();

    useEffect(() => {
        // Fetch data from GCP backend on mount
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <h2>Laddar Silly Season...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--impact-negative)' }}>
                <h2>Oops! Ett fel uppstod.</h2>
                <p>{error}</p>
                <button 
                    onClick={() => fetchData()}
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--brand-green)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Försök igen
                </button>
            </div>
        );
    }

    if (!data) return null;

    const nyforvarv = data.confirmed_signings.length;
    const forlangda = data.confirmed_extensions.length;
    const lamnar = data.confirmed_departures.length;
    const totalTrupp = data.roster.length;

    return (
        <div className="animate-fade-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '0.1em' }}>
                    SILLY SEASON {data.season}
                </span>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {data.headline}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Björklöven bygger trupp för {data.league}. Senast uppdaterad: {new Date(data.last_manual_update).toLocaleDateString('sv-SE')}
                </p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--brand-gold)' }}>{totalTrupp}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Kontrakterade</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--brand-green)' }}>{nyforvarv}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nyförvärv</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--impact-neutral)' }}>{forlangda}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Förlängda</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--impact-negative)' }}>{lamnar}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lämnar</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Vänster kolumn: Flödet */}
                <div>
                    <LiveFeed />
                </div>
                
                {/* Höger kolumn: Barometer & Trupp */}
                <div>
                    <RumorMeter />
                    <SquadRink />
                </div>
            </div>
        </div>
    );
}
