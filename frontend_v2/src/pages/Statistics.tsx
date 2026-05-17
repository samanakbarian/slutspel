import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';

type StatisticsResponse = {
  status: 'ok' | 'error';
  source?: string;
  scope?: 'team' | 'league_fallback';
  snapshot_scraped_at?: string | null;
  counts?: {
    players_total: number;
    goalies_total: number;
    standings_total: number;
    schedule_total: number;
    team_players: number;
    team_goalies: number;
    team_games: number;
  };
  team_standing?: Record<string, any> | null;
  top_scorers?: Array<Record<string, any>>;
  top_goalies?: Array<Record<string, any>>;
  upcoming_or_recent_games?: Array<Record<string, any>>;
  error?: string;
};

export function StatisticsPage() {
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/v1/statistics`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card">
          <p className="card-kicker">Statistik</p>
          <h2 className="card-title">Laddar Swehockey-data...</h2>
        </section>
      </div>
    );
  }

  if (error || data?.status === 'error') {
    return (
      <div className="page animate-fade-up">
        <section className="signal-card signal-card-warning">
          <p className="card-kicker">Statistik</p>
          <h2 className="card-title">Kunde inte ladda</h2>
          <p className="card-text">{error || data?.error || 'Okänt fel'}</p>
        </section>
      </div>
    );
  }

  const scorersRaw = data?.top_scorers || [];
  const goaliesRaw = data?.top_goalies || [];
  const gamesRaw = data?.upcoming_or_recent_games || [];
  const scorers = scorersRaw.filter((p, idx, arr) => arr.findIndex((x) => x.player_name === p.player_name) === idx);
  const goalies = goaliesRaw.filter((g, idx, arr) => arr.findIndex((x) => x.goalie_name === g.goalie_name) === idx);
  const games = gamesRaw.filter((m, idx, arr) => arr.findIndex((x) => `${x.match_date}-${x.result}` === `${m.match_date}-${m.result}`) === idx);
  const standing = data?.team_standing;

  return (
    <div className="page animate-fade-up">
      <section className="signal-card">
        <p className="card-kicker">Statistik</p>
        <h2 className="card-title">Swehockey Snapshot</h2>
        <p className="card-text">
          Uppdaterad: {data?.snapshot_scraped_at ? new Date(data.snapshot_scraped_at).toLocaleString('sv-SE') : 'okänd tid'}
        </p>
        {data?.scope === 'league_fallback' ? (
          <p className="card-text">Notis: teamträff saknas i denna snapshot, visar ligadata som fallback.</p>
        ) : null}
        <p className="card-text">
          Träffar: spelare {data?.counts?.team_players ?? 0}, målvakter {data?.counts?.team_goalies ?? 0}, matcher {data?.counts?.team_games ?? 0}
        </p>
      </section>

      {standing && (
        <section className="signal-card signal-card-ok">
          <p className="card-kicker">Tabelläge</p>
          <h2 className="card-title">{standing.team_name}</h2>
          <p className="card-text">
            Placering {standing.rank} · Poäng {standing.points} · GP {standing.games_played} · Målskillnad {standing.goal_diff}
          </p>
        </section>
      )}

      <section className="signal-card">
        <p className="card-kicker">Poängliga (lag)</p>
        {scorers.slice(0, 8).map((p, idx) => (
          <p key={`${p.player_name}-${idx}`} className="compact-line">
            {idx + 1}. {p.player_name} · {p.points}p ({p.goals}+{p.assists}) · GP {p.games_played}
          </p>
        ))}
      </section>

      <section className="signal-card">
        <p className="card-kicker">Målvakter</p>
        {goalies.slice(0, 5).map((g, idx) => (
          <p key={`${g.goalie_name}-${idx}`} className="compact-line">
            {idx + 1}. {g.goalie_name} · SV% {g.save_pct} · GA {g.goals_against} · GP {g.games_played}
          </p>
        ))}
      </section>

      <section className="signal-card">
        <p className="card-kicker">Matcher</p>
        {games.slice(0, 10).map((m, idx) => (
          <p key={`${m.match_date}-${idx}`} className="compact-line">
            {m.match_date} · {m.home_team} vs {m.away_team} · {m.result || m.status || '-'}
          </p>
        ))}
      </section>
    </div>
  );
}
