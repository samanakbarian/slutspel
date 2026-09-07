import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Titel, beskrivning och canonical per vy.
 *
 * Hela appen delade en enda titel, för allt renderas i webbläsaren. Google såg
 * därför en sida där det finns sju, och ingen av dem kunde konkurrera om sin
 * egen sökning: "björklöven statistik" och "björklöven matchrapport" är
 * vinnbara långsvansar, "björklöven" är det inte.
 *
 * Ingen react-helmet. Det är fyra DOM-anrop vid ruttbyte, och ett beroende
 * till för det vore att betala i bundlestorlek för en abstraktion vi inte
 * behöver.
 */

export const BAS = 'https://sida377.se';

type Sidtext = { titel: string; text: string };

/** Lagnamnet står i titeln med flit — det är ordet folk söker på. */
const SIDOR: Record<string, Sidtext> = {
  '/matcher': {
    titel: 'Matcher och resultat · Björklöven — Sida 377',
    text: 'Björklövens matcher i SHL 2026/27: spelprogram, resultat och matchrapporter, hämtat från Swehockey Stats.',
  },
  '/statistik': {
    titel: 'Statistik och poängliga · Björklöven — Sida 377',
    text: 'Poängliga, målvaktsstatistik och lagets siffror för IF Björklöven i SHL 2026/27.',
  },
  '/trupp': {
    titel: 'Truppen · Björklöven — Sida 377',
    text: 'Björklövens trupp i SHL 2026/27, med position, nummer och säsongens siffror per spelare.',
  },
  '/nyheter': {
    titel: 'Nyheter · Björklöven — Sida 377',
    text: 'Aktuella nyheter om IF Björklöven, samlade från klubben och svensk hockeymedia.',
  },
  '/x': {
    titel: 'Snacket på X · Björklöven — Sida 377',
    text: 'Vad som skrivs om Björklöven på X just nu.',
  },
  '/om': {
    titel: 'Om Sida 377',
    text: 'Vad Sida 377 är, var siffrorna kommer ifrån och hur de räknas.',
  },
};

const STANDARD: Sidtext = {
  titel: 'Sida 377 — Björklöven i siffror',
  text: 'Matcher, tabell, poängliga och matchrapporter för IF Björklöven i SHL 2026/27. Data från Swehockey Stats.',
};

/** Dynamiska rutter får sin egen text; de är många och deras innehåll varierar. */
function slaUpp(sokvag: string): Sidtext {
  if (SIDOR[sokvag]) return SIDOR[sokvag];
  if (/^\/matcher\/\d+/.test(sokvag)) {
    return {
      titel: 'Matchrapport · Björklöven — Sida 377',
      text: 'Målen, utvisningarna, målvakterna och spelarnas siffror från matchen, händelse för händelse.',
    };
  }
  if (sokvag.startsWith('/statistik/spelare/')) {
    // Spelarens namn står i adressen och är det enda som skiljer sidorna åt.
    const namn = decodeURIComponent(sokvag.split('/').pop() || '').replace(/[*†‡]/g, '').trim();
    return {
      titel: namn ? `${namn} · Björklöven — Sida 377` : 'Spelare · Björklöven — Sida 377',
      text: namn
        ? `Säsongens siffror för ${namn} i IF Björklöven: poäng, matcher och form.`
        : 'Säsongens siffror per spelare i IF Björklöven.',
    };
  }
  return STANDARD;
}

function satt(vad: string, till: string, attribut: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribut}="${vad}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribut, vad);
    document.head.appendChild(el);
  }
  el.setAttribute('content', till);
}

/**
 * Skriver titel, beskrivning och canonical.
 *
 * Exporterad för att vyer med hämtad data ska kunna skärpa sin egen text när
 * den kommit. Matchrapporterna är femtiotvå sidor och delade en enda titel —
 * för Google är det femtiotvå kopior av samma sida, och då väljer den en och
 * struntar i resten. Rubriken måste innehålla lagen och resultatet, för det
 * är den strängen folk söker på.
 */
export function skrivSidhuvud(titel: string, text: string, sokvag: string) {
  // Roten pekar vidare till /matcher. Canonical måste peka på den adress som
  // faktiskt visas, annars konkurrerar två adresser om samma innehåll.
  const url = `${BAS}${sokvag === '/' ? '/matcher' : sokvag}`;

  document.title = titel;
  satt('description', text);
  satt('og:title', titel, 'property');
  satt('og:description', text, 'property');
  satt('og:url', url, 'property');
  satt('twitter:title', titel);
  satt('twitter:description', text);

  let lank = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!lank) {
    lank = document.createElement('link');
    lank.rel = 'canonical';
    document.head.appendChild(lank);
  }
  lank.href = url;
}

export function Sidhuvud() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { titel, text } = slaUpp(pathname);
    skrivSidhuvud(titel, text, pathname);
  }, [pathname]);

  return null;
}
