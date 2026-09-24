/**
 * Kortet inför matchen, 1080 x 1080. Samma ram och typsnitt som kortet efter
 * matchen, så de två ser ut att höra ihop när de ligger i samma flöde.
 *
 * Mitt i står matchmodellens tre utfall. Finns ingen prognos — för tidigt på
 * säsongen, samma gräns som sajten — tar nedräkningen den platsen.
 */
import {
  AGAINST, CARD_SIZE, DISPLAY, FOR, GOLD, INK, INK_2, INK_3, SANS,
  drawFrame, fit, roundRect, tracked,
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
  ctx.font = `700 24px ${SANS}`;
  ctx.fillStyle = INK_3;
  ctx.textAlign = 'left';
  tracked(ctx, 'BJÖRKLÖVEN', x, y, 2.4);
  tracked(ctx, fit(ctx, m.opponent.toUpperCase(), 360), x + w, y, 2.4, 'right');
  ctx.textAlign = 'center';
  ctx.fillText('FÖRLÄNGNING', x + w / 2, y);

  // Fälten får minst en bredd som rymmer procenten; resten fördelas efter
  // sannolikheten. Annars hamnar "12 %" utanför ett för smalt fält.
  const min = 120;
  const rest = w - 3 * min - 12;
  const sum = p.vi + p.ot + p.de || 1;
  const bredd = [p.vi, p.ot, p.de].map(v => min + rest * (v / sum));
  const farg = [FOR, 'rgba(172,199,186,0.28)', AGAINST];
  let cx = x;
  const top = y + 24;
  [p.vi, p.ot, p.de].forEach((v, i) => {
    ctx.fillStyle = farg[i];
    roundRect(ctx, cx, top, bredd[i], H, 12);
    ctx.fill();
    ctx.fillStyle = i === 1 ? INK : '#ffffff';
    ctx.font = `700 44px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText(pct(v), cx + bredd[i] / 2, top + H / 2 + 16);
    cx += bredd[i] + 6;
  });
}

function drawForm(ctx: CanvasRenderingContext2D, m: ForeModel, x: number, y: number, w: number) {
  m.form.forEach((rad, i) => {
    const ry = y + i * 58;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `500 28px ${SANS}`;
    ctx.fillStyle = INK_2;
    ctx.fillText(fit(ctx, `Form · ${rad.team}`, w - 5 * 44 - 20), x, ry);
    rad.games.slice(-5).forEach((g, j, alla) => {
      const cx = x + w - (alla.length - 1 - j) * 44 - 14;
      ctx.beginPath();
      ctx.arc(cx, ry, 14, 0, Math.PI * 2);
      ctx.fillStyle = g.won ? FOR : AGAINST;
      ctx.fill();
      // Förlängning: en ring i stället för en fylld prick.
      if (g.ot) {
        ctx.beginPath();
        ctx.arc(cx, ry, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#082018';
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

  /* den stora siffran */
  ctx.textAlign = 'left';
  ctx.fillStyle = INK_3;
  ctx.font = `700 25px ${SANS}`;
  tracked(ctx, m.bigLabel.toUpperCase(), PAD, y + 50, 2.2);
  ctx.fillStyle = m.prognos ? GOLD : INK;
  // Krymp hellre än korta av: "I morgon" ska stå kvar, inte bli "I morg…".
  let size = 150;
  ctx.font = `700 ${size}px ${DISPLAY}`;
  while (size > 90 && ctx.measureText(m.big).width > (m.hero ? 540 : S - PAD * 2)) {
    size -= 6;
    ctx.font = `700 ${size}px ${DISPLAY}`;
  }
  ctx.fillText(m.big, PAD - 6, y + 186);

  ctx.font = `600 36px ${SANS}`;
  ctx.fillStyle = INK;
  ctx.fillText(m.usLabel, PAD, y + 240);
  const usWidth = ctx.measureText(m.usLabel).width;
  ctx.font = `400 36px ${SANS}`;
  ctx.fillStyle = INK_2;
  ctx.fillText(fit(ctx, m.themLabel, S - PAD * 2 - usWidth - 12), PAD + usWidth + 12, y + 240);

  /* motståndarens poängbästa, till höger */
  if (m.hero) {
    ctx.textAlign = 'right';
    ctx.fillStyle = INK_3;
    ctx.font = `700 25px ${SANS}`;
    tracked(ctx, m.hero.label.toUpperCase(), right, y + 50, 2.2, 'right');
    ctx.fillStyle = INK;
    ctx.font = `600 50px ${DISPLAY}`;
    ctx.fillText(fit(ctx, m.hero.name, 400), right, y + 112);
    ctx.fillStyle = GOLD;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText(fit(ctx, m.hero.detail, 400), right, y + 156);
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

  /* fotens tal */
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
