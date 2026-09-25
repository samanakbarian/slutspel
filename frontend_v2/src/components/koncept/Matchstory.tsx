import { useState } from 'react';
import type { Goal, MatchReport } from '../../lib/match';
import { isOurs, parsePeriods, surname } from '../../lib/match';

/**
 * Matchen som en story, sida för sida.
 *
 * Först resultatet, sedan målen period för period med en sammanfattning
 * efter varje period, och sist målvakten och de poängbästa. Tryck till
 * höger för nästa sida och till vänster för föregående. Allt byggs ur
 * matchrapporten, så inget skrivs som inte står i protokollet.
 */

type Typ = 'vi' | 'dem' | 'info';
type Sida = { tid: string; stor: string; text: React.ReactNode; typ: Typ };

const kort = (lag: string) => lag.replace(/^IF\s+/, '');
const komma = (v: number) => v.toFixed(1).replace('.', ',');

function spelform(g: Goal): string {
  const raw = String(g.score_state || '').toUpperCase();
  if (g.is_power_play) return 'powerplay';
  if (g.is_short_handed) return 'boxplay';
  if (raw.includes('(GWS)')) return 'straffar';
  if (raw.includes('ENG')) return 'tom bur';
  return '';
}

const periodAv = (g: { minute: number; period?: number | null }) =>
  g.period ?? (g.minute > 60 ? 4 : Math.min(3, Math.floor(g.minute / 20) + 1));

const perPeriod = (s: string | null | undefined) =>
  String(s || '').split(',').map(x => Number(x.trim())).filter(n => !Number.isNaN(n));

const PERIODNAMN = ['', 'Period 1', 'Period 2', 'Period 3', 'Förlängning', 'Straffar'];

export function Matchstory({ data }: { data: MatchReport }) {
  const [i, setI] = useState(0);
  const m = (data.result || '').match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const hg = Number(m[1]);
  const ag = Number(m[2]);
  const hemma = /bj[oö]rkl[oö]ven/i.test(data.home_team);
  const vi = hemma ? hg : ag;
  const de = hemma ? ag : hg;
  const perioder = parsePeriods(data.period_results);
  const efter = perioder.length > 4 ? ' efter straffar' : perioder.length > 3 ? ' efter förlängning' : '';
  const motstandare = kort(hemma ? data.away_team : data.home_team);
  const hemmaNamn = kort(data.home_team);
  const bortaNamn = kort(data.away_team);
  const lag = data.teams;
  const hemmaLag = lag ? (hemma ? lag.ours : lag.theirs) : null;
  const bortaLag = lag ? (hemma ? lag.theirs : lag.ours) : null;
  const par = (h: number | null | undefined, a: number | null | undefined) => `${h ?? '–'}–${a ?? '–'}`;

  const sidor: Sida[] = [{
    tid: `Slut${efter ? ` · ${efter.trim()}` : ''}`,
    stor: `${hg}–${ag}`,
    text: (
      <>
        {hemma ? <><b>Björklöven</b> – {motstandare}</> : <>{motstandare} – <b>Björklöven</b></>}
        <br />
        {vi > de ? 'Vinst' : vi < de ? 'Förlust' : 'Oavgjort'}{efter}
        {data.spectators ? ` · ${data.spectators.toLocaleString('sv-SE')} åskådare` : ''}
        {hemmaLag?.shots != null && bortaLag?.shots != null ? ` · skott ${par(hemmaLag.shots, bortaLag.shots)}` : ''}
      </>
    ),
    typ: vi >= de ? 'vi' : 'dem',
  }];

  const mal = [...(data.goals || [])].sort((x, y) => x.minute - y.minute);
  const utv = data.penalties || [];
  let h = 0;
  let a = 0;
  const antalPerioder = Math.max(3, perioder.length, ...mal.map(periodAv));
  for (let p = 1; p <= antalPerioder; p++) {
    const periodensMal = mal.filter(g => periodAv(g) === p);
    periodensMal.forEach(g => {
      const var_ = isOurs(g.team_code);
      if (var_ === hemma) h += 1; else a += 1;
      const vara = hemma ? h : a;
      const deras = hemma ? a : h;
      const form = spelform(g);
      const avgor = g === mal[mal.length - 1] && vara > deras && vara === vi && deras === de && p > 3;
      const pass = g.assists.map(surname).filter(Boolean);
      let text: React.ReactNode;
      if (var_) {
        const verb = avgor ? 'avgör' : vara > deras ? (vara - deras === 1 && deras > 0 ? 'ger ledningen' : 'gör') : vara === deras ? 'kvitterar' : 'reducerar';
        text = <><b>{surname(g.scorer || '')}</b> {verb}{form ? ` i ${form}` : ''}.{pass.length > 0 && <> Passning från {pass.join(' och ')}.</>}</>;
      } else {
        const verb = deras > vara ? (deras - vara === 1 && vara > 0 ? 'tar ledningen' : 'gör') : deras === vara ? 'kvitterar' : 'reducerar';
        text = <>{motstandare} {verb}{form ? ` i ${form}` : ''} genom {surname(g.scorer || '')}.</>;
      }
      sidor.push({ tid: `${g.time.replace(':', '.')} · ${PERIODNAMN[p] || `Period ${p}`}`, stor: `${h}–${a}`, text, typ: var_ ? 'vi' : 'dem' });
    });

    // Sammanfattning efter varje ordinarie period: ställning, skott och
    // utvisningar i perioden. Förlängningen avgörs av sitt mål och behöver ingen.
    if (p <= 3) {
      const skottH = perPeriod(hemmaLag?.shots_by_period)[p - 1];
      const skottB = perPeriod(bortaLag?.shots_by_period)[p - 1];
      const periodensUtv = utv.filter(u => periodAv(u) === p && u.minutes > 0);
      const varaUtv = periodensUtv.filter(u => isOurs(u.team_code)).length;
      const derasUtv = periodensUtv.length - varaUtv;
      const delar: string[] = [];
      if (skottH != null && skottB != null) delar.push(`Skott ${skottH}–${skottB} i perioden.`);
      if (periodensMal.length === 0) delar.push('Inga mål.');
      if (periodensUtv.length > 0) {
        delar.push(`Utvisningar: ${varaUtv} för Björklöven, ${derasUtv} för ${motstandare}.`);
      }
      sidor.push({ tid: `Efter ${PERIODNAMN[p].toLowerCase()}`, stor: `${h}–${a}`, text: <>{delar.join(' ')}</>, typ: 'info' });
    }
  }

  // Målvakten.
  const mv = (data.goalies || []).find(g => g.is_ours);
  if (mv && mv.saves != null) {
    sidor.push({
      tid: 'I målet',
      stor: String(mv.saves),
      text: <><b>{surname(mv.name)}</b> räddade {mv.saves} av {mv.shots_against ?? '–'} skott{mv.save_pct != null ? `, ${komma(mv.save_pct)}\u00a0%` : ''}.</>,
      typ: 'vi',
    });
  }

  // De poängbästa.
  const basta = [...(data.skaters || [])].filter(s => s.points > 0)
    .sort((x, y) => y.points - x.points || y.goals - x.goals || x.name.localeCompare(y.name)).slice(0, 3);
  if (basta.length > 0) {
    sidor.push({
      tid: 'Poängbäst',
      stor: `${basta[0].goals}+${basta[0].assists}`,
      text: <><b>{surname(basta[0].name)}</b>{basta.length > 1 && <>. Sedan {basta.slice(1).map(s => `${surname(s.name)} ${s.goals}+${s.assists}`).join(' och ')}.</>}</>,
      typ: 'vi',
    });
  }

  const sida = sidor[Math.min(i, sidor.length - 1)];
  const bladdra = (steg: number) => setI(n => Math.max(0, Math.min(sidor.length - 1, n + steg)));

  return (
    <section className={`ks${sida.typ === 'dem' ? ' ks-dem' : sida.typ === 'info' ? ' ks-info' : ''}`} aria-label="Matchstory">
      <div className="ks-prog" aria-hidden="true">
        {sidor.map((_, n) => <i key={n} className={n < i ? 'ks-klar' : n === i ? 'ks-nu' : ''} />)}
      </div>
      <div className="ks-huvud">
        <span>{hemmaNamn} – {bortaNamn}</span>
        <span>{i + 1}/{sidor.length}</span>
      </div>
      <div className="ks-sida" aria-live="polite">
        <span className="ks-tid">{sida.tid}</span>
        <span className="ks-stor">{sida.stor}</span>
        <p className="ks-text">{sida.text}</p>
      </div>
      <button type="button" className="ks-zon ks-bak" aria-label="Föregående" onClick={() => bladdra(-1)} disabled={i === 0} />
      <button type="button" className="ks-zon ks-fram" aria-label="Nästa" onClick={() => bladdra(1)} disabled={i === sidor.length - 1} />
    </section>
  );
}
