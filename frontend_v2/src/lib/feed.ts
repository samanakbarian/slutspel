/**
 * Flödeskontraktet.
 *
 * Sidan läste tidigare `/api/silly-season`, som är en övergångsmaskin: den
 * söker på verb som "förlänger" och "klar för" och kastar allt annat. Riktigt i
 * juni — men i september gav samma sökning noll träffar och sidan föll tillbaka
 * på en handunderhållen baseline daterad 13 juni. Ett nyhetsflöde som står
 * stilla i 86 dagar är värre än inget.
 *
 * `/api/v1/feed` hämtar brett och märker upp i stället. Klienten läser **en**
 * lista och väljer rendering på `type`; allt arbete sker i pipelinen. Nya typer
 * (`generated` — notiser räknade ur marten) kan börja levereras utan att den
 * här filen ändras.
 */

export type FeedType = 'press' | 'video' | 'x' | 'generated';

/** Ämnet, inte tonen. Fyra ämnen räcker för att hitta rätt i flödet. */
export type FeedTag = 'match' | 'trupp' | 'klubb' | 'ungdom' | 'snack' | 'klipp';

export type FeedSource = {
  name: string;
  url?: string | null;
  official?: boolean;
};

export type FeedItem = {
  id: string;
  type: FeedType;
  ts: string;
  title: string;
  body?: string | null;
  /** Bara på klipp: YouTubes miniatyr. */
  thumbnail?: string | null;
  tag: FeedTag | string;
  links?: { kind: string; key: string }[];
  sources?: FeedSource[];
};

export type FeedResponse = {
  status?: string;
  updated_at?: string | null;
  count?: number;
  counts_by_tag?: Record<string, number>;
  items?: FeedItem[];
  error?: string;
};

export const TAGGAR: { nyckel: FeedTag; etikett: string }[] = [
  { nyckel: 'match', etikett: 'Match' },
  { nyckel: 'trupp', etikett: 'Truppen' },
  { nyckel: 'klubb', etikett: 'Klubben' },
  { nyckel: 'ungdom', etikett: 'Ungdom' },
  { nyckel: 'klipp', etikett: 'Klipp' },
  { nyckel: 'snack', etikett: 'Snacket' },
];

export function taggEtikett(tag: string): string {
  return TAGGAR.find(t => t.nyckel === tag)?.etikett ?? 'Klubben';
}

const MANADER = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const VECKODAGAR = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

/**
 * Hur färskt.
 *
 * "för 20 minuter sedan" säger något som "2026-09-06 22:12" inte säger, och det
 * är hela skillnaden mellan ett arkiv och ett flöde. Efter ett dygn tar
 * datumet över — "för 73 timmar sedan" är ingen upplysning.
 */
export function sedan(iso: string, nu: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.round((nu.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'nyss';
  if (min < 60) return `${min} min sedan`;
  const tim = Math.round(min / 60);
  if (tim < 24) return `${tim} h sedan`;
  return `${d.getDate()} ${MANADER[d.getMonth()]}`;
}

/** Klockslaget, som i ett flöde: 22.12, inte 22:12. */
export function klockan(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Dagrubriken. Datumet jämförs lokalt, inte i UTC — annars byter den dag kl 02. */
export function dagrubrik(iso: string, nu: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const skillnad = Math.round((dag(nu) - dag(d)) / 86400000);
  if (skillnad <= 0) return 'I dag';
  if (skillnad === 1) return 'I går';
  if (skillnad < 7) return VECKODAGAR[d.getDay()];
  return `${d.getDate()} ${MANADER[d.getMonth()]}`;
}

/** Dagnyckeln som grupperingen sorterar på. Lokal, av samma skäl som ovan. */
export function dagnyckel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
