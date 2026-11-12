import { Pix, shade } from './pix';

export type ArtKind =
  | 'pine' | 'bush' | 'rock' | 'log' | 'tent' | 'campfire' | 'grill' | 'lantern'
  | 'pew' | 'altar' | 'candles' | 'board' | 'plant'
  | 'building' | 'fountain'
  | 'bookshelf' | 'table' | 'desk'
  | 'diningTable' | 'counter' | 'menuboard'
  | 'treadmill' | 'rack' | 'mat'
  | 'ladder' | 'lounger' | 'parasol' | 'ring'
  | 'net' | 'balls'
  | 'clothesRack' | 'fittingRoom' | 'mirror';

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
  /** Rows above the bottom edge where the object meets the ground (for slanted art like a net). */
  anchorY?: number;
  /** Radius (tiles) of floor it blocks. Leave out for things you stand or sit on (benches, mats, …). */
  foot?: number;
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
    foot: 0.3,
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
    foot: 0.3,
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
    foot: 0.25,
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
    foot: 0.65,
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
    foot: 0.5,
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
    foot: 0.4,
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
    foot: 0.15,
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
    foot: 0.8,
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
    foot: 0.4,
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
    foot: 0.4,
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
    foot: 0.25,
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
    foot: 0.6,
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
    foot: 0.7,
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
  bookshelf: {
    w: 30,
    h: 42,
    foot: 0.4,
    draw(p) {
      const frame = '#8d6346';
      p.put(1, 1, 28, 40, frame);
      p.put(0, 1, 30, 2, shade(frame, 0.15));
      const spines = ['#e07a5f', '#81b29a', '#f2cc8f', '#9cc9ff', '#cbb8ff', '#ff9fb2', '#5c6185'];
      let k = 0;
      for (const top of [4, 13, 22, 31]) {
        p.put(3, top, 24, 8, '#6b4a35');
        p.put(2, top + 8, 26, 1, '#a8785a');
        for (let x = 3; x < 27; k++) {
          const w = Math.min(2 + (k % 2), 27 - x);
          const h = 6 + (k % 3 === 0 ? 1 : 0) - (k % 5 === 0 ? 1 : 0);
          const c = spines[k % spines.length];
          p.put(x, top + 8 - h, w, h, c);
          p.put(x, top + 9 - h, w, 1, shade(c, 0.3));
          x += w + (k % 4 === 3 ? 1 : 0);
        }
      }
    },
  },
  table: {
    w: 36,
    h: 16,
    foot: 0.45,
    draw(p) {
      const top = '#d9a676';
      p.put(1, 2, 34, 3, top);
      p.put(1, 2, 34, 1, shade(top, 0.2));
      p.put(2, 5, 32, 2, shade(top, -0.18));
      for (const x of [3, 31]) p.put(x, 7, 2, 8, shade(top, -0.28));
    },
  },
  desk: {
    w: 32,
    h: 26,
    foot: 0.35,
    glow: 0xfff1b0,
    draw(p) {
      const wood = '#c58f63';
      p.put(6, 8, 1, 5, '#b08a3e');
      p.put(4, 13, 5, 1, '#b08a3e');
      p.put(3, 5, 7, 3, '#6fbf8e');
      p.put(4, 4, 5, 1, '#8fd3a7');
      p.put(4, 8, 5, 1, '#fff1a8');
      p.put(21, 12, 8, 2, '#e07a5f');
      p.put(22, 10, 7, 2, '#9cc9ff');
      p.put(21, 8, 6, 2, '#f2cc8f');
      p.put(1, 14, 30, 3, wood);
      p.put(1, 14, 30, 1, shade(wood, 0.2));
      p.put(2, 17, 28, 2, shade(wood, -0.15));
      p.put(23, 17, 2, 1, '#e0b84f');
      for (const x of [3, 27]) p.put(x, 19, 2, 6, shade(wood, -0.28));
    },
  },
  diningTable: {
    w: 34,
    h: 22,
    foot: 0.45,
    draw(p) {
      p.put(16, 1, 2, 4, '#7cc39a');
      p.put(15, 1, 4, 2, '#ffb3c6');
      p.put(15, 4, 4, 2, '#a9d3f5');
      p.put(1, 6, 32, 4, '#fffaf2');
      p.put(1, 6, 32, 1, '#ffffff');
      for (let x = 2; x < 32; x += 2) {
        const odd = (x / 2) % 2 === 1;
        p.put(x, 10, 2, 2, odd ? '#ff9a8a' : '#fffaf2');
        p.put(x, 12, 2, 2, odd ? '#fffaf2' : '#ff9a8a');
      }
      for (const x of [4, 28]) p.put(x, 14, 2, 7, shade(WOOD, -0.25));
    },
  },
  counter: {
    w: 40,
    h: 30,
    foot: 0.5,
    draw(p) {
      p.put(5, 6, 9, 6, '#7c7590');
      p.put(6, 7, 6, 2, '#a9d8ff');
      p.put(26, 6, 10, 6, '#e6f5ff');
      p.put(28, 9, 6, 3, '#ffd6e0');
      p.put(30, 8, 1, 1, '#ff6b81');
      p.put(1, 12, 38, 3, '#f6f0fa');
      p.put(1, 12, 38, 1, '#ffffff');
      p.put(2, 15, 36, 12, '#f2a7a0');
      for (let x = 4; x < 36; x += 4) p.put(x, 15, 1, 12, '#f7c1bb');
      p.put(2, 27, 36, 1, shade('#f2a7a0', -0.2));
    },
  },
  menuboard: {
    w: 22,
    h: 31,
    foot: 0.25,
    draw(p) {
      for (const x of [4, 16]) p.put(x, 20, 2, 10, shade(WOOD, -0.2));
      p.put(1, 1, 20, 20, '#9c7a5a');
      p.put(2, 2, 18, 18, '#4a5a4f');
      p.put(5, 5, 12, 1, '#fffaf0');
      p.put(5, 9, 8, 1, '#ffd6e0');
      p.put(5, 12, 10, 1, '#fff1b8');
      p.put(5, 15, 7, 1, '#d4e7ff');
    },
  },
  treadmill: {
    w: 30,
    h: 29,
    frames: 3,
    draw(p, f) {
      const metal = '#7c7590';
      p.put(3, 3, 24, 5, '#5f5870');
      p.put(8, 4, 10, 2, '#9fe3c4');
      p.put(20, 5, 1, 1, '#ff9fb2');
      p.put(22, 5, 1, 1, '#ffe08a');
      p.put(3, 9, 24, 2, metal);
      for (const x of [4, 24]) p.put(x, 8, 2, 14, metal);
      p.put(1, 22, 28, 6, '#4e4860');
      p.put(3, 23, 24, 4, '#3b3150');
      // belt stripes slide toward the viewer
      for (let x = 4 + f * 2; x < 26; x += 6) p.put(x, 24, 2, 2, '#5c5568');
    },
  },
  rack: {
    w: 34,
    h: 22,
    foot: 0.4,
    draw(p) {
      const metal = '#7c7590';
      const colors = ['#ff9fb2', '#9cc9ff', '#ffd38a', '#b5e8c9'];
      for (const [row, y] of [[0, 4], [1, 11]]) {
        colors.forEach((c, i) => {
          const x = 4 + i * 7;
          p.put(x, y, 2, 4, (row + i) % 2 ? c : shade(c, -0.1));
          p.put(x + 4, y, 2, 4, (row + i) % 2 ? c : shade(c, -0.1));
          p.put(x + 2, y + 1, 2, 2, '#c4c9cf');
        });
        p.put(2, y + 4, 30, 2, metal);
      }
      for (const x of [3, 29]) p.put(x, 10, 2, 11, shade(metal, -0.15));
    },
  },
  mat: {
    w: 34,
    h: 8,
    draw(p) {
      p.put(2, 3, 28, 3, '#ffb3c6');
      p.put(2, 3, 28, 1, '#ffd6e0');
      p.put(29, 2, 3, 4, '#f29bb3');
    },
  },
  ladder: {
    w: 16,
    h: 22,
    draw(p) {
      const steel = '#d6dbe3';
      for (const x of [3, 11]) {
        p.put(x, 4, 2, 17, steel);
        p.put(x - 1, 2, 3, 2, steel);
      }
      for (const y of [9, 14]) p.put(5, y, 6, 1, shade(steel, -0.1));
    },
  },
  lounger: {
    w: 34,
    h: 14,
    draw(p) {
      const cloth = '#ffd38a';
      p.put(2, 2, 8, 7, cloth);
      p.put(9, 7, 23, 3, cloth);
      for (let x = 4; x < 32; x += 5) p.put(x, x < 10 ? 2 : 7, 2, x < 10 ? 7 : 3, '#fffaf0');
      for (const x of [3, 9, 30]) p.put(x, 10, 1, 3, '#c4c9cf');
    },
  },
  parasol: {
    w: 36,
    h: 38,
    foot: 0.15,
    draw(p) {
      p.put(17, 9, 2, 27, '#c4c9cf');
      for (let r = 0; r < 9; r++) {
        const half = 3 + Math.round(r * 1.75);
        for (let x = 18 - half; x < 18 + half; x++)
          p.put(x, 1 + r, 1, 1, Math.floor((x - 18 + 40) / 5) % 2 ? '#ff9fb2' : '#fffaf0');
      }
    },
  },
  ring: {
    w: 20,
    h: 10,
    draw(p) {
      p.put(2, 2, 16, 6, '#ff9fb2');
      p.put(6, 4, 8, 2, '#e07f9a');
      p.put(3, 2, 14, 1, '#ffc4d3');
      for (const x of [4, 14]) p.put(x, 2, 2, 6, '#fffdf8');
    },
  },
  // Runs across the court along the iso diagonal (bottom-left → top-right, 2:1 slope).
  net: {
    w: 56,
    h: 37,
    anchorY: 15, // the court centre is at the middle of the slanted base line
    draw(p) {
      const base = (x: number) => 34 - Math.floor((x - 3) / 2);
      for (let x = 5; x < 51; x++) {
        const b = base(x);
        for (let y = b - 7; y <= b - 2; y++) p.put(x, y, 1, 1, (x + y) % 3 === 0 ? '#9aa0a6' : '#e9edf2');
        p.put(x, b - 8, 1, 1, '#ffffff');
      }
      for (const x of [3, 51]) p.put(x, base(x) - 9, 2, 10, '#5f5870');
    },
  },
  balls: {
    w: 16,
    h: 13,
    draw(p) {
      for (const [x, y] of [[4, 3], [7, 2], [10, 3], [5, 5], [9, 5]]) p.put(x, y, 2, 2, '#e6f27a');
      p.put(2, 6, 12, 5, '#c58f63');
      for (let x = 3; x < 14; x += 3) p.put(x, 6, 1, 5, shade('#c58f63', -0.2));
    },
  },
  clothesRack: {
    w: 34,
    h: 30,
    foot: 0.45,
    draw(p) {
      const steel = '#c4c9cf';
      const clothes = ['#ffb3c6', '#a9cdfc', '#ffd38a', '#cbb8ff', '#b5e8c9'];
      clothes.forEach((c, i) => {
        const x = 6 + i * 5;
        p.put(x + 2, 4, 1, 2, steel);
        p.put(x, 6, 5, 2, c);
        p.put(x + 1, 8, 3, 10 - (i % 2) * 3, c);
        p.put(x + 1, 8, 1, 10 - (i % 2) * 3, shade(c, 0.25));
      });
      p.put(2, 3, 30, 1, steel);
      for (const x of [2, 30]) p.put(x, 4, 2, 23, shade(steel, -0.15));
      p.put(1, 27, 32, 2, shade(steel, -0.25));
    },
  },
  fittingRoom: {
    w: 34,
    h: 44,
    foot: 0.5,
    draw(p) {
      const curtain = '#cbb8ff';
      p.put(1, 1, 32, 5, '#ff9fc0');
      p.put(12, 2, 10, 3, '#fffaf0');
      p.put(14, 3, 6, 1, '#ff9fc0');
      p.put(3, 6, 28, 1, '#c4c9cf');
      p.put(4, 7, 26, 34, curtain);
      for (let x = 6; x < 30; x += 4) p.put(x, 7, 1, 34, shade(curtain, -0.12));
      p.put(4, 7, 26, 2, shade(curtain, 0.25));
      for (const x of [1, 31]) p.put(x, 6, 2, 36, '#ff9fc0');
      p.put(2, 41, 30, 2, shade('#ff9fc0', -0.2));
    },
  },
  mirror: {
    w: 18,
    h: 40,
    foot: 0.3,
    draw(p) {
      const gold = '#e0b84f';
      p.put(3, 1, 12, 1, gold);
      p.put(2, 2, 14, 32, gold);
      p.put(3, 34, 12, 1, gold);
      p.put(4, 3, 10, 30, '#e6f5ff');
      for (let i = 0; i < 6; i++) p.put(6 + i, 10 - i, 1, 1, '#ffffff');
      for (let i = 0; i < 4; i++) p.put(9 + i, 16 - i, 1, 1, '#ffffff');
      for (const x of [4, 12]) p.put(x, 35, 2, 4, shade(gold, -0.2));
    },
  },
};

export function renderArt(kind: ArtKind, frame = 0, color = '#c9b6ff'): Pix {
  const art = ART[kind];
  const p = new Pix(art.w, art.h);
  art.draw(p, frame, color);
  return p.outline();
}
