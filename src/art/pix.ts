/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  const rgb = (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
  return '#' + rgb.toString(16).padStart(6, '0');
}

/**
 * A tiny pixel canvas: draw with put() / oval() / glyph(), auto-outline, then
 * paint onto any 2D context at any integer scale (or into a texture).
 */
export class Pix {
  cells: (string | null)[];
  readonly w: number;
  readonly h: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = new Array<string | null>(w * h).fill(null);
  }

  get(x: number, y: number) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h ? this.cells[y * this.w + x] : null;
  }

  put(x: number, y: number, w: number, h: number, c: string) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.cells[j * this.w + i] = c;
  }

  /** A filled ellipse (centre and radii in pixels; a pixel is in when its centre is). */
  oval(cx: number, cy: number, rx: number, ry: number, c: string, only?: (x: number, y: number) => boolean) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1 && (!only || only(x, y))) this.put(x, y, 1, 1, c);
      }
  }

  /** A little picture from rows of characters ('.' or ' ' = leave as is), each mapped to a colour. */
  glyph(x: number, y: number, rows: string[], colors: Record<string, string>, flip = false) {
    rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        const c = colors[ch];
        if (c) this.put(flip ? x + row.length - 1 - i : x + i, y + j, 1, 1, c);
      }),
    );
  }

  /** Outline the silhouette with a darker shade of whatever it touches. */
  outline(amt = -0.5) {
    const { w, cells } = this;
    this.cells = cells.map((c, i) => {
      if (c) return c;
      const x = i % w, y = (i / w) | 0;
      const n = this.get(x - 1, y) ?? this.get(x + 1, y) ?? this.get(x, y - 1) ?? this.get(x, y + 1);
      return n ? shade(n, amt) : null;
    });
    return this;
  }

  paint(ctx: CanvasRenderingContext2D, scale = 1, flip = false, ox = 0, oy = 0) {
    const { w, h, cells } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; ) {
        const c = cells[y * w + x];
        let run = 1;
        while (x + run < w && cells[y * w + x + run] === c) run++;
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(ox + (flip ? w - x - run : x) * scale, oy + y * scale, run * scale, scale);
        }
        x += run;
      }
    }
  }

  /** As a canvas of its own (one canvas pixel per cell). */
  canvas(flip = false) {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    this.paint(c.getContext('2d')!, 1, flip);
    return c;
  }
}
