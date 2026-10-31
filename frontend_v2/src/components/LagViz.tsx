import { komma } from '../lib/serien';
import type { LeagueData, LeagueTeam } from '../lib/serien';
import { ordinal } from '../lib/match';
import { PROFIL, kortLag, profil, utfall } from '../lib/lag';
import type { Historik, Lag, LagMatch, Serie } from '../lib/lag';

// Bilderna som jämför lag, delade mellan Serien, Inför matchen och matchrapporten.

/** Åtta axlar, bäst ytterst. Siffran under axeln är placeringen. */
export function LagRadar({ liga, t, vi, jmfKlass = 'sr-radar-vi' }: { liga: LeagueData; t: LeagueTeam; vi?: LeagueTeam; jmfKlass?: string }) {
  const S = 320, C = S / 2, R = 104;
  const punkt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / PROFIL.length) * Math.PI * 2;
    return [C + Math.cos(a) * R * (v / 100), C + Math.sin(a) * R * (v / 100)];
  };
  const form = (vs: number[]) => vs.map((v, i) => punkt(i, Math.max(5, v)).map(n => n.toFixed(1)).join(',')).join(' ');
  const varden = profil(liga, t);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="pf-svg" role="img"
      aria-label={PROFIL.map((a, i) => `${a.kort.replace('\n', '')} ${ordinal(t.ranks[a.key] ?? 0)} (${varden[i]})`).join(', ')}>
      {[25, 75, 100].map(r => <circle key={r} cx={C} cy={C} r={(R * r) / 100} className="pf-ring" />)}
      <circle cx={C} cy={C} r={R / 2} className="pf-median" />
      {PROFIL.map((_, i) => { const [x, y] = punkt(i, 100); return <line key={i} x1={C} y1={C} x2={x} y2={y} className="pf-ring" />; })}
      {vi && <polygon points={form(profil(liga, vi))} className={jmfKlass} />}
      <polygon points={form(varden)} className="sr-radar-vald" />
      {varden.map((v, i) => { const [x, y] = punkt(i, Math.max(5, v)); return <circle key={i} cx={x} cy={y} r={3.2} className="sr-p-vald" />; })}
      {PROFIL.map((a, i) => {
        const [x, y] = punkt(i, 130);
        const rader = a.kort.split('\n');
        const r = t.ranks[a.key];
        return (
          <text key={a.key} x={x} y={y - (rader.length - 1) * 5.5 - 2} textAnchor="middle" className="pf-axel">
            {rader.map((rd, k) => <tspan key={k} x={x} dy={k ? 11 : 0}>{rd}</tspan>)}
            <tspan x={x} dy={12} className={`sr-radar-plats${r != null && r <= 3 ? ' sr-topp' : r != null && r >= liga.teams.length - 2 ? ' sr-botten' : ''}`}>
              {r == null ? '' : ordinal(r)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

/** Mål per match och period för båda lagen: gjorda till vänster om mitten, insläppta till höger. */
export function PerioderJmf({ a, b, klassA = 'sr-ja', klassB = 'sr-jb' }: { a: Lag; b: Lag; klassA?: string; klassB?: string }) {
  const ga = a.games.length || 1, gb = b.games.length || 1;
  const per = [1, 2, 3].map(p => ({
    p,
    a: a.periods!.find(x => x.period === p), b: b.periods!.find(x => x.period === p),
  }));
  const max = Math.max(0.5, ...per.flatMap(x => [(x.a?.gf ?? 0) / ga, (x.a?.ga ?? 0) / ga, (x.b?.gf ?? 0) / gb, (x.b?.ga ?? 0) / gb]));
  const bar = (v: number, k: string) => <span className="sr-pbar"><i className={k} style={{ width: `${(v / max) * 100}%` }} /></span>;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Per period · mål per match</p>
      <div className="sr-leg sr-leg-topp">
        <span className={klassA}><i className={`sr-leg-ruta ${klassA}-fyll`} />{kortLag(a.team)}</span>
        <span className={klassB}><i className={`sr-leg-ruta ${klassB}-fyll`} />{kortLag(b.team)}</span>
      </div>
      <div className="sr-pjmf">
        <span /><span className="sr-pjh">gjorda</span><span className="sr-pjh">insläppta</span>
        {per.map(x => (
          <div key={x.p} className="sr-pjgrupp">
            <span className="sr-pjnamn">{x.p}:a</span>
            {([[x.a, ga, `${klassA}-fyll`, a.team], [x.b, gb, `${klassB}-fyll`, b.team]] as const).map(([d, g, k, t]) => (
              <div key={t} className="sr-pjrad" title={`${t}: ${komma((d?.gf ?? 0) / g, 2)} gjorda och ${komma((d?.ga ?? 0) / g, 2)} insläppta per match`}>
                {bar((d?.gf ?? 0) / g, k)}<em>{komma((d?.gf ?? 0) / g, 2)}</em>
                {bar((d?.ga ?? 0) / g, `${k} sr-pinsl`)}<em>{komma((d?.ga ?? 0) / g, 2)}</em>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Tabellresan: placeringen efter varje omgång för alla lag. Valt lag guld,
 * jämförelselaget blått, Björklöven grönt, resten svagt.
 */
export function Tabellresan({ historik, a, b }: { historik: Historik; a: string; b?: string }) {
  const n = historik.rounds.length;
  const lagen = historik.teams.length;
  if (n < 2) return null;
  const W = 340, H = 210, L = 22, R = 64, T = 10, B = 20;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (r: number) => T + ((r - 1) / Math.max(1, lagen - 1)) * (H - T - B);
  const vi = historik.teams.find(t => /bj[oö]rkl[oö]ven/i.test(t.team))?.team;
  const klass = (t: string) => (t === a ? 'sr-bump-a' : t === b ? 'sr-bump-b' : t === vi ? 'sr-bump-vi' : 'sr-bump');
  const vikt = (t: string) => (t === a ? 3 : t === b ? 2 : t === vi ? 1 : 0);
  const ordning = [...historik.teams].sort((p, q) => vikt(p.team) - vikt(q.team));
  const linje = (rs: (number | null)[]) => rs.map((r, i) => (r == null ? '' : `${i && rs[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(r).toFixed(1)}`)).join(' ');
  return (
    <section className="mc-card">
      <p className="mc-kicker">Tabellresan</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img" aria-label={`Placering omgång för omgång för ${a}${b ? ` och ${b}` : ''}`}>
        {[1, Math.ceil(lagen / 2), lagen].map(r => (
          <text key={r} x={L - 6} y={y(r) + 3} textAnchor="end" className="mg-axel">{r}</text>
        ))}
        {ordning.map(t => {
          const sist = [...t.ranks].reverse().find(r => r != null);
          const v = vikt(t.team);
          return (
            <g key={t.team}>
              <path d={linje(t.ranks)} className={klass(t.team)}><title>{t.team}</title></path>
              {v > 0 && sist != null && (
                <>
                  <circle cx={x(t.ranks.length - 1)} cy={y(sist)} r={v >= 2 ? 3.6 : 2.8} className={`${klass(t.team)}-p`} />
                  <text x={x(n - 1) + 7} y={y(sist) + 3} className={`sr-bump-namn ${klass(t.team)}-t`}>{kortLag(t.team)}</text>
                </>
              )}
            </g>
          );
        })}
        <text x={L} y={H - 4} className="mg-axel">omgång 1</text>
        <text x={x(n - 1)} y={H - 4} textAnchor="end" className="mg-axel">{historik.rounds[n - 1]}</text>
      </svg>
    </section>
  );
}

/**
 * Matchbilden: varje match som en prick, skott för åt höger och skott emot
 * nedåt. Uppe till höger styrde laget matchen. Fylld prick är vinst.
 */
export function Matchbilden({ lag }: { lag: Serie[] }) {
  const alla = lag.flatMap(l => l.games.filter(g => g.shots_for != null && g.shots_against != null).map(g => ({ g, l })));
  if (alla.length < 3) return null;
  const v = alla.flatMap(({ g }) => [g.shots_for as number, g.shots_against as number]);
  const lo = Math.max(0, Math.min(...v) - 3), hi = Math.max(...v) + 3;
  const W = 340, H = 260, L = 30, R = 10, T = 12, B = 30;
  const x = (s: number) => L + ((s - lo) / (hi - lo)) * (W - L - R);
  const y = (s: number) => T + ((s - lo) / (hi - lo)) * (H - T - B);
  const ett = lag.length === 1;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Matchbilden · skott per match</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ts-svg" role="img" aria-label="Skott för och emot i varje match">
        <polygon points={`${x(lo)},${y(lo)} ${x(hi)},${y(lo)} ${x(hi)},${y(hi)}`} className="sr-kvadrant" />
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} className="rl-grid" />
        <text className="rl-tick" x={W - R} y={H - 4} textAnchor="end">Skott för →</text>
        <text className="rl-tick" x={L} y={H - 4} textAnchor="start">↓ skott emot</text>
        <text className="rl-tick" x={x(hi) - 4} y={y(lo) + 12} textAnchor="end">laget styrde</text>
        <text className="rl-tick" x={x(lo) + 4} y={y(hi) - 6} textAnchor="start">motståndaren styrde</text>
        {[Math.ceil(lo / 10) * 10, Math.floor(hi / 10) * 10].filter((t, i, arr) => arr.indexOf(t) === i).map(t => (
          <g key={t}>
            <text className="rl-tick" x={x(t)} y={H - B + 12} textAnchor="middle">{t}</text>
            <text className="rl-tick" x={L - 4} y={y(t) + 3} textAnchor="end">{t}</text>
          </g>
        ))}
        {alla.map(({ g, l }) => {
          const vann = g.goals_for > g.goals_against;
          const k = ett ? (vann ? 'sr-mb-v' : 'sr-mb-f') : `${l.klass}-mb${vann ? '' : ' sr-mb-tom'}`;
          return (
            <circle key={`${l.namn}-${g.game_id}`} cx={x(g.shots_for as number)} cy={y(g.shots_against as number)} r={4.5}
              className={`${k}${g.beyond_regulation ? ' sr-mb-ot' : ''}`}>
              <title>{`${kortLag(l.namn)} ${g.is_home ? 'mot' : 'borta mot'} ${kortLag(g.opponent)} ${g.goals_for}–${g.goals_against}, skott ${g.shots_for}–${g.shots_against}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="sr-leg">
        {ett ? (
          <>
            <span><i className="sr-leg-ruta sr-bar-v sr-leg-rund" />vinst</span>
            <span><i className="sr-leg-ruta sr-bar-f sr-leg-rund" />förlust</span>
          </>
        ) : (
          <>
            {lag.map(l => <span key={l.namn}><i className={`sr-leg-ruta sr-leg-rund ${l.klass}-fyll`} />{kortLag(l.namn)}</span>)}
            <span><i className="sr-leg-ruta sr-leg-rund sr-leg-ring" />ofylld är förlust</span>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Lägen: hur det slutar beroende på ställningen efter två perioder och på
 * vem som gör första målet. Varje rad en stapel med vinster till vänster
 * och förluster till höger.
 */
export function Lagen({ lag }: { lag: Serie[] }) {
  const lagen = (gs: LagMatch[]) => {
    const efter2 = (g: LagMatch) => g.score_by_period && g.score_by_period.length >= 2 ? g.score_by_period[1] : null;
    return [
      { namn: 'Gör första målet', gs: gs.filter(g => g.first_goal === 'for') },
      { namn: 'Släpper in första', gs: gs.filter(g => g.first_goal === 'against') },
      { namn: 'Leder efter två', gs: gs.filter(g => { const s = efter2(g); return s && s[0] > s[1]; }) },
      { namn: 'Lika efter två', gs: gs.filter(g => { const s = efter2(g); return s && s[0] === s[1]; }) },
      { namn: 'Under efter två', gs: gs.filter(g => { const s = efter2(g); return s && s[0] < s[1]; }) },
    ];
  };
  const per = lag.map(l => ({ l, rader: lagen(l.games) }));
  if (!per[0].rader.some(r => r.gs.length)) return null;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Lägen · hur matcherna slutar</p>
      <div className="sr-lagen">
        {per[0].rader.map((r, i) => (
          <div key={r.namn} className="sr-lgrupp">
            <span className="sr-lgnamn">{r.namn}</span>
            {per.map(({ l, rader }) => {
              const gs = rader[i].gs;
              const u = utfall(gs);
              const n = gs.length || 1;
              const vinst = u.v + u.vo;
              return (
                <div key={l.namn} className={`sr-lgrad${per.length > 1 ? ' sr-lgrad-jmf' : ''}`} title={`${kortLag(l.namn)}: ${u.v} vinster, ${u.vo} vinster i förlängning eller straffar, ${u.fo} förluster i förlängning eller straffar, ${u.f} förluster`}>
                  {per.length > 1 && <span className={`sr-lgteam ${l.klass}`}>{kortLag(l.namn)}</span>}
                  <span className="sr-lgbar">
                    <i className="sr-bar-v" style={{ width: `${(u.v / n) * 100}%` }} />
                    <i className="sr-bar-v sr-bar-ot" style={{ width: `${(u.vo / n) * 100}%` }} />
                    <i className="sr-bar-f sr-bar-ot" style={{ width: `${(u.fo / n) * 100}%` }} />
                    <i className="sr-bar-f" style={{ width: `${(u.f / n) * 100}%` }} />
                  </span>
                  <span className="sr-lgtal">{gs.length ? <><b>{vinst}</b> av {gs.length}</> : '–'}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sr-leg">
        <span><i className="sr-leg-ruta sr-bar-v" />vinst</span>
        <span><i className="sr-leg-ruta sr-bar-v sr-bar-ot" />vinst i förl./straffar</span>
        <span><i className="sr-leg-ruta sr-bar-f sr-bar-ot" />förlust i förl./straffar</span>
        <span><i className="sr-leg-ruta sr-bar-f" />förlust</span>
      </div>
    </section>
  );
}
