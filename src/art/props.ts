import { Pix, shade } from './pix';

export type ArtKind =
  | 'pine' | 'bush' | 'rock' | 'log' | 'tent' | 'campfire' | 'grill' | 'lantern'
  | 'pew' | 'altar' | 'candles' | 'board' | 'plant'
  | 'building' | 'fountain';

const WOOD = '#c58f63';
const WAX = '#fff4e6';

/** A little candle flame; `tall` alternates per frame for flicker. */
function flame(p: Pix, x: number, y: number, tall: boolean) {
  p.put(x, tall ? y - 1 : y, 2, tall ? 3 : 2, '#ffb347');
  p.put(x, y + 1, 1, 1, '#fff1a8');
}

interface Art {
  w: number;
  h: number;
  /** Animated art redraws through these frames. */
  frames?: number;
  /** Additive light colour drawn around the object. */
  glow?: number;
  /** `color` is the object's own tint (e.g. a building's roof), when it has one. */
  draw: (p: Pix, frame: number, color: string) => void;
}

/** Two-tone triangle (lit left, shaded right) with a darker bottom edge. */
function tri(p: Pix, cx: number, top: number, rows: number, light: string, dark: string) {
  for (let r = 0; r < rows; r++) {
    const half = r + 1;
    const last = r === rows - 1;
    p.put(cx - half, top + r, half, 1, last ? shade(dark, -0.08) : light);
    p.put(cx, top + r, half, 1, last ? shade(dark, -0.15) : dark);
  }
}

export const ART: Record<ArtKind, Art> = {
  pine: {
    w: 22,
    h: 29,
    draw(p) {
      p.put(9, 22, 4, 6, '#a0705a');
      tri(p, 11, 12, 10, '#9edbb8', '#7cc3a0');
      tri(p, 11, 7, 8, '#a8e2c0', '#84c9a6');
      tri(p, 11, 2, 7, '#b4e8ca', '#8ccfac');
    },
  },
  bush: {
    w: 18,
    h: 12,
    draw(p) {
      const g = '#a3dcb5';
      p.put(4, 2, 10, 1, g);
      p.put(2, 3, 14, 6, g);
      p.put(2, 7, 14, 2, shade(g, -0.12));
      p.put(5, 3, 4, 1, shade(g, 0.3));
      for (const [x, y] of [[6, 5], [11, 4], [13, 7]]) p.put(x, y, 1, 1, '#ffb3c6');
    },
  },
  rock: {
    w: 14,
    h: 9,
    draw(p) {
      const r = '#d3cce0';
      p.put(4, 2, 6, 1, r);
      p.put(2, 3, 10, 4, r);
      p.put(3, 6, 8, 1, shade(r, -0.12));
      p.put(4, 3, 3, 1, shade(r, 0.35));
    },
  },
  log: {
    w: 26,
    h: 9,
    draw(p) {
      p.put(2, 2, 20, 5, '#b9825e');
      p.put(2, 4, 20, 1, '#a06d4c');
      p.put(21, 2, 3, 5, '#f0c99b');
      p.put(22, 4, 1, 1, '#d9a877');
    },
  },
  tent: {
    w: 38,
    h: 29,
    draw(p) {
      const cx = 19, top = 3, rows = 25;
      for (let r = 0; r < rows; r++) {
        const half = Math.round(1 + r * 0.66);
        p.put(cx - half, top + r, half, 1, '#ffb09c');
        p.put(cx, top + r, half, 1, '#f2907e');
        const door = r > 9 ? Math.round((r - 9) * 0.45) : 0;
        if (door) p.put(cx - door, top + r, door * 2, 1, r === rows - 1 ? '#6a4b58' : '#7a5866');
      }
      p.put(cx - 17, top + rows - 2, 10, 1, '#fff1d6');
      p.put(cx + 7, top + rows - 2, 10, 1, '#fff1d6');
      p.put(cx, 1, 1, 2, '#8b5a3c');
      p.put(cx + 1, 1, 3, 1, '#ffe08a');
    },
  },
  campfire: {
    w: 26,
    h: 26,
    frames: 4,
    glow: 0xffa860,
    draw(p, f) {
      for (let i = 0; i < 10; i++) {
        const mid = 1 - Math.abs(i - 4.5) / 5;
        const h = Math.max(2, Math.round(3 + mid * 9 + 2 * Math.sin(i * 1.7 + f * 1.9)));
        const layer = (k: number, c: string) => p.put(8 + i, 18 - Math.round(h * k), 1, Math.round(h * k), c);
        layer(1, '#ff8a5c');
        layer(0.65, '#ffb347');
        layer(0.3, '#fff1a8');
      }
      p.put(6, 16, 14, 2, '#9c6b4e');
      p.put(8, 18, 10, 2, '#b17b58');
      const stones: [number, number, string][] = [
        [3, 19, '#bdb6ca'], [7, 21, '#a59fb3'], [12, 22, '#bdb6ca'], [17, 21, '#a59fb3'], [21, 19, '#bdb6ca'],
      ];
      for (const [x, y, c] of stones) p.put(x, y, 4, 3, c);
      p.put([10, 15, 12, 14][f], [3, 5, 2, 4][f], 1, 1, '#ffe08a');
    },
  },
  grill: {
    w: 24,
    h: 29,
    frames: 3,
    draw(p, f) {
      for (let k = 0; k < 2; k++) {
        const t = (f + k * 1.5) % 3;
        p.put(8 + k * 6 + Math.round(t), 11 - Math.round(t * 3), 2, 2, '#f1ecf8');
      }
      p.put(5, 14, 4, 2, '#e07a5f');
      p.put(10, 14, 4, 2, '#d4a373');
      p.put(15, 14, 4, 2, '#e07a5f');
      p.put(3, 16, 18, 1, '#d6d0e0');
      p.put(3, 17, 18, 4, '#5f5870');
      p.put(4, 17, 16, 1, '#7c7590');
      p.put(4, 21, 16, 1, '#4e4860');
      for (const x of [5, 18]) p.put(x, 22, 1, 6, '#4e4860');
      p.put(11, 22, 2, 6, '#4e4860');
    },
  },
  lantern: {
    w: 10,
    h: 22,
    frames: 2,
    glow: 0xffe7a0,
    draw(p, f) {
      p.put(4, 8, 2, 13, '#8d6e63');
      p.put(2, 2, 6, 1, '#5f5870');
      p.put(3, 3, 4, 4, f ? '#ffe08a' : '#fff1a8');
      p.put(3, 7, 4, 1, '#5f5870');
    },
  },
  pew: {
    w: 34,
    h: 16,
    draw(p) {
      p.put(2, 2, 30, 5, WOOD);
      p.put(2, 2, 30, 1, shade(WOOD, 0.25));
      for (const x of [3, 29]) p.put(x, 7, 2, 1, shade(WOOD, -0.15));
      p.put(1, 8, 32, 2, shade(WOOD, 0.18));
      p.put(1, 10, 32, 2, shade(WOOD, -0.12));
      for (const x of [3, 29]) p.put(x, 12, 2, 3, shade(WOOD, -0.2));
    },
  },
  altar: {
    w: 30,
    h: 26,
    frames: 2,
    glow: 0xffe2a8,
    draw(p, f) {
      p.put(14, 2, 2, 8, '#e0b84f');
      p.put(11, 4, 8, 2, '#e0b84f');
      for (const x of [4, 24]) {
        p.put(x, 6, 2, 4, WAX);
        flame(p, x, 4, (f + x) % 2 === 0);
      }
      p.put(2, 10, 26, 2, '#fffaf0');
      p.put(3, 12, 24, 8, '#f6efe4');
      p.put(12, 10, 6, 11, '#c9b6ff');
      p.put(12, 20, 6, 1, '#e0b84f');
      p.put(4, 20, 22, 3, '#b07d5a');
    },
  },
  candles: {
    w: 26,
    h: 24,
    frames: 2,
    glow: 0xffc870,
    draw(p, f) {
      p.put(4, 12, 18, 2, WOOD);
      p.put(2, 17, 22, 2, WOOD);
      for (const x of [3, 21]) p.put(x, 19, 2, 4, shade(WOOD, -0.2));
      [6, 10, 14, 18].forEach((x, i) => {
        p.put(x, 9, 2, 3, WAX);
        flame(p, x, 7, (i + f) % 2 === 0);
      });
      [4, 8, 12, 16, 20].forEach((x, i) => {
        p.put(x, 14, 2, 3, WAX);
        flame(p, x, 11, (i + f) % 2 === 1);
      });
    },
  },
  board: {
    w: 26,
    h: 29,
    draw(p) {
      for (const x of [4, 20]) p.put(x, 18, 2, 10, shade(WOOD, -0.2));
      p.put(1, 2, 24, 18, '#b07d5a');
      p.put(2, 3, 22, 16, '#e8c49a');
      const notes: [number, number, string][] = [
        [4, 5, '#ffb3c6'], [11, 4, '#fff1a8'], [17, 6, '#a9cdfc'], [5, 12, '#b5e8c9'], [13, 11, '#cbb8ff'],
      ];
      for (const [x, y, c] of notes) {
        p.put(x, y, 5, 5, c);
        p.put(x + 2, y, 1, 1, '#ff6b81');
      }
    },
  },
  plant: {
    w: 16,
    h: 24,
    draw(p) {
      p.put(5, 6, 6, 10, '#8fd3a7');
      p.put(2, 8, 5, 6, '#7cc39a');
      p.put(9, 7, 5, 7, '#7cc39a');
      p.put(6, 6, 2, 3, '#b4e8ca');
      p.put(3, 15, 10, 2, '#f0b98f');
      p.put(4, 17, 8, 5, '#e8a87c');
    },
  },
  building: {
    w: 32,
    h: 38,
    draw(p, _f, color) {
      const roof = shade(color, -0.2);
      for (let r = 0; r < 10; r++) {
        const half = 6 + r;
        p.put(16 - half, 2 + r, half, 1, roof);
        p.put(16, 2 + r, half, 1, shade(roof, -0.12));
      }
      p.put(3, 12, 13, 22, '#fffaf2');
      p.put(16, 12, 13, 22, '#f1e6da');
      for (let i = 0; i < 6; i++) {
        const c = i % 2 ? '#fffdf8' : color;
        p.put(7 + i * 3, 18, 3, 3, c);
        p.put(8 + i * 3, 21, 1, 1, c);
      }
      p.put(5, 23, 5, 5, '#bfe3ff');
      p.put(22, 23, 5, 5, '#a9d3f5');
      p.put(7, 23, 1, 5, '#fffaf2');
      p.put(24, 23, 1, 5, '#f1e6da');
      p.put(12, 23, 8, 11, '#7a5866');
      p.put(14, 25, 4, 3, '#ffe08a');
      p.put(18, 29, 1, 1, '#ffe08a');
      p.put(10, 34, 12, 2, '#d8d0e6');
    },
  },
  fountain: {
    w: 36,
    h: 28,
    frames: 3,
    draw(p, f) {
      const stone = '#e1dbec', water = '#a9d8ff', foam = '#eef8ff';
      p.put(17, 3 + (f % 2), 2, 7, foam);
      for (const [x, y] of [[14, 4], [21, 5], [12, 7], [23, 8]]) p.put(x + ((f + x) % 2), y + f, 1, 1, foam);
      p.put(16, 10, 4, 8, stone);
      p.put(11, 9, 14, 2, stone);
      p.put(12, 8, 12, 1, water);
      for (const x of [11, 24]) p.put(x, 11, 1, 7, water);
      p.put(f % 2 ? 24 : 11, 13, 1, 1, foam);
      p.put(4, 18, 28, 2, water);
      p.put(6 + f * 7, 18, 3, 1, foam);
      p.put(2, 20, 32, 2, stone);
      p.put(3, 22, 30, 4, shade(stone, -0.12));
    },
  },
};

export function renderArt(kind: ArtKind, frame = 0, color = '#c9b6ff'): Pix {
  const art = ART[kind];
  const p = new Pix(art.w, art.h);
  art.draw(p, frame, color);
  return p.outline();
}
