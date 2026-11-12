/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  const rgb = (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
  return '#' + rgb.toString(16).padStart(6, '0');
}

/**
 * A tiny pixel canvas: draw with put(), auto-outline, then paint onto any 2D
 * context (React <canvas> or a Phaser CanvasTexture) at any integer scale.
 */
export class Pix {
  cells: (string | null)[];

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cells = new Array<string | null>(w * h).fill(null);
  }

  put(x: number, y: number, w: number, h: number, c: string) {
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.cells[j * this.w + i] = c;
  }

  /** Outline the silhouette with a darker shade of whatever it touches. */
  outline(amt = -0.42) {
    const { w, h, cells } = this;
    const at = (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h ? cells[y * w + x] : null);
    this.cells = cells.map((c, i) => {
      if (c) return c;
      const x = i % w, y = (i / w) | 0;
      const n = at(x - 1, y) ?? at(x + 1, y) ?? at(x, y - 1) ?? at(x, y + 1);
      return n ? shade(n, amt) : null;
    });
    return this;
  }

  paint(ctx: CanvasRenderingContext2D, scale = 1, flip = false) {
    const { w, h, cells } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; ) {
        const c = cells[y * w + x];
        let run = 1;
        while (x + run < w && cells[y * w + x + run] === c) run++;
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect((flip ? w - x - run : x) * scale, y * scale, run * scale, scale);
        }
        x += run;
      }
    }
  }
}
