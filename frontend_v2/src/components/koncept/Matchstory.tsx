import { useState } from 'react';
import type { Goal, MatchReport } from '../../lib/match';
import { isOurs, parsePeriods, surname } from '../../lib/match';

/**
 * Matchen som en story: resultatet först, sedan målen i den ordning de kom.
 *
 * Tryck till höger för nästa sida och till vänster för föregående, som i en
 * story. Allt byggs ur målhändelserna, så inget skrivs som inte står i
 * protokollet.
 */

type Sida = { tid: string; stor: string; text: React.ReactNode; vi: boolean };

const kort = (lag: string) => lag.replace(/^IF\s+/, '').replace(/\s+(HC|BK|IF|HF|AIK|IK|Lakers HC|Redhawks)$/, '');

function spelform(g: Goal): string {
  const raw = String(g.score_state || '').toUpperCase();
  if (g.is_power_play) return 'powerplay';
  if (g.is_short_handed) return 'boxplay';
  if (raw.includes('(GWS)')) return 'straffar';
  if (raw.includes('ENG')) return 'tom bur';
  return '';
}

export function Matchstory({ data }: { data: MatchReport }) {
  const [i, setI] = useState(0);
  const m = (data.result || '').match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const hg = Number(m[1]);
  const ag = Number(m[2]);
  const hemma = /bj[oö]rkl[oö]ven/i.test(data.home_team);
  const vi = hemma ? hg : ag;
  const de = hemma ? ag : hg;
  const perioder = parsePeriods(data.period_results).length;
  const efter = perioder > 4 ? ' efter straffar' : perioder > 3 ? ' efter förlängning' : '';
  const motstandare = kort(hemma ? data.away_team : data.home_team);

  const sidor: Sida[] = [{
    tid: `Slut${efter ? ` · ${efter.trim()}` : ''}`,
    stor: `${hg}–${ag}`,
    text: (
      <>
        {hemma ? <><b>Björklöven</b> – {motstandare}</> : <>{motstandare} – <b>Björklöven</b></>}
        <br />
        {vi > de ? 'Vinst' : vi < de ? 'Förlust' : 'Oavgjort'}{efter}
        {data.spectators ? ` · ${data.spectators.toLocaleString('sv-SE')} åskådare` : ''}
      </>
    ),
    vi: vi >= de,
  }];

  let h = 0;
  let a = 0;
  const mal = [...(data.goals || [])].sort((x, y) => x.minute - y.minute);
  mal.forEach((g, n) => {
    const var_ = isOurs(g.team_code);
    const hemmamal = var_ === hemma;
    if (hemmamal) h += 1; else a += 1;
    const vara = hemma ? h : a;
    const deras = hemma ? a : h;
    const form = spelform(g);
    const sista = n === mal.length - 1;
    const avgor = sista && vara > deras && vara === vi && deras === de;
    const pass = g.assists.map(surname).filter(Boolean);
    let text: React.ReactNode;
    if (var_) {
      const verb = avgor ? 'avgör' : vara > deras ? (vara - deras === 1 && deras > 0 ? 'ger ledningen' : 'gör') : vara === deras ? 'kvitterar' : 'reducerar';
      text = (
        <>
          <b>{surname(g.scorer || '')}</b> {verb}{form ? ` i ${form}` : ''}.
          {pass.length > 0 && <> Passning från {pass.join(' och ')}.</>}
        </>
      );
    } else {
      const verb = deras > vara ? (deras - vara === 1 && vara > 0 ? 'tar ledningen' : 'gör') : deras === vara ? 'kvitterar' : 'reducerar';
      text = <>{motstandare} {verb}{form ? ` i ${form}` : ''} genom {surname(g.scorer || '')}.</>;
    }
    sidor.push({ tid: `${g.time.replace(':', '.')}${g.minute > 60 ? ' · förlängning' : ''}`, stor: `${h}–${a}`, text, vi: var_ });
  });

  const sida = sidor[Math.min(i, sidor.length - 1)];
  const bladdra = (steg: number) => setI(n => Math.max(0, Math.min(sidor.length - 1, n + steg)));

  return (
    <section className={`ks${sida.vi ? '' : ' ks-dem'}`} aria-label="Matchstory">
      <div className="ks-prog" aria-hidden="true">
        {sidor.map((_, n) => <i key={n} className={n < i ? 'ks-klar' : n === i ? 'ks-nu' : ''} />)}
      </div>
      <div className="ks-huvud">
        <span>{kort(data.home_team)} – {kort(data.away_team)}</span>
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
