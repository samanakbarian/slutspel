import { useState } from 'react';
import type { ReactNode } from 'react';
import { MATT, MINSTA_MATCHER, formatMatt, komma, placering } from '../lib/serien';
import type { LeagueData, LeagueTeam } from '../lib/serien';

/**
 * Laget mot resten av serien.
 *
 * Ett tal som "PP 20 %" säger inget förrän man vet vad de andra har. Källan
 * är Swehockeys egen lagstatistik, som backend hämtar för alla fjorton lag
 * (/api/v1/league). Placeringen delas vid lika värde i stället för att
 * skiljas på namn.
 */

/**
 * Hela serien på en linje: en prick per lag, vårt större och grönt.
 *
 * Höger är alltid bättre, även för insläppta och utvisningar. Annars hade
 * ögat fått vända riktning från rad till rad.
 */
function Linje({ teams, k, higher, snitt }: { teams: LeagueTeam[]; k: string; higher: boolean; snitt: number | null }) {
  const vals = teams.map(t => t.values[k]).filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const W = 300, H = 18, P = 7;
  const x = (v: number) => {
    const f = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return P + (higher ? f : 1 - f) * (W - 2 * P);
  };
  const oss = teams.find(t => t.is_ours);
  return (
    <svg className="se-linje" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line className="se-spar" x1={P} x2={W - P} y1={H / 2} y2={H / 2} />
      {snitt != null && snitt >= lo && snitt <= hi && (
        <line className="se-snitt" x1={x(snitt)} x2={x(snitt)} y1={3} y2={H - 3} />
      )}
      {teams.filter(t => !t.is_ours && t.values[k] != null).map(t => (
        <circle key={t.code} className="se-lag" cx={x(t.values[k] as number)} cy={H / 2} r={3}>
          <title>{`${t.team}: ${formatMatt(k, t.values[k])}`}</title>
        </circle>
      ))}
      {oss && oss.values[k] != null && (
        <circle className="se-vi" cx={x(oss.values[k] as number)} cy={H / 2} r={5}>
          <title>{`${oss.team}: ${formatMatt(k, oss.values[k])}`}</title>
        </circle>
      )}
    </svg>
  );
}

/** Kortets ram, eller bara innehållet när det bäddas in i ett annat kort. */
function Ram({ bar, kicker, children }: { bar?: boolean; kicker: string; children: ReactNode }) {
  if (bar) return <>{children}</>;
  return (
    <section className="mc-card">
      <p className="mc-kicker">{kicker}</p>
      {children}
    </section>
  );
}

export function SerienKort({ data, bar }: { data: LeagueData; bar?: boolean }) {
  const [alla, setAlla] = useState(false);
  const oss = data.teams.find(t => t.is_ours);
  if (!oss) return null;

  if (oss.gp < MINSTA_MATCHER) {
    return (
      <Ram bar={bar} kicker="Serien">
        <p className="mc-text">Placeringar i serien visas efter {MINSTA_MATCHER} omgångar.</p>
      </Ram>
    );
  }

  const visas = MATT.filter(m => alla || !m.fler);
  return (
    <Ram bar={bar} kicker={`Serien · ${data.teams.length} lag`}>
      <div className="se-rader">
        {visas.map(m => (
          <div className="se-rad" key={m.key}>
            <span className="se-namn">{m.label}</span>
            <span className="se-varde">
              <b>{formatMatt(m.key, oss.values[m.key])}</b>
              <i>{placering(oss, m.key)}</i>
            </span>
            <Linje teams={data.teams} k={m.key} higher={data.higher_is_better[m.key] !== false} snitt={data.league[m.key]} />
          </div>
        ))}
      </div>
      <button className="st-more" onClick={() => setAlla(v => !v)}>
        {alla ? 'Färre mått' : 'Fler mått'}
      </button>
      <p className="mc-note">En prick per lag, höger är bättre. Strecket är snittet.</p>
    </Ram>
  );
}

/**
 * Skottandel mot PDO, alla lag.
 *
 * Två frågor om samma säsong: styr laget matcherna, och går pucken in? Ett
 * lag långt upp men till vänster vinner på skjut- och räddningsprocent, och
 * sådant brukar inte hålla en hel säsong. Samma skala på båda sidor om
 * mittlinjerna, så att avståndet till 50 och 100 går att jämföra.
 */
export function SpelOchTur({ data, bar }: { data: LeagueData; bar?: boolean }) {
  const oss = data.teams.find(t => t.is_ours);
  const lag = data.teams.filter(t => t.values.shot_share != null && t.values.pdo != null);
  if (!oss || oss.gp < MINSTA_MATCHER || lag.length < 4) return null;

  const W = 340, H = 250, L = 30, R = 10, T = 12, B = 30;
  const xs = lag.map(t => t.values.shot_share as number);
  const ys = lag.map(t => t.values.pdo as number);
  const dx = Math.max(3, ...xs.map(v => Math.abs(v - 50))) + 1;
  const dy = Math.max(2, ...ys.map(v => Math.abs(v - 100))) + 0.8;
  const x = (v: number) => L + ((v - (50 - dx)) / (2 * dx)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - (100 - dy)) / (2 * dy)) * (H - T - B);

  // Etiketter till höger om pricken, vänster om det är trångt, annars ingen.
  // Pricken bär ändå lagets namn när man trycker på den.
  const upptagna: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const krockar = (b: { x0: number; x1: number; y0: number; y1: number }) =>
    b.x0 < L || b.x1 > W - R || upptagna.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const ordning = [...lag].sort((a, b) => Number(b.is_ours) - Number(a.is_ours));
  for (const t of ordning) {
    upptagna.push({ x0: x(t.values.shot_share as number) - 5, x1: x(t.values.shot_share as number) + 5,
      y0: y(t.values.pdo as number) - 5, y1: y(t.values.pdo as number) + 5 });
  }
  const etiketter = ordning.map(t => {
    const cx = x(t.values.shot_share as number);
    const cy = y(t.values.pdo as number);
    const bredd = t.code.length * 5.6 + 2;
    for (const [ax, anchor] of [[cx + 7, 'start'], [cx - 7, 'end']] as const) {
      const x0 = anchor === 'start' ? ax : ax - bredd;
      const box = { x0, x1: x0 + bredd, y0: cy - 5, y1: cy + 5 };
      if (!krockar(box)) {
        upptagna.push(box);
        return { t, ax, anchor, cy };
      }
    }
    return null;
  });

  return (
    <Ram bar={bar} kicker="Serien · skott och tur">
      <svg className="rl se-spridning" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Andel av skotten mot PDO för seriens lag. ${oss.team}: ${formatMatt('shot_share', oss.values.shot_share)} av skotten, PDO ${komma(oss.values.pdo as number)}.`}>
        <line className="rl-grid" x1={x(50)} x2={x(50)} y1={T} y2={H - B} />
        <line className="rl-grid" x1={L} x2={W - R} y1={y(100)} y2={y(100)} />
        <text className="rl-tick" x={x(50)} y={H - B + 12} textAnchor="middle">50 %</text>
        <text className="rl-tick" x={L - 4} y={y(100) + 3} textAnchor="end">100</text>
        <text className="rl-tick" x={W - R} y={H - 4} textAnchor="end">Andel av skotten →</text>
        <text className="rl-tick" x={L} y={T - 2} textAnchor="start">↑ PDO</text>
        {lag.filter(t => !t.is_ours).map(t => (
          <circle key={t.code} className="se-lag" cx={x(t.values.shot_share as number)} cy={y(t.values.pdo as number)} r={4}>
            <title>{`${t.team}: ${formatMatt('shot_share', t.values.shot_share)} av skotten, PDO ${komma(t.values.pdo as number)}`}</title>
          </circle>
        ))}
        <circle className="se-vi" cx={x(oss.values.shot_share as number)} cy={y(oss.values.pdo as number)} r={6}>
          <title>{`${oss.team}: ${formatMatt('shot_share', oss.values.shot_share)} av skotten, PDO ${komma(oss.values.pdo as number)}`}</title>
        </circle>
        {etiketter.map(e => e && (
          <text key={e.t.code} className={`rl-end${e.t.is_ours ? ' rl-end-ours' : ''}`} x={e.ax} y={e.cy + 3} textAnchor={e.anchor}>
            {e.t.code}
          </text>
        ))}
      </svg>
      <p className="mc-note">PDO är skjutprocent plus räddningsprocent.</p>
    </Ram>
  );
}
