/**
 * Kortet inför matchen, 1080 x 1080. Samma ram och typsnitt som kortet efter
 * matchen, så de två ser ut att höra ihop när de ligger i samma flöde.
 *
 * Mitt i står matchmodellens tre utfall. Finns ingen prognos — för tidigt på
 * säsongen, samma gräns som sajten — tar nedräkningen den platsen.
 */
import {
  AGAINST, CARD_SIZE, GOLD, GRON, GUL, INK, INK_2, INK_3, SVART,
  disp, drawEyebrow, drawFoot, drawFrame, fit, mono, roundRect, sans, tracked,
} from './matchCard';
import type { CardStat } from './matchCard';

export type ForeModel = {
  when: string[];
  eyebrow: string;
  /** Stor text: vinstchansen när prognosen finns, annars nedräkningen. */
  big: string;
  bigLabel: string;
  usLabel: string;
  themLabel: string;
  opponent: string;
  hero: { label: string; name: string; detail: string } | null;
  prognos: { vi: number; ot: number; de: number } | null;
  form: { team: string; games: { won: boolean; ot: boolean }[] }[];
  stats: CardStat[];
};

const pct = (v: number) => `${Math.round(v * 100)} %`;

function drawBar(ctx: CanvasRenderingContext2D, m: ForeModel, x: number, y: number, w: number) {
  const p = m.prognos!;
  const H = 92;

  ctx.textBaseline = 'alphabetic';
  mono(ctx, 19, 700);
  ctx.fillStyle = INK_2;
  ctx.textAlign = 'left';
  tracked(ctx, 'BJÖRKLÖVEN', x, y, 2);
  tracked(ctx, fit(ctx, m.opponent.toUpperCase(), 330), x + w, y, 2, 'right');
  ctx.textAlign = 'center';
  ctx.fillText('FÖRLÄNGNING', x + w / 2, y);

  // Fälten får minst en bredd som rymmer procenten; resten fördelas efter
  // sannolikheten. Annars hamnar "12 %" utanför ett för smalt fält.
  const min = 120;
  const rest = w - 3 * min - 12;
  const sum = p.vi + p.ot + p.de || 1;
  const bredd = [p.vi, p.ot, p.de].map(v => min + rest * (v / sum));
  const farg = [GUL, 'rgba(243,245,241,0.2)', SVART];
  let cx = x;
  const top = y + 24;
  [p.vi, p.ot, p.de].forEach((v, i) => {
    ctx.fillStyle = farg[i];
    roundRect(ctx, cx, top, bredd[i], H, 4);
    ctx.fill();
    ctx.fillStyle = i === 0 ? SVART : INK;
    disp(ctx, 64);
    ctx.textAlign = 'center';
    ctx.fillText(pct(v), cx + bredd[i] / 2, top + H / 2 + 22);
    cx += bredd[i] + 6;
  });
}

function drawForm(ctx: CanvasRenderingContext2D, m: ForeModel, x: number, y: number, w: number) {
  m.form.forEach((rad, i) => {
    const ry = y + i * 58;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    sans(ctx, 28, 500);
    ctx.fillStyle = INK_2;
    ctx.fillText(fit(ctx, `Form · ${rad.team}`, w - 5 * 44 - 20), x, ry);
    rad.games.slice(-5).forEach((g, j, alla) => {
      const cx = x + w - (alla.length - 1 - j) * 44 - 14;
      ctx.beginPath();
      ctx.arc(cx, ry, 14, 0, Math.PI * 2);
      ctx.fillStyle = g.won ? INK : AGAINST;
      ctx.fill();
      // Förlängning: en ring i stället för en fylld prick.
      if (g.ot) {
        ctx.beginPath();
        ctx.arc(cx, ry, 8, 0, Math.PI * 2);
        ctx.fillStyle = GRON;
        ctx.fill();
      }
    });
  });
  ctx.textBaseline = 'alphabetic';
}

export function drawForeMatchCard(ctx: CanvasRenderingContext2D, m: ForeModel) {
  const S = CARD_SIZE;
  const PAD = 58;
  const right = S - PAD;

  drawFrame(ctx, m.when);

  /* rubrikbrickan */
  let y = PAD + 84;
  if (m.eyebrow) {
    drawEyebrow(ctx, m.eyebrow, PAD, y);
    y += 46;
  }

  /* den stora siffran */
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_3;
  mono(ctx, 20, 600);
  tracked(ctx, m.bigLabel.toUpperCase(), PAD, y + 50, 2);
  ctx.fillStyle = m.prognos ? GOLD : INK;
  // Krymp hellre än korta av: "I morgon" ska stå kvar, inte bli "I morg…".
  const big = m.big.toUpperCase();
  let size = 200;
  disp(ctx, size);
  while (size > 110 && ctx.measureText(big).width > (m.hero ? 540 : S - PAD * 2)) {
    size -= 6;
    disp(ctx, size);
  }
  ctx.fillText(big, PAD - 4, y + 200);

  sans(ctx, 36, 600);
  ctx.fillStyle = GUL;
  ctx.fillText(m.usLabel, PAD, y + 256);
  const usWidth = ctx.measureText(m.usLabel).width;
  sans(ctx, 36, 400);
  ctx.fillStyle = INK_2;
  ctx.fillText(fit(ctx, m.themLabel, S - PAD * 2 - usWidth - 12), PAD + usWidth + 12, y + 256);

  /* motståndarens poängbästa, till höger */
  if (m.hero) {
    ctx.textAlign = 'right';
    ctx.fillStyle = INK_3;
    mono(ctx, 20, 600);
    tracked(ctx, m.hero.label.toUpperCase(), right, y + 50, 2, 'right');
    ctx.fillStyle = INK;
    disp(ctx, 72);
    ctx.fillText(fit(ctx, m.hero.name.toUpperCase(), 400), right, y + 120);
    ctx.fillStyle = GOLD;
    sans(ctx, 28, 500);
    ctx.fillText(fit(ctx, m.hero.detail, 400), right, y + 162);
    ctx.textAlign = 'left';
  }

  /* mitten: prognosen och formen */
  const mitt = 560;
  if (m.prognos) {
    drawBar(ctx, m, PAD, mitt, S - PAD * 2);
    drawForm(ctx, m, PAD, mitt + 190, S - PAD * 2);
  } else {
    drawForm(ctx, m, PAD, mitt + 60, S - PAD * 2);
  }

  drawFoot(ctx, m.stats);
}
