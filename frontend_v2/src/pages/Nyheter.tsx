import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../config/api';
import { Guard } from '../components/Guard';
import {
  TAGGAR, dagnyckel, dagrubrik, klockan, sedan, taggEtikett,
} from '../lib/feed';
import type { FeedItem, FeedResponse } from '../lib/feed';

/**
 * Nyhetssidan.
 *
 * Den läser ett flöde och väljer rendering på `type` — det är hela kontraktet.
 * Sorteringen, uppmärkningen och avdupliceringen sker i pipelinen; här görs
 * ingenting som skulle behöva göras om när en ny typ tillkommer.
 *
 * Det som gör sidan levande är inte fler kort utan färskheten: dagrubriker,
 * "för 20 minuter sedan" och ett tydligt senast-uppdaterat. Ett flöde utan
 * tidsangivelser är ett arkiv.
 */

/* ── hämtning ── */

/**
 * Gamla svarsformen, tolkad som flöde.
 *
 * Frontend rullar ut via Netlify i samma sekund som pushen; backend deployas
 * för hand. Mellan de två ligger ett fönster där `/api/v1/feed` ännu inte
 * finns, och en tom nyhetssida under det fönstret är sämre än gårdagens flöde.
 * Faller bort när backend är ute.
 */
type GammalArtikel = { id?: string; title: string; body?: string; source: string; url?: string; date: string; time?: string; tag: string };

const GAMMAL_TAGG: Record<string, string> = {
  BEKRÄFTAT_NYFÖRVÄRV: 'trupp',
  BEKRÄFTAD_FÖRLUST: 'trupp',
  KONTRAKTSFÖRLÄNGNING: 'trupp',
  HETT_RYKTE: 'trupp',
  FORUM_RYKTE: 'snack',
  ÖVRIGT: 'klubb',
};

function franGammalForm(artiklar: GammalArtikel[]): FeedItem[] {
  return artiklar
    .filter(a => a.title && a.date)
    .map((a, i) => ({
      id: a.id || `gammal-${i}`,
      type: 'press' as const,
      ts: `${a.date}T${a.time || '12:00'}:00`,
      title: a.title,
      body: a.body || null,
      tag: GAMMAL_TAGG[a.tag] || 'klubb',
      links: [],
      sources: [{ name: a.source || '', url: a.url || null, official: /bjorkloven\.com/i.test(a.url || '') }],
    }))
    .sort((a, b) => b.ts.localeCompare(a.ts));
}

/**
 * Nästa match, för rubriken.
 *
 * Ett nyhetsflöde utan rubrik är en lista. Rubriken måste däremot vara sann
 * varje gång sidan öppnas, och den enda uppgift som är det utan att någon
 * skriver den är vad som väntar härnäst — den ändrar sig själv varje dygn.
 * Faller den bort står "Nyhetsflödet" kvar; sidan är inte beroende av den.
 */
type NastaMatch = {
  status?: string;
  game?: { date?: string; time?: string | null; opponent?: string; is_home?: boolean; venue?: string | null };
  is_premiere?: boolean;
};

async function hamtaNasta(): Promise<NastaMatch | null> {
  try {
    const svar = await fetch(`${API_URL}/api/v1/next-match`, { cache: 'no-store' });
    if (!svar.ok) return null;
    const data: NastaMatch = await svar.json();
    return data.status === 'ok' && data.game?.date ? data : null;
  } catch {
    return null;
  }
}

async function hamtaFlodet(): Promise<FeedResponse> {
  const svar = await fetch(`${API_URL}/api/v1/feed?limit=200&ts=${Date.now()}`, { cache: 'no-store' });
  if (svar.ok) {
    const data: FeedResponse = await svar.json();
    if (data.status !== 'error' && (data.items?.length || 0) > 0) return data;
  }

  const gammalt = await fetch(`${API_URL}/api/silly-season?ts=${Date.now()}`, { cache: 'no-store' });
  if (!gammalt.ok) throw new Error(`API svarade med status ${gammalt.status}`);
  const data = await gammalt.json();
  const poster = franGammalForm(data.news_feed || []);
  const antal: Record<string, number> = {};
  poster.forEach(p => { antal[p.tag] = (antal[p.tag] || 0) + 1; });
  return { status: 'ok', updated_at: data._meta?.lastRefresh || null, count: poster.length, counts_by_tag: antal, items: poster };
}

/* ── delkomponenter ── */

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

/** Dygn kvar, räknat på datum och inte på timmar: matchdag är matchdag. */
function dygnTill(datum: string, nu: Date = new Date()): number | null {
  const d = new Date(`${datum}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((dag(d) - dag(nu)) / 86400000);
}

function Rubrik({ nasta, status }: { nasta: NastaMatch | null; status: string }) {
  const match = nasta?.game;
  const kvar = match?.date ? dygnTill(match.date) : null;

  let rubrik = 'Nyhetsflödet';
  if (kvar !== null && kvar >= 0) {
    const vad = nasta?.is_premiere ? 'premiären' : 'nästa match';
    rubrik = kvar === 0 ? 'Matchdag'
      : kvar === 1 ? `I morgon: ${nasta?.is_premiere ? 'premiär' : 'match'}`
        : `${kvar} dagar till ${vad}`;
  }

  const d = match?.date ? new Date(`${match.date}T00:00:00`) : null;
  const nar = d && !Number.isNaN(d.getTime()) ? `${d.getDate()} ${MANADER[d.getMonth()]}` : '';
  const rad = match
    ? [
      `${match.opponent?.replace(/^IF\s+/, '') || ''} ${match.is_home ? 'hemma' : 'borta'}`.trim(),
      nar,
      (match.time || '').replace(':', '.'),
      match.venue || '',
    ].filter(Boolean).join(' · ')
    : '';

  return (
    <section className="ny-huvud">
      <p className="mc-kicker">Runt Björklöven</p>
      <h1 className="ny-rubrik">{rubrik}</h1>
      {rad && <p className="ny-underrubrik">{rad}</p>}
      <p className="ny-status">{status}</p>
    </section>
  );
}

function Tagg({ tag }: { tag: string }) {
  return <span className={`ny-tagg ny-tagg-${tag}`}>{taggEtikett(tag)}</span>;
}

/** Klubbens egen sida väger tyngst och ska synas som det. */
function Kalla({ post }: { post: FeedItem }) {
  const kalla = post.sources?.[0];
  if (!kalla?.name) return null;
  return (
    <span className={`ny-kalla${kalla.official ? ' ny-kalla-officiell' : ''}`}>
      {kalla.official && <span className="ny-prick" aria-hidden="true" />}
      {kalla.name}
    </span>
  );
}

/**
 * Toppnyheten.
 *
 * Ett flöde där allt är lika stort ger ingen ingång. Den färskaste raden får
 * bära sidan — och är den några dagar gammal säger tidsangivelsen det rakt ut
 * i stället för att låtsas att den är ny.
 */
function Topp({ post }: { post: FeedItem }) {
  const kalla = post.sources?.[0];
  const innehall = (
    <>
      <div className="ny-toppmeta">
        <Tagg tag={post.tag} />
        <span className="ny-tid">{sedan(post.ts)}</span>
      </div>
      <h2 className="ny-topptitel">{post.title}</h2>
      <Kalla post={post} />
    </>
  );
  return kalla?.url
    ? <a className="ny-topp" href={kalla.url} target="_blank" rel="noreferrer">{innehall}</a>
    : <section className="ny-topp">{innehall}</section>;
}

function Rad({ post }: { post: FeedItem }) {
  const kalla = post.sources?.[0];
  const inre = (
    <>
      <div className="ny-radhuvud">
        <Tagg tag={post.tag} />
        <span className="ny-tid">{klockan(post.ts)}</span>
      </div>
      <p className="ny-titel">{post.title}</p>
      {post.body && <p className="ny-brod">{post.body}</p>}
      <Kalla post={post} />
    </>
  );
  return kalla?.url
    ? <a className="ny-rad" href={kalla.url} target="_blank" rel="noreferrer">{inre}</a>
    : <div className="ny-rad">{inre}</div>;
}

/**
 * Ett klipp, med fasad.
 *
 * YouTubes inbäddning väger dryg megabyte och sätter kakor innan någon bett om
 * det. Här ligger bara miniatyren tills man trycker play — då byts den mot
 * spelaren, på nocookie-domänen och med autostart så trycket inte behöver
 * upprepas. Den som scrollar förbi betalar ingenting.
 */
function Klipp({ post }: { post: FeedItem }) {
  const [spelar, setSpelar] = useState(false);
  const kalla = post.sources?.[0];
  const id = (kalla?.url || '').match(/[?&]v=([\w-]{6,})/)?.[1];

  return (
    <div className="ny-rad ny-rad-klipp">
      <div className="ny-radhuvud">
        <Tagg tag={post.tag} />
        <span className="ny-tid">{klockan(post.ts)}</span>
      </div>

      {spelar && id ? (
        <div className="ny-spelare">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={post.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          className="ny-tumnagel"
          onClick={() => setSpelar(true)}
          disabled={!id}
          aria-label={`Spela: ${post.title}`}
        >
          {/* Faller miniatyren bort blir det en svart ruta med en spelknapp,
              inte en trasig bildikon. */}
          {post.thumbnail && (
            <img
              src={post.thumbnail}
              alt=""
              loading="lazy"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="ny-play" aria-hidden="true">▶</span>
        </button>
      )}

      <p className="ny-titel">{post.title}</p>
      <span className={`ny-kalla${kalla?.official ? ' ny-kalla-officiell' : ''}`}>
        {kalla?.official && <span className="ny-prick" aria-hidden="true" />}
        {kalla?.name}
        {/* Fankanalen är läsvärd men är inte klubben, och det ska synas. */}
        {kalla && !kalla.official && <span className="ny-inofficiell">fankanal</span>}
      </span>
    </div>
  );
}

function Post({ post }: { post: FeedItem }) {
  if (post.type === 'video') return <Klipp post={post} />;
  return <Rad post={post} />;
}

/* ── sidan ── */

export function Nyheter() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [nasta, setNasta] = useState<NastaMatch | null>(null);
  const [fel, setFel] = useState<string | null>(null);
  const [laddar, setLaddar] = useState(true);
  const [filter, setFilter] = useState<string>('allt');

  useEffect(() => {
    let avbruten = false;
    // Ingen setLaddar(true) här: tillståndet börjar redan som laddande och
    // effekten kör en gång.
    hamtaFlodet()
      .then(d => { if (!avbruten) { setData(d); setFel(null); } })
      .catch(e => { if (!avbruten) setFel(e instanceof Error ? e.message : 'Okänt fel'); })
      .finally(() => { if (!avbruten) setLaddar(false); });
    // Rubriken är fristående: den får hämtas parallellt och misslyckas tyst.
    hamtaNasta().then(n => { if (!avbruten) setNasta(n); });
    return () => { avbruten = true; };
  }, []);

  const utanX = useMemo(() => (data?.items || []).filter(p => p.type !== 'x'), [data]);

  const poster = useMemo(() => {
    return filter === 'allt' ? utanX : utanX.filter(p => p.tag === filter);
  }, [utanX, filter]);

  // Dagrubriker kräver att raderna kommer i ordning; API:t sorterar redan, men
  // filtret får inte kunna bryta det och fallbackformen sorterar själv.
  const dagar = useMemo(() => {
    const grupper: { nyckel: string; rubrik: string; poster: FeedItem[] }[] = [];
    poster.forEach(p => {
      const nyckel = dagnyckel(p.ts);
      const sista = grupper[grupper.length - 1];
      if (sista && sista.nyckel === nyckel) sista.poster.push(p);
      else grupper.push({ nyckel, rubrik: dagrubrik(p.ts), poster: [p] });
    });
    return grupper;
  }, [poster]);

  const antal = useMemo(() => {
    const r: Record<string, number> = {};
    utanX.forEach(p => { r[p.tag] = (r[p.tag] || 0) + 1; });
    return r;
  }, [utanX]);
  const totalt = utanX.length;
  const kallor = new Set(utanX.map(p => p.sources?.[0]?.name).filter(Boolean)).size;

  if (laddar) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card"><p className="mc-kicker">Nyheter</p><h2 className="mc-title">Hämtar flödet…</h2></section>
      </div>
    );
  }

  if (fel || !data) {
    return (
      <div className="page animate-fade-up">
        <section className="mc-card mc-card-error">
          <p className="mc-kicker">Nyheter</p>
          <h2 className="mc-title">Kunde inte hämta flödet</h2>
          <p className="mc-text">{fel}</p>
        </section>
      </div>
    );
  }
  // Ett inlägg är inte en nyhet och får inte bära sidan. Toppen är den
  // färskaste artikeln om A-laget; snacket och ungdomsraderna ligger kvar i
  // flödet där de hör hemma, med varsitt eget filter. Regeln är avsiktligt
  // trubbig — att rangordna nyheter efter vikt är gissning, färskhet är fakta.
  const topp = filter === 'allt'
    ? (poster.find(p => p.type === 'press' && p.tag !== 'ungdom')
      ?? poster.find(p => p.type === 'press')
      ?? null)
    : null;
  const dagarUtanTopp = topp
    ? dagar
      .map(d => ({ ...d, poster: d.poster.filter(p => p.id !== topp.id) }))
      .filter(d => d.poster.length > 0)
    : dagar;

  return (
    <div className="page animate-fade-up">
      <Rubrik
        nasta={nasta}
        status={`${totalt} rader från ${kallor} källor`
          + (data.updated_at ? ` · uppdaterat ${klockan(data.updated_at)}` : '')}
      />

      <div className="ny-filter" role="tablist" aria-label="Ämnen">
        <button
          role="tab"
          aria-selected={filter === 'allt'}
          className={`ny-chip${filter === 'allt' ? ' ny-chip-vald' : ''}`}
          onClick={() => setFilter('allt')}
        >
          Allt <span className="ny-chipantal">{totalt}</span>
        </button>
        {TAGGAR.filter(t => (antal[t.nyckel] || 0) > 0).map(t => (
          <button
            key={t.nyckel}
            role="tab"
            aria-selected={filter === t.nyckel}
            className={`ny-chip ny-chip-${t.nyckel}${filter === t.nyckel ? ' ny-chip-vald' : ''}`}
            onClick={() => setFilter(t.nyckel)}
          >
            {t.etikett} <span className="ny-chipantal">{antal[t.nyckel]}</span>
          </button>
        ))}
      </div>

      {poster.length === 0 && <p className="ny-tomt">Inget under det här ämnet just nu.</p>}

      <Guard name="toppnyheten">
        {topp && <Topp post={topp} />}
      </Guard>

      <Guard name="flödet">
        <>
          {(topp ? dagarUtanTopp : dagar).map(dag => (
            <section key={dag.nyckel} className="ny-dag">
              <h3 className="ny-dagrubrik">{dag.rubrik}</h3>
              {dag.poster.map(p => <Post key={p.id} post={p} />)}
            </section>
          ))}
          {topp && dagarUtanTopp.length === 0 && <p className="ny-tomt">Inget mer i flödet just nu.</p>}
        </>
      </Guard>
    </div>
  );
}
