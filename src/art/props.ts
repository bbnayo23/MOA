import { Pix, shade } from './pix';

export type ArtKind = 'pine' | 'bush' | 'rock' | 'log' | 'tent' | 'campfire' | 'grill' | 'lantern';

interface Art {
  w: number;
  h: number;
  /** Animated art redraws through these frames. */
  frames?: number;
  /** Additive light colour drawn around the object. */
  glow?: number;
  draw: (p: Pix, frame: number) => void;
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
};

export function renderArt(kind: ArtKind, frame = 0): Pix {
  const art = ART[kind];
  const p = new Pix(art.w, art.h);
  art.draw(p, frame);
  return p.outline();
}
