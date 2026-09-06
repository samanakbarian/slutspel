import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { FormDots, PercentileBar, Sparkline } from '../components/charts/Charts';

/**
 * Spelarsidan.
 *
 * Byggd på en fullständig matchlogg — alla matcher spelaren var med i, inte
 * bara de med poäng. Tidigare kom loggen ur målhändelserna, så en
 * 57-poängare fick 34 rader av 51 och en back med femton poäng fick nästan
 * ingenting. Nollmatcherna är halva bilden: utan dem går varken form,
 * svackor eller sviter att läsa.
 *
 * Nyckeltalen anpassas efter position. Swehockey har ingen speltid och inga
 * blockeringar för utespelare — kolumnerna finns i matchrapporten men är
 * tomma genom hela serien — så backarna får plus/minus, skott och on-ice i
 * stället. Centrar får tekningar, som bara finns i rapportens PDF.
 */

type Percentiles = { points: number; goals: number; assists: number; plus_minus: number; pim: number };

type PlayerStats = {
  name: string;
  jersey_number: number | null;
  position: string;
  detailed_position?: string | null;
  birthdate?: string | null;
  age?: number | null;
  is_captain?: boolean;
  is_assistant_captain?: boolean;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  plus_minus: number;
  points_per_game: number;
  shots?: number | null;
  shooting_pct?: number | null;
  faceoffs_won?: number | null;
  faceoffs_lost?: number | null;
  faceoff_pct?: number | null;
  plus_minus_on_ice?: number | null;
  percentiles: Percentiles | null;
  eliteprospects?: { url: string; confidence: string; ep_team?: string | null; born?: string | null } | null;
};

type GameLogRow = {
  game_number: number;
  game_id: number | null;
  date: string;
  opponent: string;
  is_home: boolean;
  goals_for: number | null;
  goals_against: number | null;
  result: 'W' | 'L';
  beyond_regulation: boolean;
  goals: number;
  assists: number;
  points: number;
  cumulative_points: number;
  pim: number;
  shots: number | null;
  official_plus_minus: number | null;
  plus_minus_on_ice: number;
  gf_on: number;
  ga_on: number;
  faceoffs_won: number | null;
  faceoffs_lost: number | null;
  has_report: boolean;
  in_lineup: boolean;
};

type Split = { games: number; goals: number; assists: number; points: number; shots: number | null; plus_minus_on_ice: number };

type PlayerResponse = {
  status: string;
  error?: string;
  note?: string;
  season?: string;
  season_key?: string;
  player: PlayerStats;
  games_with_points: number;
  points_from_events: number;
  game_log: GameLogRow[];
  splits?: { home: Split; away: Split };
  situations?: {
    power_play: number; even_strength: number; short_handed: number;
    game_winning: number; first_goal_of_game: number; empty_net: number;
  };
  streaks?: { current_points: number; longest_points: number; longest_drought: number };
  linemates?: { assisted_by: { name: string; count: number }[]; assists_to: { name: string; count: number }[] };
  report_coverage?: { games_with_report: number; games_total: number };
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
function shortDate(d: string): string {
  const x = new Date(`${d}T00:00:00`);
  return Number.isNaN(x.getTime()) ? d : `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

/** "Efternamn, Förnamn" → "Förnamn Efternamn". Asterisker markerar övergång. */
function humanName(n: string): string {
  const clean = String(n || '').replace(/[*†‡]+/g, '').trim();
  const p = clean.split(',').map(s => s.trim());
  return p.length === 2 && p[1] ? `${p[1]} ${p[0]}` : clean;
}

const shortTeam = (t: string) => String(t || '').replace(/^(IF|IK|HC|BIK)\s+/, '');

function eliteProspectsUrl(p: PlayerStats): string {
  return p.eliteprospects?.url
    || `https://www.eliteprospects.com/search/player?name=${encodeURIComponent(humanName(p.name))}`;
}

const FORWARD = /^(lw|rw|ce|c|f|fw)$/i;
const DEFENCE = /^(ld|rd|d)$/i;

type Filter = 'all' | 'home' | 'away' | 'points';

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="sp-stat">
      <span className="sp-stat-val" style={tone ? { color: tone } : undefined}>{value}</span>
      <span className="sp-stat-lbl">{label}</span>
      {hint && <span className="sp-stat-hint">{hint}</span>}
    </div>
  );
}

export function Spelare() {
  const { name } = useParams<{ name: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const season = params.get('season') || '';

  const [data, setData] = useState<PlayerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);
  // Grannarna i poängligan, för att kunna bläddra utan att gå tillbaka.
  const [squad, setSquad] = useState<string[]>([]);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    setError(null);
    setFilter('all');
    setShowAll(false);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 45000);

    const q = season ? `?season=${encodeURIComponent(season)}` : '';
    fetch(`${API_URL}/api/v1/player/${encodeURIComponent(name)}${q}`, { cache: 'no-store', signal: ctrl.signal })
      .then(r => {
        if (r.status === 404) throw new Error('NOT_DEPLOYED');
        if (!r.ok) throw new Error(`Servern svarade ${r.status}`);
        return r.json();
      })
      .then((j: PlayerResponse) => {
        if (j.status === 'not_found') throw new Error('Spelaren finns inte i säsongens statistik.');
        if (j.status !== 'ok') throw new Error(j.error || 'Kunde inte läsa spelaren.');
        setData(j);
      })
      .catch((e: Error) => setError(
        e.message === 'NOT_DEPLOYED'
          ? 'Spelarprofiler kräver en API-version som ännu inte är driftsatt.'
          : e.name === 'AbortError' ? 'Tidsgränsen gick ut efter 45 sekunder.' : e.message,
      ))
      .finally(() => { window.clearTimeout(timer); setLoading(false); });

    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [name, season]);

  // Bläddringen behöver poängligan. Den får saknas — sidan fungerar utan.
  useEffect(() => {
    const q = season ? `?season=${encodeURIComponent(season)}` : '';
    fetch(`${API_URL}/api/v1/players${q}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => setSquad(((j?.players || []) as { name: string }[]).map(p => p.name)))
      .catch(() => {});
  }, [season]);

  const log = useMemo(() => data?.game_log || [], [data]);

  const filtered = useMemo(() => {
    if (filter === 'home') return log.filter(g => g.is_home);
    if (filter === 'away') return log.filter(g => !g.is_home);
    if (filter === 'points') return log.filter(g => g.points > 0);
    return log;
  }, [log, filter]);

  if (loading) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card"><p className="mc-kicker">Spelare</p><h2 className="mc-title">Laddar…</h2></section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">Spelare</p>
          <h2 className="mc-title">Kunde inte visa spelaren</h2>
          <p className="mc-text">{error}</p>
          <Link to="/statistik" className="mr-back">← Tillbaka till statistiken</Link>
        </section>
      </div>
    );
  }

  const p = data.player;
  const display = humanName(p.name);
  const pos = String(p.detailed_position || p.position || '');
  const isForward = FORWARD.test(pos);
  const isDefence = DEFENCE.test(pos);
  const takesFaceoffs = (p.faceoffs_won || 0) + (p.faceoffs_lost || 0) >= 20;

  const idx = squad.findIndex(n => n === p.name);
  const prev = idx > 0 ? squad[idx - 1] : null;
  const next = idx >= 0 && idx < squad.length - 1 ? squad[idx + 1] : null;
  const go = (who: string) =>
    navigate(`/statistik/spelare/${encodeURIComponent(who)}${season ? `?season=${season}` : ''}`);

  // X-axeln är matchnummer, inte datum: då blir matcher utan poäng platta
  // steg av sig själva, och man ser svackorna i stället för att behöva
  // förklara bort dem.
  const curve = log.map(g => ({ label: String(g.game_number), value: g.cumulative_points }));
  const pace = p.games_played > 0
    ? log.map(g => (p.points / p.games_played) * g.game_number)
    : undefined;

  const rolling = log.length >= 10
    ? log.map((_, i) => {
        if (i < 9) return null;
        const window = log.slice(i - 9, i + 1);
        return { label: String(log[i].game_number), value: window.reduce((s, g) => s + g.points, 0) };
      }).filter(Boolean) as { label: string; value: number }[]
    : [];

  const last10 = log.slice(-10).map(g => (g.points > 0 ? 'W' : 'L'));
  const cov = data.report_coverage;
  const sit = data.situations;
  const sp = data.splits;
  const st = data.streaks;
  const mates = data.linemates;
  const visible = showAll ? filtered : filtered.slice(-10);

  return (
    <div className="page animate-fade-up">
      <Link to="/statistik" className="mr-back">← Statistik</Link>

      <section className="sp-hero">
        <div className="sp-head">
          <span className="sp-num">{p.jersey_number ?? '–'}</span>
          <div className="sp-ident">
            <h2 className="sp-name">
              {display}
              {p.is_captain && <span className="sp-band" title="Lagkapten">C</span>}
              {p.is_assistant_captain && <span className="sp-band sp-band-a" title="Assisterande kapten">A</span>}
            </h2>
            <p className="sp-meta">
              {pos || '–'}
              {p.age != null && ` · ${p.age} år`}
              {data.season && ` · ${data.season}`}
            </p>
          </div>
          {(prev || next) && (
            <div className="sp-nav">
              <button type="button" disabled={!prev} onClick={() => prev && go(prev)}
                      aria-label="Föregående spelare i poängligan">‹</button>
              <button type="button" disabled={!next} onClick={() => next && go(next)}
                      aria-label="Nästa spelare i poängligan">›</button>
            </div>
          )}
        </div>

        <div className="sp-totals">
          <div><span className="sp-val">{p.games_played}</span><span className="sp-lbl">Matcher</span></div>
          <div><span className="sp-val sp-gold">{p.points}</span><span className="sp-lbl">Poäng</span></div>
          <div><span className="sp-val">{p.goals}+{p.assists}</span><span className="sp-lbl">M+A</span></div>
          <div><span className="sp-val sp-green">{p.points_per_game.toFixed(2)}</span><span className="sp-lbl">P/match</span></div>
        </div>
      </section>

      {/* Nyckeltalen skiljer sig åt: en back mäts inte på skjutprocent. */}
      <section className="mc-card">
        <p className="mc-kicker">Nyckeltal</p>
        <div className="sp-stats">
          <Stat label="Plus/minus" value={p.plus_minus > 0 ? `+${p.plus_minus}` : String(p.plus_minus)}
                hint="Swehockeys officiella" />
          <Stat label="På isen" value={
            (p.plus_minus_on_ice ?? 0) > 0 ? `+${p.plus_minus_on_ice}` : String(p.plus_minus_on_ice ?? 0)}
                hint="Härlett ur målhändelserna" />
          {p.shots != null && <Stat label="Skott" value={String(p.shots)} />}
          {isForward && p.shooting_pct != null && (
            <Stat label="Skjutprocent" value={`${p.shooting_pct} %`} tone="var(--brand-green-light)"
                  hint={cov && cov.games_with_report < cov.games_total
                    ? `${cov.games_with_report} matcher` : undefined} />
          )}
          {takesFaceoffs && p.faceoff_pct != null && (
            <Stat label="Tekningar" value={`${p.faceoff_pct} %`}
                  hint={`${p.faceoffs_won}–${p.faceoffs_lost}`} tone="var(--brand-gold)" />
          )}
          {isDefence && <Stat label="Utv.min" value={String(p.pim)} />}
          {!isDefence && <Stat label="Utv.min" value={String(p.pim)} />}
          {sit && <Stat label="PP-mål" value={String(sit.power_play)} />}
        </div>
        {cov && cov.games_with_report < cov.games_total && (
          <p className="mc-note">
            Skott och tekningar finns för {cov.games_with_report} av {cov.games_total} matcher.
            Säsongens första matchrapporter saknas hos Swehockey.
          </p>
        )}
      </section>

      {curve.length > 1 && (
        <section className="mc-card">
          <p className="mc-kicker">Poäng ackumulerat</p>
          <Sparkline points={curve} height={112} unit=" p" guide={pace} guideLabel="takt" />
          <p className="mc-note">
            {p.points} poäng på {p.games_played} matcher. X-axeln är matchnummer, så en platt
            sträcka är matcher utan poäng. Den streckade linjen är säsongens egen takt
            ({p.points_per_game.toFixed(2)} per match) — under den betyder en svacka.
          </p>
        </section>
      )}

      {rolling.length > 1 && (
        <section className="mc-card">
          <p className="mc-kicker">Form — poäng på rullande 10 matcher</p>
          <Sparkline points={rolling} height={104} unit=" p" colour="var(--brand-gold)"
                     fill="rgba(245, 192, 69, 0.12)" />
          {last10.length > 0 && (
            <>
              <p className="mc-kicker st-sub">Senaste {last10.length}</p>
              <FormDots results={last10} />
              <p className="mc-note">Fylld prick är en match med poäng.</p>
            </>
          )}
        </section>
      )}

      {(sp || sit) && (
        <section className="mc-card">
          <p className="mc-kicker">Fördelning</p>
          {sp && (
            <div className="sp-split">
              <div>
                <span className="sp-split-h">Hemma</span>
                <b>{sp.home.points} p</b>
                <span>{sp.home.goals}+{sp.home.assists} på {sp.home.games} matcher</span>
              </div>
              <div>
                <span className="sp-split-h">Borta</span>
                <b>{sp.away.points} p</b>
                <span>{sp.away.goals}+{sp.away.assists} på {sp.away.games} matcher</span>
              </div>
            </div>
          )}
          {sit && (
            <div className="sp-stats sp-stats-tight">
              <Stat label="Lika styrka" value={String(sit.even_strength)} />
              <Stat label="Powerplay" value={String(sit.power_play)} />
              {sit.short_handed > 0 && <Stat label="Underläge" value={String(sit.short_handed)} />}
              {sit.game_winning > 0 && <Stat label="Avgörande" value={String(sit.game_winning)} tone="var(--brand-gold)" />}
              {sit.first_goal_of_game > 0 && <Stat label="Första målet" value={String(sit.first_goal_of_game)} />}
              {sit.empty_net > 0 && <Stat label="Tomt mål" value={String(sit.empty_net)} />}
            </div>
          )}
          <p className="mc-note">Målen fördelade på spelsituation, ur målhändelserna.</p>
        </section>
      )}

      {st && (
        <section className="mc-card">
          <p className="mc-kicker">Sviter</p>
          <div className="sp-stats sp-stats-tight">
            <Stat label="Just nu" value={st.current_points > 0 ? `${st.current_points} matcher` : 'Ingen'}
                  tone={st.current_points > 0 ? 'var(--impact-positive)' : undefined} />
            <Stat label="Längsta poängsvit" value={`${st.longest_points} matcher`} />
            <Stat label="Längsta torka" value={`${st.longest_drought} matcher`} />
          </div>
          <p className="mc-note">Räknat över alla matcher spelaren var med i, inte bara de med poäng.</p>
        </section>
      )}

      {mates && (mates.assisted_by.length > 0 || mates.assists_to.length > 0) && (
        <section className="mc-card">
          <p className="mc-kicker">Kedjekompisar</p>
          <div className="sp-mates">
            {mates.assisted_by.length > 0 && (
              <div>
                <p className="sp-mates-h">Lade fram åt {display.split(' ')[0]}</p>
                {mates.assisted_by.map(m => (
                  <div className="sp-mate" key={`b${m.name}`}>
                    <Link to={`/statistik/spelare/${encodeURIComponent(m.name)}${season ? `?season=${season}` : ''}`}>
                      {humanName(m.name)}
                    </Link>
                    <b>{m.count}</b>
                  </div>
                ))}
              </div>
            )}
            {mates.assists_to.length > 0 && (
              <div>
                <p className="sp-mates-h">{display.split(' ')[0]} lade fram åt</p>
                {mates.assists_to.map(m => (
                  <div className="sp-mate" key={`t${m.name}`}>
                    <Link to={`/statistik/spelare/${encodeURIComponent(m.name)}${season ? `?season=${season}` : ''}`}>
                      {humanName(m.name)}
                    </Link>
                    <b>{m.count}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mc-card">
        <p className="mc-kicker">Percentil</p>
        {p.percentiles ? (
          <>
            <PercentileBar label="Poäng" value={p.percentiles.points} />
            <PercentileBar label="Mål" value={p.percentiles.goals} />
            <PercentileBar label="Assist" value={p.percentiles.assists} />
            <PercentileBar label="Plus/minus" value={p.percentiles.plus_minus} />
            <PercentileBar label="Utv.min" value={p.percentiles.pim} hint="Färre utvisningsminuter ger högre percentil." />
            <p className="mc-note">
              Jämfört med alla utespelare i serien, oavsett position. En back på hög
              poängpercentil är alltså jämförd med forwards också.
            </p>
          </>
        ) : (
          <p className="mc-text">
            Percentil beräknas först vid tio spelade matcher, eftersom enstaka matcher
            ger för stort utslag.
          </p>
        )}
      </section>

      {log.length > 0 && (
        <section className="mc-card">
          <p className="mc-kicker">Matchlogg</p>
          <div className="opp-filter" role="group" aria-label="Filtrera matcher">
            {([['all', `Alla ${log.length}`], ['home', 'Hemma'], ['away', 'Borta'], ['points', 'Med poäng']] as [Filter, string][])
              .map(([key, label]) => (
                <button key={key} type="button" className="opp-chip" aria-pressed={filter === key}
                        onClick={() => { setFilter(key); setShowAll(false); }}>
                  {label}
                </button>
              ))}
          </div>

          <div className="opp-wrap">
            <table className="opp-tbl sp-log">
              <thead>
                <tr>
                  <th scope="col">Match</th>
                  <th scope="col">Motstånd</th>
                  <th scope="col" className="opp-num">M+A</th>
                  <th scope="col" className="opp-num">Skott</th>
                  <th scope="col" className="opp-num">+/−</th>
                  <th scope="col" className="opp-num">Pim</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice().reverse().map(g => (
                  <tr key={g.game_id ?? g.game_number} className={g.points > 0 ? 'sp-scored' : undefined}>
                    <td>
                      <span className="sp-date">{shortDate(g.date)}</span>
                      <span className={`mc-ha${g.is_home ? ' mc-ha-home' : ''}`}>{g.is_home ? 'H' : 'B'}</span>
                    </td>
                    <td className="opp-team">
                      {g.game_id
                        ? <Link to={`/matcher/${g.game_id}`}>{shortTeam(g.opponent)}</Link>
                        : shortTeam(g.opponent)}
                      <span className={`sp-res sp-res-${g.result === 'W' ? 'w' : 'l'}`}>
                        {g.result === 'W' ? 'V' : 'F'}{g.beyond_regulation ? '*' : ''} {g.goals_for}–{g.goals_against}
                      </span>
                    </td>
                    <td className="opp-num">{g.points > 0 ? `${g.goals}+${g.assists}` : '–'}</td>
                    <td className="opp-num">{g.has_report ? (g.shots ?? 0) : '·'}</td>
                    <td className="opp-num">
                      {g.plus_minus_on_ice > 0 ? `+${g.plus_minus_on_ice}` : g.plus_minus_on_ice}
                    </td>
                    <td className="opp-num">{g.pim || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > visible.length && (
            <button type="button" className="sp-more" onClick={() => setShowAll(true)}>
              Visa alla {filtered.length} matcher
            </button>
          )}
          <p className="mc-note">
            Plus/minus i tabellen är härlett ur målhändelserna. En punkt i skottkolumnen
            betyder att matchrapporten saknas, inte noll skott. Stjärna = förlängning.
          </p>
        </section>
      )}

      <a className="sp-ep" href={eliteProspectsUrl(p)} target="_blank" rel="noreferrer">
        Öppna {display} på EliteProspects ↗
      </a>
    </div>
  );
}
