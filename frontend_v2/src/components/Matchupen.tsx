import { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import { ordinal } from '../lib/match';
import { komma, MINSTA_MATCHER } from '../lib/serien';
import type { LeagueData, LeagueTeam } from '../lib/serien';
import { jsonEllerNull, kortLag, useLag, utfall } from '../lib/lag';
import type { Lag, LagMatch, Tabellrad } from '../lib/lag';
import { LagRadar, Lagen, PerioderJmf } from './LagViz';

/**
 * Inför matchen, lag mot lag: det som avgör snarare än det som hänt.
 *
 * Nycklarna överst är meningar räknade ur datan, en per fråga: vem gör
 * första målet och vad det brukar betyda, hur matcher slutar efter två
 * perioder, specialteamen mot varandra, när målen kommer och vem som styr
 * skotten. Därunder samma frågor som bilder, sedan målvakterna och vad
 * matchen betyder i tabellen.
 */
export function Matchupen({ liga, them }: { liga: LeagueData | null; them: string }) {
  const oss = liga?.teams.find(t => t.is_ours) ?? null;
  const dem = liga?.teams.find(t => t.team === them) ?? null;
  const A = useLag(oss?.team ?? '');
  const B = useLag(them);
  const [tabell, setTabell] = useState<Tabellrad[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/v1/standings`, { signal: ctrl.signal }).then(jsonEllerNull)
      .then(d => { if (Array.isArray(d?.standings)) setTabell(d.standings); })
      .catch(() => { /* tabellutsnittet syns inte */ });
    return () => ctrl.abort();
  }, []);

  if (!liga || !oss || !dem || oss.gp < MINSTA_MATCHER || dem.gp < MINSTA_MATCHER) return null;
  const a = A && A !== 'fel' ? A : null, b = B && B !== 'fel' ? B : null;
  const lagA = { namn: oss.team, games: a?.games ?? [], klass: 'sr-jv' };
  const lagB = { namn: them, games: b?.games ?? [], klass: 'sr-ja' };

  return (
    <>
      {a && b && <Nycklar liga={liga} oss={oss} dem={dem} a={a} b={b} />}
      <section className="mc-card">
        <p className="mc-kicker">Lag mot lag</p>
        <LagRadar liga={liga} t={dem} vi={oss} jmfKlass="sr-radar-gron" />
        <div className="sr-leg sr-leg-mitt">
          <span><i className="sr-leg-vald" />{kortLag(them)}</span>
          <span><i className="sr-leg-vi" />Björklöven</span>
        </div>
      </section>
      {a && b && <Lagen lag={[lagB, lagA]} />}
      {a && b && a.periods && b.periods && <PerioderJmf a={b} b={a} klassB="sr-jv" />}
      {a && b && <Malvaktsduell a={b} b={a} snitt={liga.league.sv_pct ?? null} />}
      {tabell.length > 0 && <PaSpel tabell={tabell} vi={oss.team} dem={them} />}
    </>
  );
}

type Nyckel = { tal: string; text: string };

/** Upp till fyra meningar ur datan, de mest talande först. */
function Nycklar({ liga, oss, dem, a, b }: { liga: LeagueData; oss: LeagueTeam; dem: LeagueTeam; a: Lag; b: Lag }) {
  const vi = 'Björklöven', de = kortLag(dem.team);
  const nycklar: Nyckel[] = [];

  // Första målet: hur ofta varje lag gör det och vad det ger.
  const forst = (gs: LagMatch[]) => {
    const f = gs.filter(g => g.first_goal === 'for');
    const u = utfall(f);
    return { gjorde: f.length, av: gs.filter(g => g.first_goal != null).length, vann: u.v + u.vo };
  };
  const fa = forst(a.games), fb = forst(b.games);
  if (fb.gjorde >= 3) {
    nycklar.push({
      tal: `${fb.vann} av ${fb.gjorde}`,
      text: `${de} vinner ${fb.vann} av ${fb.gjorde} matcher där de gör första målet. ${vi} har gjort det i ${fa.gjorde} av ${fa.av}.`,
    });
  }

  // Efter två perioder: det tydligaste mönstret av de två lagen.
  const efter2 = (gs: LagMatch[], villkor: (s: [number, number]) => boolean) =>
    gs.filter(g => g.score_by_period && g.score_by_period.length >= 2 && villkor(g.score_by_period[1]));
  const under = (gs: LagMatch[]) => efter2(gs, s => s[0] < s[1]);
  const leder = (gs: LagMatch[]) => efter2(gs, s => s[0] > s[1]);
  const vunna = (gs: LagMatch[]) => { const u = utfall(gs); return u.v + u.vo; };
  const ua = under(a.games), la = leder(a.games), lb = leder(b.games), ub = under(b.games);
  if (ua.length >= 3 && vunna(ua) === 0) {
    nycklar.push({ tal: `0 av ${ua.length}`, text: `${vi} har inte vunnit någon av ${ua.length} matcher där laget legat under efter två perioder.` });
  } else if (la.length >= 3) {
    nycklar.push({ tal: `${vunna(la)} av ${la.length}`, text: `${vi} har vunnit ${vunna(la)} av ${la.length} matcher där laget lett efter två perioder.` });
  }
  if (lb.length >= 3 && vunna(lb) === lb.length) {
    nycklar.push({ tal: `${lb.length} av ${lb.length}`, text: `${de} har vunnit alla ${lb.length} matcher där de lett efter två perioder.` });
  } else if (ub.length >= 3 && vunna(ub) > 0) {
    nycklar.push({ tal: `${vunna(ub)} av ${ub.length}`, text: `${de} har vänt ${vunna(ub)} av ${ub.length} matcher där de legat under efter två perioder.` });
  }

  // Specialteamen mot varandra, när skillnaden i placering är stor.
  const n = liga.teams.length;
  const deraspp = dem.ranks.pp_pct, varpk = oss.ranks.pk_pct, varpp = oss.ranks.pp_pct, deraspk = dem.ranks.pk_pct;
  if (deraspp != null && varpk != null && varpk - deraspp >= 4) {
    nycklar.push({ tal: `${ordinal(deraspp)} mot ${ordinal(varpk)}`, text: `${de}s powerplay är ${ordinal(deraspp)} bäst av ${n}, vårt boxplay ${ordinal(varpk)}. Utvisningarna kan avgöra.` });
  } else if (varpp != null && deraspk != null && deraspk - varpp >= 4) {
    nycklar.push({ tal: `${ordinal(varpp)} mot ${ordinal(deraspk)}`, text: `Vårt powerplay är ${ordinal(varpp)} bäst av ${n}, ${de}s boxplay ${ordinal(deraspk)}. Ett läge att ta vara på.` });
  }

  // Perioderna: när de gör flest mål och när vi släpper in flest.
  if (a.periods && b.periods) {
    const ord = ['första', 'andra', 'tredje'];
    const vanliga = (ps: typeof a.periods) => (ps ?? []).filter(p => p.period <= 3);
    const deBast = vanliga(b.periods).reduce((x, p) => (p.gf > x.gf ? p : x), { period: 0, gf: -1 } as { period: number; gf: number });
    const viSamst = vanliga(a.periods).reduce((x, p) => (p.ga > x.ga ? p : x), { period: 0, ga: -1 } as { period: number; ga: number });
    if (deBast.period && viSamst.period && deBast.period === viSamst.period) {
      nycklar.push({
        tal: `${ord[deBast.period - 1]}`,
        text: `${de} gör flest mål i ${ord[deBast.period - 1]} perioden (${deBast.gf}), och det är där ${vi} släpper in flest (${viSamst.ga}).`,
      });
    }
  }

  // Skotten: vem som brukar ha pucken.
  const sa = oss.values.shot_share, sb = dem.values.shot_share;
  if (sa != null && sb != null && Math.abs(sa - sb) >= 5) {
    nycklar.push({ tal: `${Math.round(sb)} %`, text: `${de} tar ${komma(sb)} % av skotten i sina matcher, ${vi} ${komma(sa)} %.` });
  }

  if (nycklar.length === 0) return null;
  return (
    <section className="mc-card">
      <p className="mc-kicker">Nycklarna</p>
      <div className="mu-nycklar">
        {nycklar.slice(0, 4).map(k => (
          <div key={k.text} className="mu-nyckel">
            <b>{k.tal}</b>
            <span>{k.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Lagens mest spelade målvakter mot varandra och mot seriens snitt. */
function Malvaktsduell({ a, b, snitt }: { a: Lag; b: Lag; snitt: number | null }) {
  const forsta = (l: Lag) => [...l.goalies].sort((x, y) => y.games_played - x.games_played)[0];
  const ga = forsta(a), gb = forsta(b);
  if (!ga || !gb || ga.save_pct == null || gb.save_pct == null) return null;
  const LO = 85, HI = 96;
  const x = (v: number) => Math.max(0, Math.min(100, ((v - LO) / (HI - LO)) * 100));
  const namn = (n: string) => { const [e, f] = n.split(',').map(s => s.trim()); return f ? `${f} ${e}` : n; };
  return (
    <section className="mc-card">
      <p className="mc-kicker">Målvakterna · flest matcher i år</p>
      <div className="sr-liga">
        {([[ga, a.team, 'sr-ja'], [gb, b.team, 'sr-jv']] as const).map(([g, lag, k]) => (
          <div key={g.name} className="sr-lrad mu-mrad">
            <span className="sr-lnamn">{namn(g.name)} <small className={k}>{kortLag(lag)} · {g.games_played} m</small></span>
            <span className="sr-lbar sr-gbar">
              <i className={`${k}-fyll`} style={{ width: `${x(g.save_pct as number)}%` }} />
              {snitt != null && <em className="sr-gsnitt" style={{ left: `${x(snitt)}%` }} />}
            </span>
            <span className="sr-lp"><b>{komma(g.save_pct as number)} %</b></span>
          </div>
        ))}
      </div>
      {snitt != null && <div className="sr-leg"><span><i className="sr-leg-snittlod" />serien {komma(snitt)} %</span></div>}
    </section>
  );
}

/**
 * Vad matchen betyder i tabellen: utsnittet kring båda lagen, med de tre
 * poängen en vinst ger streckade efter vårt lag.
 */
function PaSpel({ tabell, vi, dem }: { tabell: Tabellrad[]; vi: string; dem: string }) {
  const ra = tabell.find(r => r.team_name === vi), rb = tabell.find(r => r.team_name === dem);
  if (!ra || !rb) return null;
  const sorterad = [...tabell].sort((x, y) => x.rank - y.rank);
  const fran = Math.max(1, Math.min(ra.rank, rb.rank) - 1), till = Math.min(sorterad.length, Math.max(ra.rank, rb.rank) + 1);
  const utsnitt = sorterad.filter(r => r.rank >= fran && r.rank <= till);
  const max = Math.max(...utsnitt.map(r => r.points)) + 3;
  const platsVid = (p: number) => 1 + sorterad.filter(r => r.team_name !== vi && r.points > p).length;
  const medVinst = platsVid(ra.points + 3);
  return (
    <section className="mc-card">
      <p className="mc-kicker">Vad står på spel</p>
      <div className="mu-tabell">
        {utsnitt.map(r => {
          const ar = r.team_name === vi, de = r.team_name === dem;
          return (
            <div key={r.team_name} className={`mu-trad${ar ? ' mu-vi' : de ? ' mu-de' : ''}`}>
              <span className="mu-tplats">{r.rank}</span>
              <span className="mu-tnamn">{kortLag(r.team_name)}</span>
              <span className="mu-tbar">
                <i style={{ width: `${(r.points / max) * 100}%` }} />
                {ar && <i className="mu-tplus" style={{ width: `${(3 / max) * 100}%` }} />}
              </span>
              <span className="mu-tp">{r.points}</span>
            </div>
          );
        })}
      </div>
      <p className="mu-spel">
        Med vinst: <b>{ordinal(medVinst)}</b> med {ra.points + 3} poäng{medVinst < ra.rank ? `, upp ${ra.rank - medVinst} ${ra.rank - medVinst === 1 ? 'plats' : 'platser'}` : ''}.
        {' '}Avståndet till {kortLag(dem)} är {Math.abs(rb.points - ra.points)} poäng.
      </p>
    </section>
  );
}
