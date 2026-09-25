import type { LeagueData } from '../../lib/serien';

/**
 * Specialteamen som bild i stället för procenttal i en lista.
 *
 * Varje powerplay och varje numerärt underläge är en ruta: fylld när det
 * blev mål. Under dem står laget bland seriens alla lag på en linje, med
 * seriens snitt som streck. Rutorna är det som hänt, linjen är hur det står
 * sig.
 */

type St = {
  pp_goals: number; pp_opportunities: number; pp_pct: number;
  pk_goals_against: number; pk_times: number; pk_pct: number;
  special_teams_index: number; total_pim: number;
};

const komma = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const ordning = (n: number) => `${n}:${n % 10 === 1 || n % 10 === 2 ? 'a' : 'e'}`;

function Rutor({ antal, traffar, sort }: { antal: number; traffar: number; sort: 'pp' | 'pk' }) {
  return (
    <div className="stv-rutor" aria-hidden="true">
      {Array.from({ length: antal }, (_, i) => (
        <i key={i} className={i < traffar ? `stv-ruta stv-${sort}-mal` : `stv-ruta stv-${sort}-tom`} />
      ))}
    </div>
  );
}

function Linje({ league, nyckel, var_, hogtBra = true }: {
  league: LeagueData | null; nyckel: 'pp_pct' | 'pk_pct'; var_: number; hogtBra?: boolean;
}) {
  const lag = (league?.teams || []).filter(t => t.values[nyckel] != null && t.gp > 0);
  if (lag.length < 4) return null;
  const varden = lag.map(t => t.values[nyckel] as number);
  const lo = Math.min(...varden, var_);
  const hi = Math.max(...varden, var_);
  const span = hi - lo || 1;
  const x = (v: number) => 4 + ((v - lo) / span) * 92;
  const snitt = varden.reduce((a, b) => a + b, 0) / varden.length;
  const plats = 1 + varden.filter(v => (hogtBra ? v > var_ : v < var_)).length;
  return (
    <div className="stv-linje">
      <div className="stv-axel" role="img" aria-label={`${ordning(plats)} av ${lag.length} i serien, snittet ${komma(snitt)} %`}>
        <span className="stv-snitt" style={{ left: `${x(snitt)}%` }} />
        {lag.filter(t => !t.is_ours).map(t => (
          <span key={t.team} className="stv-lag" style={{ left: `${x(t.values[nyckel] as number)}%` }} title={`${t.team} ${komma(t.values[nyckel] as number)} %`} />
        ))}
        <span className="stv-vi" style={{ left: `${x(var_)}%` }} />
      </div>
      <div className="stv-skala">
        <span>{komma(lo, 0)} %</span>
        <span><b>{ordning(plats)}</b> av {lag.length} · snitt {komma(snitt)} %</span>
        <span>{komma(hi, 0)} %</span>
      </div>
    </div>
  );
}

export function Specialteam({ st, league, matcher }: { st: St; league: LeagueData | null; matcher: number }) {
  const index = st.special_teams_index;
  // Indexet runt 100: halva stapeln är 20 poäng åt varje håll.
  const utslag = Math.max(-1, Math.min(1, (index - 100) / 20));
  return (
    <section className="mc-card stv">
      <p className="mc-kicker">Specialteam</p>

      <div className="stv-del">
        <div className="stv-huvud">
          <span className="stv-rubrik">Powerplay</span>
          <span className="stv-tal">{komma(st.pp_pct)}<small>%</small></span>
        </div>
        <Rutor antal={st.pp_opportunities} traffar={st.pp_goals} sort="pp" />
        <p className="stv-text"><b>{st.pp_goals}</b> mål på {st.pp_opportunities} powerplay</p>
        <Linje league={league} nyckel="pp_pct" var_={st.pp_pct} />
      </div>

      <div className="stv-del">
        <div className="stv-huvud">
          <span className="stv-rubrik">Boxplay</span>
          <span className="stv-tal">{komma(st.pk_pct)}<small>%</small></span>
        </div>
        <Rutor antal={st.pk_times} traffar={st.pk_goals_against} sort="pk" />
        <p className="stv-text"><b>{st.pk_times - st.pk_goals_against}</b> av {st.pk_times} numerära underlägen utan insläppt mål</p>
        <Linje league={league} nyckel="pk_pct" var_={st.pk_pct} />
      </div>

      <div className="stv-del stv-index">
        <div className="stv-huvud">
          <span className="stv-rubrik">Special teams-index</span>
          <span className="stv-tal">{komma(index, 0)}</span>
        </div>
        <div className="stv-mat" aria-hidden="true">
          <span className="stv-mitt" />
          <span className={`stv-fyll ${utslag >= 0 ? 'stv-plus' : 'stv-minus'}`}
                style={utslag >= 0 ? { left: '50%', width: `${utslag * 50}%` } : { right: '50%', width: `${-utslag * 50}%` }} />
        </div>
        <div className="stv-skala"><span>80</span><span>100 är ett snittlag</span><span>120</span></div>
      </div>

      <p className="mc-note">{st.total_pim} utvisningsminuter, {komma(matcher > 0 ? st.total_pim / matcher : 0)} per match.</p>
    </section>
  );
}
