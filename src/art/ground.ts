import { ART_H, ART_W, tileToArt } from '../game/iso';
import { shade } from './pix';

export interface Background {
  /** Map is size × size tiles. */
  size: number;
  /** Sky bands, top → bottom. */
  sky: string[];
  hills: [far: string, near: string];
  ground: [string, string];
  side: [left: string, right: string];
  /** Little flower colours sprinkled on the ground. */
  flowers: string[];
}

function seeded(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Extra backdrop around the ART_W × ART_H stage, shown when the viewport is wider/taller. */
export const BG_MARGIN = { x: 160, y: 100 };
export const BG_W = ART_W + BG_MARGIN.x * 2;
export const BG_H = ART_H + BG_MARGIN.y * 2;

/** Paints the static isometric backdrop at 1× art resolution into a BG_W × BG_H canvas. */
export function paintBackground(ctx: CanvasRenderingContext2D, bg: Background) {
  const rnd = seeded(42);
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  ctx.save();
  ctx.translate(BG_MARGIN.x, BG_MARGIN.y);
  const x0 = -BG_MARGIN.x, x1 = ART_W + BG_MARGIN.x, bottom = ART_H + BG_MARGIN.y;

  // sky bands with a dithered seam
  const band = 24;
  px(x0, -BG_MARGIN.y, BG_W, BG_H, bg.sky[bg.sky.length - 1]);
  bg.sky.forEach((c, i) => {
    const top = i ? i * band : -BG_MARGIN.y;
    px(x0, top, BG_W, (i + 1) * band - top, c);
    if (i) for (let x = x0; x < x1; x += 2) px(x, top, 1, 1, bg.sky[i - 1]);
  });
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(x0 + rnd() * BG_W), y = Math.floor(-BG_MARGIN.y + rnd() * (BG_MARGIN.y + 62));
    px(x, y, 1, 1, '#fffaf0');
    if (rnd() < 0.15) px(x - 1, y, 3, 1, '#fffaf0'), px(x, y - 1, 1, 3, '#fffaf0');
  }
  for (let dy = -8; dy <= 8; dy++) {
    const half = Math.floor(Math.sqrt(64 - dy * dy));
    px(262 - half, 24 + dy, half * 2, 1, '#fff4d6');
  }
  px(258, 20, 2, 2, '#f3e3bd');
  px(265, 27, 3, 2, '#f3e3bd');

  // two hill ridges
  for (let x = x0; x < x1; x++) {
    const far = 74 + Math.round(10 * Math.sin(x * 0.025 + 1) + 5 * Math.sin(x * 0.09));
    px(x, far, 1, bottom - far, bg.hills[0]);
  }
  for (let x = x0; x < x1; x++) {
    const near = 92 + Math.round(7 * Math.sin(x * 0.04) + 4 * Math.sin(x * 0.13 + 2));
    px(x, near, 1, bottom - near, bg.hills[1]);
  }

  // platform side faces, then the tiles on top
  const n = bg.size, depth = 10;
  const L = tileToArt(0, n), B = tileToArt(n, n), R = tileToArt(n, 0);
  for (let x = L.x; x < R.x; x++) {
    const left = x < B.x;
    const y = left ? L.y + Math.floor((x - L.x) / 2) : B.y - Math.floor((x - B.x) / 2);
    px(x, y - 1, 1, depth + 1, bg.side[left ? 0 : 1]);
    px(x, y - 1, 1, 3, shade(bg.ground[1], -0.2));
  }
  for (let ty = 0; ty < n; ty++)
    for (let tx = 0; tx < n; tx++) {
      const { x, y } = tileToArt(tx, ty);
      const c = bg.ground[(tx + ty) % 2];
      for (let r = 0; r < 15; r++) {
        const half = r < 8 ? 2 * (r + 1) : 2 * (15 - r);
        px(x - half, y + r, half * 2, 1, c);
      }
    }

  // grass tufts & flowers
  const tuft = shade(bg.ground[0], -0.18);
  for (let i = 0; i < 44; i++) {
    const a = tileToArt(0.4 + rnd() * (n - 0.8), 0.4 + rnd() * (n - 0.8));
    const x = Math.round(a.x), y = Math.round(a.y);
    if (rnd() < 0.6) {
      px(x, y, 1, 2, tuft);
      px(x + 2, y + 1, 1, 1, tuft);
    } else {
      const c = bg.flowers[Math.floor(rnd() * bg.flowers.length)];
      px(x - 1, y, 3, 1, c);
      px(x, y - 1, 1, 3, c);
      px(x, y, 1, 1, '#fff6c9');
    }
  }
  ctx.restore();
}
