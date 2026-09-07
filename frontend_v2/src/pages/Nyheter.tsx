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

async function hamtaFlodet(): Promise<FeedResponse> {
  const svar = await fetch(`${API_URL}/api/v1/feed?limit=120&ts=${Date.now()}`, { cache: 'no-store' });
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

/** Ett inlägg är inte en artikel och ska inte se ut som en. */
function Inlagg({ post }: { post: FeedItem }) {
  const kalla = post.sources?.[0];
  const inre = (
    <>
      <div className="ny-radhuvud">
        <span className="ny-handtag">{kalla?.name || 'X'}</span>
        <span className="ny-tid">{klockan(post.ts)}</span>
      </div>
      <p className="ny-inlaggstext">{post.title}</p>
    </>
  );
  return kalla?.url
    ? <a className="ny-rad ny-rad-x" href={kalla.url} target="_blank" rel="noreferrer">{inre}</a>
    : <div className="ny-rad ny-rad-x">{inre}</div>;
}

function Post({ post }: { post: FeedItem }) {
  if (post.type === 'x') return <Inlagg post={post} />;
  return <Rad post={post} />;
}

/* ── sidan ── */

export function Nyheter() {
  const [data, setData] = useState<FeedResponse | null>(null);
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
    return () => { avbruten = true; };
  }, []);

  const poster = useMemo(() => {
    const alla = data?.items || [];
    return filter === 'allt' ? alla : alla.filter(p => p.tag === filter);
  }, [data, filter]);

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

  const antal = data.counts_by_tag || {};
  const totalt = data.items?.length || 0;
  const kallor = new Set((data.items || []).map(p => p.sources?.[0]?.name).filter(Boolean)).size;
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
      <section className="ny-huvud">
        <p className="mc-kicker">Runt Björklöven</p>
        <p className="ny-status">
          {totalt} rader från {kallor} källor
          {data.updated_at && <> · uppdaterat {klockan(data.updated_at)}</>}
        </p>
      </section>

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
