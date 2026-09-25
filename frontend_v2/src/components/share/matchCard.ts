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
  /** Hemmalag–bortalag, som resultat skrivs överallt. */
  score: string;
  /** Lagen under resultatet i samma ordning, vårt lag fetstilat. */
  lag: { text: string; ours: boolean }[];
  hero: { label: string; name: string; detail: string } | null;
  steps: CardStep[];
  /** Antal perioder, inklusive forlangning och straffar. */
  periods: number;
  stats: CardStat[];
  outcome: 'win' | 'loss' | 'draw';
};

export const CARD_SIZE = 1080;

export const GRON = '#0b6b44';
export const SVART = '#0f1a15';
export const GUL = '#ffc72c';
export const INK = '#f3f5f1';
export const INK_2 = 'rgba(243,245,241,0.8)';
export const INK_3 = 'rgba(243,245,241,0.6)';
export const BRAND = GUL;
export const FOR = GUL;
export const AGAINST = '#e0552f';
export const GOLD = GUL;

export const DISPLAY = "'Anybody', 'Arial Narrow', system-ui, sans-serif";
export const SANS = "'Instrument Sans', system-ui, sans-serif";
export const MONO = "'Martian Mono', ui-monospace, monospace";

function bredd(ctx: CanvasRenderingContext2D, v: CanvasFontStretch) {
  if ('fontStretch' in ctx) ctx.fontStretch = v;
}
/** De stora talen: Anybody i smalt snitt, som på sidan. */
export function disp(ctx: CanvasRenderingContext2D, size: number, weight = 900) {
  ctx.font = `${weight} ${size}px ${DISPLAY}`;
  bredd(ctx, 'extra-condensed');
}
/** Etiketter i mono. */
export function mono(ctx: CanvasRenderingContext2D, size: number, weight = 600) {
  ctx.font = `${weight} ${size}px ${MONO}`;
  bredd(ctx, 'semi-condensed');
}
/** Löptext. */
export function sans(ctx: CanvasRenderingContext2D, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px ${SANS}`;
  bredd(ctx, 'normal');
}

/** Snitten maste vara laddade innan kortet ritas, annars mats fel bredder. */
export async function cardFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.all([
      fonts.load(`900 100px ${DISPLAY}`),
      fonts.load(`600 30px ${MONO}`),
      fonts.load(`600 30px ${SANS}`),
      fonts.load(`400 30px ${SANS}`),
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
export function tracked(
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
export function widest(ctx: CanvasRenderingContext2D, parts: string[], max: number): string {
  const options = [parts, parts.filter((_, i) => i !== 1), [parts[0]]];
  for (const opt of options) {
    const text = opt.filter(Boolean).join(' · ');
    if (ctx.measureText(text).width <= max) return text;
  }
  return fit(ctx, parts.filter(Boolean).join(' · '), max);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
export function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
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
  mono(ctx, 19, 500);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let d = lo; d <= hi; d++) {
    ctx.fillStyle = INK_3;
    ctx.fillText(d > 0 ? `+${d}` : String(d), x - 14, py(d));
  }

  // Periodgranser. Straffarna far ingen egen linje — de ar en punkt i tiden.
  ctx.strokeStyle = 'rgba(243,245,241,0.16)';
  ctx.lineWidth = 1.5;
  for (const min of [20, 40, 60].slice(0, Math.min(3, m.periods - 1))) {
    ctx.beginPath();
    ctx.moveTo(px(min), y);
    ctx.lineTo(px(min), y + h);
    ctx.stroke();
  }

  // Nollinjen: over den leder Bjorkloven.
  ctx.strokeStyle = 'rgba(243,245,241,0.42)';
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
  ctx.fillStyle = 'rgba(243,245,241,0.16)';
  ctx.fillRect(x, y, w, py(0) - y);
  ctx.fillStyle = 'rgba(224,85,47,0.42)';
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
  mono(ctx, 22, 700);
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
  mono(ctx, 17, 500);
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

/**
 * Bakgrunden, ramen och huvudet: avsändare, adress och när. Delas av alla
 * kort så att de ser ut att höra ihop i ett flöde.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, when: string[], yta = GRON) {
  const S = CARD_SIZE;
  const PAD = 58;
  const right = S - PAD;
  const m = { when };

  ctx.clearRect(0, 0, S, S);

  // Klubbens färg som hel yta och en gul list längst ned, som på sidan.
  ctx.fillStyle = yta;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = GUL;
  ctx.fillRect(0, S - 14, S, 14);

  /* rad 1: avsandare och nar */
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = GUL;
  mono(ctx, 26, 700);
  tracked(ctx, 'LÖVENLÄGET', PAD, PAD + 30, 4);

  ctx.fillStyle = INK_2;
  mono(ctx, 20, 500);
  ctx.textAlign = 'right';
  ctx.fillText(widest(ctx, m.when, 560), right, PAD + 30);

  // Adressen, direkt under avsändaren. En bild reser längre än en länk i ett
  // supportergäng, och utan den bär den ingen väg tillbaka. Dämpad med flit:
  // den ska gå att hitta, inte tränga sig på.
  //
  // Raden ligger mellan varumärket (PAD+30) och rubrikbrickan (PAD+84). Nere
  // vid foten fanns ingen plats: de fyra talen har sin baslinje på 986 och
  // ramen slutar på 1022.
  ctx.fillStyle = INK_3;
  mono(ctx, 19, 500);
  ctx.textAlign = 'left';
  tracked(ctx, 'SIDA377.SE', PAD, PAD + 58, 3);
}

export function drawMatchCard(ctx: CanvasRenderingContext2D, m: CardModel) {
  const S = CARD_SIZE;
  const PAD = 58;
  const right = S - PAD;

  drawFrame(ctx, m.when, m.outcome === 'loss' ? SVART : GRON);

  /* rubrikbrickan */
  let y = PAD + 84;
  if (m.eyebrow) {
    drawEyebrow(ctx, m.eyebrow, PAD, y);
    y += 46;
  }

  /* resultatet */
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  disp(ctx, 250);
  ctx.fillText(m.score, PAD - 4, y + 206);

  let lx = PAD;
  m.lag.forEach((del, i) => {
    const text = i < m.lag.length - 1 ? `${del.text} –` : del.text;
    sans(ctx, 36, del.ours ? 600 : 400);
    ctx.fillStyle = del.ours ? GUL : INK_2;
    ctx.fillText(text, lx, y + 256);
    lx += ctx.measureText(text).width + 12;
  });

  /* matchens spelare, till hoger om siffran */
  if (m.hero) {
    ctx.textAlign = 'right';
    ctx.fillStyle = INK_3;
    mono(ctx, 20, 600);
    tracked(ctx, m.hero.label.toUpperCase(), right, y + 44, 2, 'right');

    ctx.fillStyle = INK;
    disp(ctx, 72);
    ctx.fillText(fit(ctx, m.hero.name.toUpperCase(), 400), right, y + 114);

    ctx.fillStyle = GOLD;
    sans(ctx, 28, 500);
    ctx.fillText(fit(ctx, m.hero.detail, 400), right, y + 156);
  }

  /* diagrammet */
  if (m.steps.length > 0) drawChart(ctx, m, PAD + 52, 508, S - PAD * 2 - 52, 268);

  drawFoot(ctx, m.stats);
}

/** Rubrikbrickan: gul platta, svart mono. */
export function drawEyebrow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const t = text.toUpperCase();
  mono(ctx, 21, 700);
  ctx.textAlign = 'left';
  const w = ctx.measureText(t).width + 2 * (t.length - 1);
  ctx.fillStyle = GUL;
  roundRect(ctx, x, y, w + 36, 46, 4);
  ctx.fill();
  ctx.fillStyle = SVART;
  tracked(ctx, t, x + 18, y + 31, 2);
}

/** Fotens fyra tal under en tunn linje. Delas av båda korten. */
export function drawFoot(ctx: CanvasRenderingContext2D, alla: CardStat[]) {
  const S = CARD_SIZE;
  const PAD = 58;
  const line = 878;
  ctx.strokeStyle = 'rgba(243,245,241,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, line);
  ctx.lineTo(S - PAD, line);
  ctx.stroke();

  const stats = alla.slice(0, 4);
  if (stats.length === 0) return;
  const cell = (S - PAD * 2) / stats.length;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  stats.forEach((s, i) => {
    const cx = PAD + cell * i;
    ctx.fillStyle = INK_3;
    mono(ctx, 18, 600);
    tracked(ctx, fit(ctx, s.label.toUpperCase(), cell - 18), cx, line + 44, 1.6);
    ctx.fillStyle = INK;
    disp(ctx, 70);
    ctx.fillText(fit(ctx, s.value, cell - 18), cx, line + 116);
  });
}

/** Kortet som PNG-blob, i full storlek oavsett hur det visas pa sidan. */
export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Kunde inte skapa bilden.'))), 'image/png');
  });
}

/** Storyformatet: 1080 x 1920, för Instagram och Snapchat. */
export const STORY_HEIGHT = 1920;

/**
 * Det kvadratiska kortet mitt i en stående bild.
 *
 * Storyappar lägger sina egna knappar överst och nederst, så kortet hålls i
 * mitten och ytan runt det bär bara adressen. Samma pixlar som kvadraten —
 * två layouter att hålla i takt hade glidit isär.
 */
export function drawStory(
  ctx: CanvasRenderingContext2D,
  drawSquare: (c: CanvasRenderingContext2D) => void,
  rubrik = '',
) {
  const W = CARD_SIZE;
  const H = STORY_HEIGHT;
  const top = (H - W) / 2;

  ctx.save();
  ctx.translate(0, top);
  drawSquare(ctx);
  ctx.restore();

  // Ytan runt kortet får kortets egen färg, grön eller svart.
  const [r, g, b] = ctx.getImageData(4, top + 4, 1, 1).data;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, W, top);
  ctx.fillRect(0, top + W, W, H - top - W);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  // Rubriken ovanför kortet, under appens egen knapprad.
  if (rubrik) {
    ctx.fillStyle = INK;
    disp(ctx, 130);
    ctx.textAlign = 'center';
    ctx.fillText(fit(ctx, rubrik.toUpperCase(), W - 120), W / 2, top - 70);
  }

  ctx.fillStyle = GUL;
  mono(ctx, 38, 700);
  ctx.textAlign = 'left';
  const w = ctx.measureText('SIDA377.SE').width + 5 * 9;
  tracked(ctx, 'SIDA377.SE', W / 2 - w / 2, top + W + 190, 5);
}
