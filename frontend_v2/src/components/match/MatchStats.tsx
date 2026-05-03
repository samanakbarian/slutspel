import { useMatchStore } from '../../store/useMatchStore';
import type { Team } from '../../types/match';

interface StatBarProps {
    label: string;
    homeValue: number;
    awayValue: number;
    homeTeam: Team;
    awayTeam: Team;
    format?: 'number' | 'percentage';
}

function StatBar({ label, homeValue, awayValue, homeTeam, awayTeam, format = 'number' }: StatBarProps) {
    const total = homeValue + awayValue;
    const homePercentage = total === 0 ? 50 : (homeValue / total) * 100;
    const awayPercentage = 100 - homePercentage;

    const displayHome = format === 'percentage' ? `${homeValue}%` : homeValue;
    const displayAway = format === 'percentage' ? `${awayValue}%` : awayValue;

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{displayHome}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{displayAway}</span>
            </div>
            <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: 'var(--glass-border)' }}>
                <div style={{ width: `${homePercentage}%`, background: homeTeam.color, transition: 'width 0.5s ease' }} />
                <div style={{ width: `${awayPercentage}%`, background: awayTeam.color, transition: 'width 0.5s ease' }} />
            </div>
        </div>
    );
}

export function MatchStats() {
    const { data } = useMatchStore();

    if (!data) return null;

    const { homeTeam, awayTeam } = data;

    return (
        <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                Lagstatistik
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                    <h3 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>{homeTeam.abbreviation}</h3>
                </div>
                <div style={{ width: '20%', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>VS</div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                    <h3 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>{awayTeam.abbreviation}</h3>
                </div>
            </div>

            <StatBar 
                label="Skott på mål" 
                homeValue={homeTeam.shotsOnGoal} 
                awayValue={awayTeam.shotsOnGoal} 
                homeTeam={homeTeam} 
                awayTeam={awayTeam} 
            />
            
            <StatBar 
                label="Tekningar" 
                homeValue={homeTeam.faceoffWinPct} 
                awayValue={awayTeam.faceoffWinPct} 
                homeTeam={homeTeam} 
                awayTeam={awayTeam} 
                format="percentage"
            />
            
            <StatBar 
                label="Powerplay" 
                homeValue={homeTeam.powerplayPct} 
                awayValue={awayTeam.powerplayPct} 
                homeTeam={homeTeam} 
                awayTeam={awayTeam} 
                format="percentage"
            />
            
            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--glass-border)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--brand-gold)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fler moduler kommer</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Expected Goals, Momentum och Istid laddas in här senare.</p>
            </div>
        </div>
    );
}
