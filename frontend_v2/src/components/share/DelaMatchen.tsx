import { useEffect, useRef, useState } from 'react';
import type { GoalieLine, MatchReport } from '../../lib/match';
import { isOurs, parsePeriods, surname } from '../../lib/match';
import { CARD_SIZE, cardBlob, cardFontsReady, drawMatchCard } from './matchCard';
import type { CardModel, CardStat, CardStep } from './matchCard';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function longDate(d: string): string {
  const x = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  return Number.isNaN(x.getTime()) ? String(d) : `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

function shortTeam(name: string): string {
  return String(name || '').replace(/^(IF|HC|BIK|IK)\s+/, '').trim();
}

/**
 * Vad matchen handlade om, i tre ord.
 *
 * Ordningen är avsiktlig: en vändning eller en tappad ledning säger mer än
 * segermarginalen, och en nolla säger mer än att det blev vinst. Står inget
 * ut blir brickan tom hellre än att kortet skriver ut en självklarhet.
 */
function eyebrowFor(steps: CardStep[], net: number, against: number, periods: number): string {
  const low = Math.min(0, ...steps.map(s => s.diff));
  const high = Math.max(0, ...steps.map(s => s.diff));
  if (net > 0 && low <= -2) return `Vändning från ${-low} mål under`;
  if (net < 0 && high >= 2) return `Tappade ${high} måls ledning`;
  if (net > 0 && against === 0) return 'Nollan höll';
  if (periods > 4) return net > 0 ? 'Vann på straffar' : 'Förlust på straffar';
  if (periods > 3) return net > 0 ? 'Avgjort i förlängning' : 'Förlust i förlängning';
  if (net >= 4) return 'Övertygande';
  if (net === 0) return 'Oavgjort';
  return '';
}

/**
 * Matchens spelare.
 *
 * Flest poäng vinner, sedan flest mål, sedan den som gjorde det avgörande
 * målet. Höll vi nollan tar målvakten platsen istället — den insatsen syns
 * inte i poängligan.
 */
function heroFor(
  data: MatchReport,
  ourGoals: number,
  theirGoals: number,
  keeper: GoalieLine | undefined,
): CardModel['hero'] {
  if (theirGoals === 0 && keeper?.saves != null) {
    return {
      label: 'Nollan',
      name: surname(keeper.name),
      detail: `${keeper.saves} räddningar`,
    };
  }

  type Tally = { name: string; goals: number; assists: number; first: number };
  const tally = new Map<string, Tally>();
  const bump = (who: string | null, key: 'goals' | 'assists', minute: number) => {
    if (!who) return;
    const row = tally.get(who) || { name: who, goals: 0, assists: 0, first: minute };
    row[key] += 1;
    row.first = Math.min(row.first, minute);
    tally.set(who, row);
  };
  for (const g of data.goals) {
    if (!isOurs(g.team_code)) continue;
    bump(g.scorer, 'goals', g.minute);
    for (const a of g.assists) bump(a, 'assists', g.minute);
  }

  // Avgörande målet: det som gav oss ett mål mer än motståndarens slutsumma.
  const ourScored = data.goals.filter(g => isOurs(g.team_code));
  const winner = ourGoals > theirGoals ? ourScored[theirGoals] : undefined;

  // Vid lika poäng vinner den som gjorde det avgörande målet. Utan det steget
  // fick straffmatchen ovan "matchens spelare" på 25:00, medan den som faktiskt
  // avgjorde på 65:00 inte nämndes alls.
  const best = [...tally.values()].sort(
    (a, b) =>
      b.goals + b.assists - (a.goals + a.assists) ||
      b.goals - a.goals ||
      Number(b.name === winner?.scorer) - Number(a.name === winner?.scorer) ||
      a.first - b.first,
  )[0];

  if (!best) {
    // Blev vi utan poäng är matchens insats målvaktens, oavsett resultat.
    if (keeper?.saves != null) {
      return { label: 'I målet', name: surname(keeper.name), detail: `${keeper.saves} räddningar` };
    }
    return null;
  }

  const parts: string[] = [];
  if (best.goals > 0) parts.push(`${best.goals} mål`);
  if (best.assists > 0) parts.push(`${best.assists} assist`);
  const decided = winner && winner.scorer === best.name;
  return {
    label: decided ? 'Avgjorde' : 'Matchens spelare',
    name: surname(best.name),
    detail: decided ? `${parts.join(' · ')} · ${winner!.time}` : parts.join(' · '),
  };
}

/** Fyra tal under diagrammet, de fyra första som faktiskt går att fylla. */
function statsFor(data: MatchReport, periods: [number, number][], ourSide: 'home' | 'away'): CardStat[] {
  const out: CardStat[] = [];
  const t = data.teams;

  if (t?.ours.shots != null && t.theirs.shots != null) {
    out.push({ label: 'Skott', value: `${t.ours.shots}–${t.theirs.shots}` });
  }

  const ppChances = data.penalties.filter(p => !isOurs(p.team_code) && p.minutes > 0).length;
  const ppGoals = data.goals.filter(g => isOurs(g.team_code) && g.is_power_play).length;
  if (ppChances > 0) out.push({ label: 'Powerplay', value: `${ppGoals} av ${ppChances}` });

  const keeper = (data.goalies || []).find(g => g.is_ours);
  if (keeper?.saves != null && keeper.shots_against != null) {
    out.push({ label: 'Räddningar', value: `${keeper.saves} av ${keeper.shots_against}` });
  }

  // Den period vi vann tydligast — eller, om ingen vanns, den bästa av dem.
  if (periods.length > 0) {
    let bestIdx = 0;
    let bestDiff = -99;
    periods.slice(0, 3).forEach(([h, a], i) => {
      const d = ourSide === 'home' ? h - a : a - h;
      if (d > bestDiff) { bestDiff = d; bestIdx = i; }
    });
    const [h, a] = periods[bestIdx];
    const ours = ourSide === 'home' ? h : a;
    const theirs = ourSide === 'home' ? a : h;
    out.push({ label: `Period ${bestIdx + 1}`, value: `${ours}–${theirs}` });
  }

  if (out.length < 4) {
    const pim = (ours: boolean) =>
      data.penalties.filter(p => isOurs(p.team_code) === ours).reduce((n, p) => n + (p.minutes || 0), 0);
    out.push({ label: 'Utvisningar', value: `${pim(true)}–${pim(false)} min` });
  }
  return out.slice(0, 4);
}

export function buildCardModel(data: MatchReport): CardModel | null {
  const m = (data.result || '').match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;

  const ourSide: 'home' | 'away' = /bj[oö]rkl[oö]ven/i.test(data.home_team) ? 'home' : 'away';
  const hg = parseInt(m[1], 10);
  const ag = parseInt(m[2], 10);
  const ourGoals = ourSide === 'home' ? hg : ag;
  const theirGoals = ourSide === 'home' ? ag : hg;
  const periods = parsePeriods(data.period_results);

  // Ställningen skrivs från Björklövens håll, oavsett vem som gjorde målet,
  // och räknas i samma svep som steget så texten aldrig kan glida isär.
  let us = 0;
  let them = 0;
  const steps: CardStep[] = [...data.goals]
    .sort((a, b) => a.minute - b.minute)
    .map(g => {
      const ours = isOurs(g.team_code);
      if (ours) us += 1; else them += 1;
      return { minute: g.minute, diff: us - them, ours, state: `${us}–${them}` };
    });

  const keeper = (data.goalies || []).find(g => g.is_ours);
  const opponent = shortTeam(ourSide === 'home' ? data.away_team : data.home_team);

  return {
    when: [
      longDate(data.date),
      data.venue || '',
      data.spectators ? data.spectators.toLocaleString('sv-SE') : '',
    ].filter(Boolean),
    eyebrow: eyebrowFor(steps, ourGoals - theirGoals, theirGoals, periods.length),
    score: `${ourGoals}–${theirGoals}`,
    usLabel: 'Björklöven',
    themLabel: `${ourSide === 'home' ? 'hemma' : 'borta'} mot ${opponent}`,
    hero: heroFor(data, ourGoals, theirGoals, keeper),
    steps,
    periods: Math.max(3, periods.length),
    stats: statsFor(data, periods, ourSide),
    outcome: ourGoals > theirGoals ? 'win' : ourGoals < theirGoals ? 'loss' : 'draw',
  };
}

/**
 * Kortet, med knapp för att dela eller spara.
 *
 * `navigator.share` med fil är vägen på telefonen — den lämnar över till
 * systemets delningsmeny, så bilden kan gå direkt till meddelanden eller
 * ett flöde. Saknas den laddas PNG:n ned istället.
 */
export function DelaMatchen({ data }: { data: MatchReport }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const model = buildCardModel(data);

  useEffect(() => {
    if (!model) return;
    let live = true;
    const paint = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && live) drawMatchCard(ctx, model);
    };
    paint();
    // Ritas kortet innan snitten laddat mäts fel bredder och texten hamnar
    // snett. Andra målningen rättar det.
    cardFontsReady().then(paint);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.game_id, data.result, data.goals.length, data.teams, data.goalies]);

  if (!model) return null;

  const filename = `lovenlaget-${data.date || data.game_id}-${model.score.replace('–', '-')}.png`;

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await cardBlob(canvas);
      const file = new File([blob], filename, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: `Björklöven ${model.score}` });
          setStatus('Delat.');
          return;
        } catch (e) {
          // Avbrott är inte ett fel — användaren stängde delningsmenyn.
          if ((e as Error).name === 'AbortError') { setStatus(null); return; }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus('Bilden är sparad.');
    } catch (e) {
      setStatus((e as Error).message || 'Kunde inte skapa bilden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mr-card">
      <p className="mr-kicker">Dela matchen</p>
      <div className="share-wrap">
        <canvas
          ref={canvasRef}
          width={CARD_SIZE}
          height={CARD_SIZE}
          className="share-canvas"
          role="img"
          aria-label={`Delbart kort: Björklöven ${model.score} ${model.themLabel}`}
        />
      </div>
      <button className="share-btn" onClick={share} disabled={busy}>
        {busy ? 'Skapar bild…' : 'Dela som bild'}
      </button>
      <p className="mr-note">
        Kortet är en kvadrat i 1080×1080 och hämtar sina siffror ur samma svar
        som sidan — det kan inte säga något annat än matchrapporten.
        {status && <> {status}</>}
      </p>
    </section>
  );
}
