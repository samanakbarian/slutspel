/**
 * Matchens delbara kort, ritat pa canvas i 1080x1080.
 *
 * Kortet ritas en gang och visas nedskalat pa sidan — forhandsvisningen ar
 * alltsa samma pixlar som exporten, inte en HTML-kopia som liknar den. Det
 * var skalet att valja canvas framfor SVG: en SVG som rasteriseras via en
 * bild ritas i en sandlada utan tillgang till sidans typsnitt, sa Outfit och
 * Inter hade fallit tillbaka pa systemets snitt i just den bild som delas.
 *
 * Ingenting harleds har som sidan inte redan visar. Kortet far bara sammanfatta.
 */

export type CardStat = { label: string; value: string };

export type CardStep = {
  /** Loptid i minuter nar malet gjordes. */
  minute: number;
  /** Maldifferensen efter malet, sett fran Bjorkloven. */
  diff: number;
  ours: boolean;
  /** Stallningen som text, "4-3". Anvands bara for de tva markerade punkterna. */
  state: string;
};

export type CardModel = {
  /** Datum, arena och publik. Arenan faller bort först när raden inte ryms. */
  when: string[];
  /** Vad matchen handlade om: "Vandning fran 0-2". Tom nar inget sticker ut. */
  eyebrow: string;
  score: string;
  /** "Bjorkloven borta mot AIK" — lagnamnet fetstilas separat. */
  usLabel: string;
  themLabel: string;
  hero: { label: string; name: string; detail: string } | null;
  steps: CardStep[];
  /** Antal perioder, inklusive forlangning och straffar. */
  periods: number;
  stats: CardStat[];
  outcome: 'win' | 'loss' | 'draw';
};

export const CARD_SIZE = 1080;

const INK = '#f1f7f4';
const INK_2 = '#acc7ba';
const INK_3 = '#7c9a8b';
const BRAND = '#42d883';
const FOR = '#1baf7a';
const AGAINST = '#d95926';
const GOLD = '#f5c045';

const DISPLAY = "'Outfit', system-ui, sans-serif";
const SANS = "'Inter', system-ui, sans-serif";

/** Snitten maste vara laddade innan kortet ritas, annars mats fel bredder. */
export async function cardFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.all([
      fonts.load(`700 173px ${DISPLAY}`),
      fonts.load(`600 50px ${DISPLAY}`),
      fonts.load(`700 27px ${SANS}`),
      fonts.load(`400 37px ${SANS}`),
    ]);
    await fonts.ready;
  } catch {
    // Ett snitt som inte gar att ladda ska inte hindra kortet — det ritas da
    // i reservsnittet, precis som sidan sjalv skulle gora.
  }
}

/**
 * Text med teckenavstand.
 *
 * `ctx.letterSpacing` anvands nar det finns — det behaller kerningen mellan
 * paren. Saknas det (Safari fore 17.4) ritas tecknen ett i taget, vilket ger
 * ratt bredd men lite ojamnare mellanrum i par som VA och JO. Bada vagarna
 * matas med samma funktion, sa uppmatt bredd stammer med det som ritas.
 */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: 'left' | 'right' = 'left',
): number {
  const native = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (typeof native.letterSpacing === 'string') {
    native.letterSpacing = `${spacing}px`;
    const width = ctx.measureText(text).width;
    const prev = ctx.textAlign;
    ctx.textAlign = align === 'right' ? 'right' : 'left';
    ctx.fillText(text, x, y);
    ctx.textAlign = prev;
    native.letterSpacing = '0px';
    return width;
  }
  const chars = [...text];
  const width =
    chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'right' ? x - width : x;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  return width;
}

/**
 * Sa manga delar av raden som ryms.
 *
 * Arenanamnet ar den langsta och minst viktiga biten, sa den faller bort
 * fore publiksiffran. Att korta av med tre punkter i stallet hade lamnat
 * "Hovet, Johanneshov · 7…" — en avhuggen siffra sager ingenting.
 */
function widest(ctx: CanvasRenderingContext2D, parts: string[], max: number): string {
  const options = [parts, parts.filter((_, i) => i !== 1), [parts[0]]];
  for (const opt of options) {
    const text = opt.filter(Boolean).join(' · ');
    if (ctx.measureText(text).width <= max) return text;
  }
  return fit(ctx, parts.filter(Boolean).join(' · '), max);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Kortar en text tills den ryms, med tre punkter. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
}

/* ── steg-diagrammet ───────────────────────────────────────────────────── */

function drawChart(ctx: CanvasRenderingContext2D, m: CardModel, x: number, y: number, w: number, h: number) {
  // Marginal efter 65 minuter: avgörandet i straffläggningen skrivs på
  // 65:00, och utan luft efter den ligger sista steget på diagrammets kant.
  const len = m.periods > 3 ? 68 : 60;
  const px = (min: number) => x + (Math.min(min, len) / len) * w;

  const diffs = m.steps.map(s => s.diff);
  const lo = Math.min(0, ...diffs);
  const hi = Math.max(0, ...diffs);
  const span = hi - lo + 1.2;
  const py = (d: number) => y + h - ((d - lo + 0.6) / span) * h;

  // Y-axelns hela steg, ett per mals skillnad.
  ctx.font = `500 22px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let d = lo; d <= hi; d++) {
    ctx.fillStyle = INK_3;
    ctx.fillText(d > 0 ? `+${d}` : String(d), x - 14, py(d));
  }

  // Periodgranser. Straffarna far ingen egen linje — de ar en punkt i tiden.
  ctx.strokeStyle = 'rgba(172,199,186,0.14)';
  ctx.lineWidth = 1.5;
  for (const min of [20, 40, 60].slice(0, Math.min(3, m.periods - 1))) {
    ctx.beginPath();
    ctx.moveTo(px(min), y);
    ctx.lineTo(px(min), y + h);
    ctx.stroke();
  }

  // Nollinjen: over den leder Bjorkloven.
  ctx.strokeStyle = 'rgba(172,199,186,0.36)';
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(x, py(0));
  ctx.lineTo(x + w, py(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Trappan: hall nivan till nasta mal, hoppa sedan.
  const pts = [{ x, y: py(0) }];
  for (const s of m.steps) pts.push({ x: px(s.minute), y: py(s.diff) });
  pts.push({ x: x + w, y: pts[pts.length - 1].y });

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  };

  // Ytan mellan trappan och nollinjen, i tva farger: det som var ledning och
  // det som var underlage. En enda farg hade dolt vandningen, som ar hela
  // poangen med kortet.
  ctx.save();
  trace();
  ctx.lineTo(x + w, py(0));
  ctx.lineTo(x, py(0));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = 'rgba(27,175,122,0.22)';
  ctx.fillRect(x, y, w, py(0) - y);
  ctx.fillStyle = 'rgba(217,89,38,0.28)';
  ctx.fillRect(x, py(0), w, y + h - py(0));
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  trace();
  ctx.stroke();

  // Punkterna: gront for vara mal, brant orange for motstandarens.
  m.steps.forEach((s, i) => {
    ctx.beginPath();
    ctx.arc(pts[i + 1].x, pts[i + 1].y, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = s.ours ? FOR : AGAINST;
    ctx.fill();
  });

  // Tva stallningar skrivs ut: den varsta punkten och slutresultatet. Fler
  // an sa och siffrorna borjar sitta i varandra.
  const worst = m.steps.reduce(
    (best, s, i) => (s.diff < (m.steps[best]?.diff ?? 0) ? i : best),
    -1,
  );
  const last = m.steps.length - 1;
  ctx.font = `700 24px ${SANS}`;
  ctx.textAlign = 'center';
  const label = (i: number, above: boolean, colour: string) => {
    if (i < 0 || !m.steps[i]) return;
    ctx.fillStyle = colour;
    ctx.textBaseline = above ? 'bottom' : 'top';
    const cx = Math.min(Math.max(pts[i + 1].x, x + 24), x + w - 24);
    ctx.fillText(m.steps[i].state, cx, pts[i + 1].y + (above ? -20 : 20));
  };
  if (worst >= 0 && m.steps[worst].diff < 0 && worst !== last) label(worst, false, AGAINST);
  label(last, m.steps[last].diff >= 0, m.steps[last].diff >= 0 ? GOLD : INK_2);

  // Periodernas namn under diagrammet.
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = INK_3;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const marks: [string, number][] = [
    ['Period 1', 10],
    ['Period 2', 30],
    ['Period 3', 50],
  ];
  if (m.periods > 3) marks.push([m.periods > 4 ? 'Straffar' : 'Förl.', 64]);
  for (const [text, min] of marks.slice(0, Math.max(3, m.periods))) {
    ctx.fillText(text, px(min), y + h + 18);
  }
}

/* ── kortet ────────────────────────────────────────────────────────────── */

export function drawMatchCard(ctx: CanvasRenderingContext2D, m: CardModel) {
  const S = CARD_SIZE;
  const PAD = 58;
  const right = S - PAD;

  ctx.clearRect(0, 0, S, S);

  const base = ctx.createLinearGradient(S * 0.15, 0, S * 0.85, S);
  base.addColorStop(0, '#0d3524');
  base.addColorStop(0.52, '#082018');
  base.addColorStop(1, '#05130e');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  const glow = ctx.createRadialGradient(S * 0.82, S * 0.04, 0, S * 0.82, S * 0.04, S * 0.72);
  glow.addColorStop(0, 'rgba(66,216,131,0.17)');
  glow.addColorStop(1, 'rgba(66,216,131,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(66,216,131,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, S - 2, S - 2);

  /* rad 1: avsandare och nar */
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND;
  ctx.font = `700 32px ${DISPLAY}`;
  tracked(ctx, 'LÖVENLÄGET', PAD, PAD + 30, 5.1);

  ctx.fillStyle = INK_3;
  ctx.font = `400 28px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(widest(ctx, m.when, 560), right, PAD + 30);

  /* rubrikbrickan */
  let y = PAD + 84;
  if (m.eyebrow) {
    ctx.font = `700 26px ${SANS}`;
    ctx.textAlign = 'left';
    const w = [...m.eyebrow].reduce((a, c) => a + ctx.measureText(c).width, 0) + 2.6 * (m.eyebrow.length - 1);
    ctx.fillStyle = 'rgba(27,175,122,0.18)';
    roundRect(ctx, PAD, y, w + 44, 50, 11);
    ctx.fill();
    ctx.fillStyle = FOR;
    tracked(ctx, m.eyebrow, PAD + 22, y + 34, 2.6);
    y += 50;
  }

  /* resultatet */
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `700 168px ${DISPLAY}`;
  ctx.fillText(m.score, PAD - 6, y + 152);

  ctx.font = `400 36px ${SANS}`;
  ctx.fillStyle = INK;
  const usWidth = ctx.measureText(m.usLabel).width;
  ctx.font = `600 36px ${SANS}`;
  ctx.fillText(m.usLabel, PAD, y + 208);
  ctx.font = `400 36px ${SANS}`;
  ctx.fillStyle = INK_2;
  ctx.fillText(m.themLabel, PAD + usWidth + 12, y + 208);

  /* matchens spelare, till hoger om siffran */
  if (m.hero) {
    ctx.textAlign = 'right';
    ctx.fillStyle = INK_3;
    ctx.font = `700 25px ${SANS}`;
    tracked(ctx, m.hero.label.toUpperCase(), right, y + 44, 2.2, 'right');

    ctx.fillStyle = INK;
    ctx.font = `600 50px ${DISPLAY}`;
    ctx.fillText(fit(ctx, m.hero.name, 430), right, y + 106);

    ctx.fillStyle = GOLD;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText(fit(ctx, m.hero.detail, 430), right, y + 150);
  }

  /* diagrammet */
  if (m.steps.length > 0) drawChart(ctx, m, PAD + 52, 508, S - PAD * 2 - 52, 268);

  /* fotens fyra tal */
  const line = 878;
  ctx.strokeStyle = 'rgba(66,216,131,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, line);
  ctx.lineTo(right, line);
  ctx.stroke();

  const stats = m.stats.slice(0, 4);
  if (stats.length > 0) {
    const cell = (S - PAD * 2) / stats.length;
    ctx.textAlign = 'left';
    stats.forEach((s, i) => {
      const cx = PAD + cell * i;
      ctx.fillStyle = INK_3;
      ctx.font = `700 25px ${SANS}`;
      tracked(ctx, s.label.toUpperCase(), cx, line + 46, 2.8);
      ctx.fillStyle = INK;
      ctx.font = `600 48px ${DISPLAY}`;
      ctx.fillText(fit(ctx, s.value, cell - 18), cx, line + 108);
    });
  }
}

/** Kortet som PNG-blob, i full storlek oavsett hur det visas pa sidan. */
export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Kunde inte skapa bilden.'))), 'image/png');
  });
}
