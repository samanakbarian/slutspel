import { useSillyStore } from '../../store/useSillyStore';
import type { Player } from '../../types/silly';

export function SquadRink() {
    const { data } = useSillyStore();

    if (!data) return null;

    const { roster } = data;
    
    // Group players by position
    const goalies = roster.filter(p => p.pos === 'GK');
    const defenders = roster.filter(p => p.pos === 'LD' || p.pos === 'RD');
    const forwards = roster.filter(p => p.pos === 'LW' || p.pos === 'CE' || p.pos === 'RW');

    const renderPlayerBadge = (player: Player, idx: number) => (
        <div key={idx} style={{
            background: player.status === 'NYFÖRVÄRV' || player.status === 'SIGNERAD' ? 'var(--brand-green)' : 'rgba(255,255,255,0.1)',
            border: player.status === 'FÖRLÄNGD' ? '1px solid var(--brand-gold)' : '1px solid transparent',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)'
        }}>
            <span style={{ fontWeight: 800, color: 'var(--brand-gold-light)' }}>{player.number || '-'}</span>
            <span>{player.name}</span>
        </div>
    );

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '1rem' }}>🏒 Lagbygget 2026/2027</h3>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Forwards */}
                <div style={{ flex: '1 1 200px' }}>
                    <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--sponsor-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        Forwards ({forwards.length}/14)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {forwards.map(renderPlayerBadge)}
                        {forwards.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Inga kontrakterade forwards</span>}
                    </div>
                </div>

                {/* Backar */}
                <div style={{ flex: '1 1 200px' }}>
                    <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--sponsor-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        Backar ({defenders.length}/8)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {defenders.map(renderPlayerBadge)}
                        {defenders.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Inga kontrakterade backar</span>}
                    </div>
                </div>

                {/* Målvakter */}
                <div style={{ flex: '1 1 200px' }}>
                    <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--sponsor-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        Målvakter ({goalies.length}/2)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {goalies.map(renderPlayerBadge)}
                        {goalies.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Inga kontrakterade målvakter</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
