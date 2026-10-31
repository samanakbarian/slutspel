import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { Delningsbild } from './share/Delningsbild';
import { AGAINST, BRAND, CARD_SIZE, DISPLAY, GOLD, INK, INK_2, INK_3, SANS, drawFrame, tracked } from './share/matchCard';

/**
 * Spelarprofilen: åtta mått per match, som percentil mot seriens forwards
 * eller backar. Radarn är formen man känner igen från de avancerade
 * profilerna; måtten är de som går att räkna ur Swehockey för alla lag.
 * Istid och skottpositioner saknas där, så det blir per match och inte per
 * 60 minuter, och ingen xG.
 *
 * Samma radar ritas som delningsbild, med sida377.se i bilden.
 */
type Profil = {
  name: string; team: string; number: number | null; position: string; group: 'F' | 'D'; role: 'topp' | 'ovriga' | null; compared_with?: number;
  games_played: number; goals: number; assists: number; points: number;
  values: Record<string, number>;
  percentiles: Record<string, number | null> | null;
};
type Svar = { status: string; season: string; min_games: number; pool: Record<string, number>; players: Profil[] };

// Fem mot fem är kärnan; powerplay och disciplin står för sig.
const AXLAR: { key: string; namn: string; kort: string; text: (v: number) => string }[] = [
  { key: 'mal', namn: 'Mål, 5 mot 5', kort: 'Mål', text: v => per(v) },
  { key: 'assist1', namn: 'Förstaassist, 5 mot 5', kort: 'Första-\nassist', text: v => per(v) },
  { key: 'assist2', namn: 'Andraassist, 5 mot 5', kort: 'Andra-\nassist', text: v => per(v) },
  { key: 'isen_for', namn: 'Mål för på isen, 5 mot 5', kort: 'Mål för\npå isen', text: v => per(v) },
  { key: 'isen_emot', namn: 'Mål emot på isen, 5 mot 5', kort: 'Defensiv', text: v => per(v) },
  { key: 'isen_andel', namn: 'Målandel på isen, 5 mot 5', kort: 'Målandel\npå isen', text: v => `${Math.round(v)} %` },
  { key: 'pp_poang', namn: 'Powerplaypoäng', kort: 'Power-\nplay', text: v => per(v) },
  { key: 'utv_min', namn: 'Utvisningsminuter', kort: 'Disciplin', text: v => `${v.toFixed(1).replace('.', ',')} min` },
];
function per(v: number): string { return v.toFixed(2).replace('.', ','); }
const nyckel = (n: string) => n.replace(/[*]+/g, '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
const fornamnEfternamn = (n: string) => {
  const [e, f] = n.split(',').map(s => s.trim());
  return { fornamn: f || '', efternamn: e || n };
};

/**
 * `jmf`: en lagkamrat att rita i samma radar. `inbaddad`: utan kortets ram,
 * för spelarsidans jämförelse som har sin egen.
 */
export function SpelarProfil({ name, season, jmf, inbaddad }: { name: string; season: string; jmf?: string; inbaddad?: boolean }) {
  const [data, setData] = useState<Svar | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/spelarprofiler${season ? `?season=${encodeURIComponent(season)}` : ''}`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d?.status === 'ok' ? d : null))
      .catch(() => { /* kortet syns inte */ });
    return () => ctrl.abort();
  }, [season]);

  if (!data) return null;
  const p = data.players.find(x => nyckel(x.name) === nyckel(name));
  if (!p || !p.percentiles) return null;
  // Vilka spelaren jämförs med: samma position och roll, som rollen ersätter istiden.
  const grupp = p.group === 'D'
    ? (p.role === 'topp' ? 'backar i par 1–2' : p.role === 'ovriga' ? 'backar i par 3' : 'backar')
    : (p.role === 'topp' ? 'forwards i kedja 1–2' : p.role === 'ovriga' ? 'forwards i kedja 3–4' : 'forwards');
  const antal = p.compared_with ?? data.pool[p.group];
  const { fornamn, efternamn } = fornamnEfternamn(p.name);
  const pcts = AXLAR.map(a => p.percentiles?.[a.key] ?? 0);
  const q = jmf ? data.players.find(x => nyckel(x.name) === nyckel(jmf) && x.percentiles) ?? null : null;
  const qpcts = q ? AXLAR.map(a => q.percentiles?.[a.key] ?? 0) : null;
  const ton = (v: number) => (v >= 67 ? ' pf-hog' : v <= 33 ? ' pf-lag' : '');
  const kort = (n: string) => fornamnEfternamn(n).efternamn;

  const innehall = (
    <>
      <Radar varden={pcts} jmf={qpcts} />
      {q && (
        <div className="sr-leg sr-leg-mitt">
          <span><i className="sr-leg-vi" />{kort(p.name)}</span>
          <span><i className="sr-leg-b" />{kort(q.name)}</span>
        </div>
      )}
      {q && qpcts ? (
        <div className="pf-lista pf-lista-jmf">
          <div className="pf-rad pf-huvud">
            <span />
            <span className="pf-a">{kort(p.name)}</span>
            <span className="pf-b">{kort(q.name)}</span>
          </div>
          {AXLAR.map((a, i) => (
            <div key={a.key} className="pf-rad">
              <span className="pf-namn">{a.namn}</span>
              <span className={`pf-pct${ton(pcts[i])}`}>{pcts[i]}</span>
              <span className={`pf-pct${ton(qpcts[i])}`}>{qpcts[i]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="pf-lista">
          {AXLAR.map((a, i) => (
            <div key={a.key} className="pf-rad">
              <span className="pf-namn">{a.namn}</span>
              <span className="pf-varde">{a.text(p.values[a.key] ?? 0)}</span>
              <span className={`pf-pct${ton(pcts[i])}`}>{pcts[i]}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mc-note">
        Per match, percentil mot seriens {antal} {grupp}.{q && q.group !== p.group ? ` ${kort(q.name)} jämförs med seriens ${q.group === 'D' ? 'backar' : 'forwards'}.` : ''} Streckat är mitten.
      </p>
    </>
  );
  const dela = (
    <Delningsbild
      draw={ctx => ritaProfil(ctx, p, pcts, data.season, `${antal} ${grupp}`)}
      filnamn={`profil-${efternamn.toLowerCase().replace(/[^a-zåäö0-9]+/g, '-')}.png`}
      titel={`${fornamn} ${efternamn} – spelarprofil`}
      beskrivning={`${fornamn} ${efternamn} mot seriens ${grupp}, sida377.se`}
      rubrik={`${fornamn} ${efternamn}`.toUpperCase()}
      nyckel={`${p.name}-${pcts.join(',')}`}
    />
  );
  if (inbaddad) return <>{innehall}{!q && dela}</>;

  return (
    <section className="mc-card">
      <p className="mc-kicker">Spelarprofil</p>
      {innehall}
      {dela}
    </section>
  );
}

/** Radarn på sidan: åtta axlar, 0 i mitten, 100 ytterst, 50 streckad. */
function Radar({ varden, jmf }: { varden: number[]; jmf?: number[] | null }) {
  const S = 320, C = S / 2, R = 108;
  const punkt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / AXLAR.length) * Math.PI * 2;
    return [C + Math.cos(a) * R * (v / 100), C + Math.sin(a) * R * (v / 100)];
  };
  const form = varden.map((v, i) => punkt(i, Math.max(4, v)).map(n => n.toFixed(1)).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="pf-svg" role="img"
      aria-label={AXLAR.map((a, i) => `${a.namn} ${varden[i]}`).join(', ')}>
      {[25, 75, 100].map(r => <circle key={r} cx={C} cy={C} r={(R * r) / 100} className="pf-ring" />)}
      <circle cx={C} cy={C} r={R / 2} className="pf-median" />
      {AXLAR.map((_, i) => { const [x, y] = punkt(i, 100); return <line key={i} x1={C} y1={C} x2={x} y2={y} className="pf-ring" />; })}
      {jmf && <polygon points={jmf.map((v, i) => punkt(i, Math.max(4, v)).map(n => n.toFixed(1)).join(',')).join(' ')} className="pf-yta-b" />}
      <polygon points={form} className="pf-yta" />
      {varden.map((v, i) => { const [x, y] = punkt(i, Math.max(4, v)); return <circle key={i} cx={x} cy={y} r={3.2} className="pf-punkt" />; })}
      {AXLAR.map((a, i) => {
        const [x, y] = punkt(i, 128);
        const rader = a.kort.split('\n');
        return (
          <text key={a.key} x={x} y={y - (rader.length - 1) * 5.5 + 3} textAnchor="middle" className="pf-axel">
            {rader.map((r, k) => <tspan key={k} x={x} dy={k ? 11 : 0}>{r}</tspan>)}
          </text>
        );
      })}
    </svg>
  );
}

/** Delningsbilden: samma radar, 1080 × 1080, med namn och källa. */
function ritaProfil(ctx: CanvasRenderingContext2D, p: Profil, pcts: number[], sasong: string, jmf: string) {
  const S = CARD_SIZE, PAD = 58;
  drawFrame(ctx, [sasong]);
  const { fornamn, efternamn } = fornamnEfternamn(p.name);

  ctx.textAlign = 'left';
  ctx.fillStyle = INK_2;
  ctx.font = `500 34px ${SANS}`;
  tracked(ctx, fornamn.toUpperCase(), PAD, 190, 4);
  ctx.fillStyle = INK;
  ctx.font = `700 96px ${DISPLAY}`;
  ctx.fillText(efternamn.toUpperCase(), PAD - 4, 282);
  ctx.fillStyle = INK_3;
  ctx.font = `400 30px ${SANS}`;
  const pos = p.group === 'D' ? 'Back' : 'Forward';
  ctx.fillText(`Björklöven · ${pos}${p.number ? ` · #${p.number}` : ''} · ${p.games_played} matcher · ${p.goals}+${p.assists}`, PAD, 330);

  // Radarn.
  const C = { x: S / 2, y: 672 }, R = 212;
  const punkt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / AXLAR.length) * Math.PI * 2;
    return [C.x + Math.cos(a) * R * (v / 100), C.y + Math.sin(a) * R * (v / 100)];
  };
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  for (const r of [25, 75, 100]) { ctx.beginPath(); ctx.arc(C.x, C.y, (R * r) / 100, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < AXLAR.length; i++) { const [x, y] = punkt(i, 100); ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(x, y); ctx.stroke(); }
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(241,247,244,0.45)';
  ctx.beginPath(); ctx.arc(C.x, C.y, R / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  pcts.forEach((v, i) => { const [x, y] = punkt(i, Math.max(4, v)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath();
  ctx.fillStyle = 'rgba(66,216,131,0.28)';
  ctx.fill();
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 4;
  ctx.stroke();
  pcts.forEach((v, i) => {
    const [x, y] = punkt(i, Math.max(4, v));
    ctx.fillStyle = v >= 67 ? GOLD : v <= 33 ? AGAINST : BRAND;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  });

  // Axlarna med percentilen under namnet.
  ctx.textAlign = 'center';
  AXLAR.forEach((a, i) => {
    const [x, y] = punkt(i, 128);
    const rader = a.kort.split('\n');
    ctx.fillStyle = INK_2;
    ctx.font = `500 27px ${SANS}`;
    rader.forEach((r, k) => ctx.fillText(r, x, y - (rader.length - 1) * 15 + k * 30));
    ctx.fillStyle = pcts[i] >= 67 ? GOLD : pcts[i] <= 33 ? AGAINST : INK;
    ctx.font = `700 34px ${DISPLAY}`;
    ctx.fillText(String(pcts[i]), x, y + (rader.length - 1) * 15 + 38);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = INK_3;
  ctx.font = `400 24px ${SANS}`;
  ctx.fillText(`Per match · percentil mot seriens ${jmf} · streckat = mitten`, PAD, S - 40);
}
