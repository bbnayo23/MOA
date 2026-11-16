import type { Tile } from './space';

/** Floor an object stands on, as a circle in tile space. Feet can't enter it. */
export interface Footprint {
  tx: number;
  ty: number;
  r: number;
}

const EDGE = 0.25; // keep feet this far inside the map's edge
const CELLS = 4; // path grid cells per tile

/**
 * How far from the map's middle you can walk outdoors, where the ground is round:
 * the map's corners and `wild` tiles beyond. (Indoors, `wild` = 0, it's the square map.)
 */
export const walkRadius = (size: number, wild: number) => size * Math.SQRT1_2 + wild;

/** Can a foot stand here: on the ground (the square map, or outdoors the round land) and clear of every footprint. */
export function isFree(t: Tile, size: number, blocks: Footprint[], wild = 0) {
  const inside = wild
    ? Math.hypot(t.tx - size / 2, t.ty - size / 2) < walkRadius(size, wild) - EDGE
    : t.tx > EDGE && t.ty > EDGE && t.tx < size - EDGE && t.ty < size - EDGE;
  return inside && blocks.every((b) => Math.hypot(t.tx - b.tx, t.ty - b.ty) >= b.r);
}

/** Nothing in the way on the straight line a → b (sampled every 0.1 tile). */
export function isClear(a: Tile, b: Tile, size: number, blocks: Footprint[], wild = 0) {
  const steps = Math.ceil(Math.hypot(b.tx - a.tx, b.ty - a.ty) / 0.1);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    if (!isFree({ tx: a.tx + (b.tx - a.tx) * k, ty: a.ty + (b.ty - a.ty) * k }, size, blocks, wild)) return false;
  }
  return true;
}

/**
 * Waypoints from `a` towards `b` around the footprints, ending at `b` — or, when `b`
 * is blocked or unreachable, at the closest point you can get to. Empty when you can't get any closer.
 */
export function findPath(a: Tile, b: Tile, size: number, blocks: Footprint[], wild = 0): Tile[] {
  const fits = (t: Tile) => isFree(t, size, blocks, wild);
  const clear = (p: Tile, q: Tile) => isClear(p, q, size, blocks, wild);
  if (fits(b) && clear(a, b)) return [b];

  // breadth-first search over a grid of cell centres (8 neighbours, no corner cutting), covering the ground
  const lo = wild ? size / 2 - walkRadius(size, wild) : 0;
  const n = Math.ceil((wild ? 2 * walkRadius(size, wild) : size) * CELLS);
  const center = (c: number): Tile => ({ tx: lo + ((c % n) + 0.5) / CELLS, ty: lo + (Math.floor(c / n) + 0.5) / CELLS });
  const cellOf = (t: Tile) => {
    const clamp = (v: number) => Math.min(n - 1, Math.max(0, Math.floor((v - lo) * CELLS)));
    return clamp(t.ty) * n + clamp(t.tx);
  };
  const free = new Map<number, boolean>();
  const open = (c: number) => free.get(c) ?? (free.set(c, fits(center(c))), free.get(c)!);
  const start = cellOf(a);
  const prev = new Map<number, number>([[start, -1]]);
  const queue = [start];
  const dist = (c: number) => Math.hypot(center(c).tx - b.tx, center(c).ty - b.ty);
  let best = start;
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    if (dist(c) < dist(best)) best = c;
    const x = c % n, y = Math.floor(c / n);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * n + nx;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || prev.has(next) || !open(next)) continue;
      if (dx && dy && !(open(y * n + nx) && open(ny * n + x))) continue;
      prev.set(next, c);
      queue.push(next);
    }
  }

  // end on b's own cell when it was reached (ties for "closest cell" can pick a neighbour), else the closest cell…
  const goalFree = fits(b);
  const last = goalFree && prev.has(cellOf(b)) ? cellOf(b) : best;
  const cells: Tile[] = [];
  for (let c = last; c !== start; c = prev.get(c)!) cells.unshift(center(c));
  // …then step onto b itself if it's free and in plain sight (its cell's centre may sit inside a footprint)
  const end = cells.at(-1) ?? a;
  if (goalFree && clear(end, b)) {
    if (last === cellOf(b) && cells.length) cells[cells.length - 1] = b;
    else cells.push(b);
  }
  if (!cells.length) return [];

  // pull the string: from each point, jump to the farthest waypoint in plain sight
  const path: Tile[] = [];
  let from = a;
  for (let i = 0; i < cells.length; ) {
    let j = cells.length - 1;
    while (j > i && !clear(from, cells[j])) j--;
    path.push(cells[j]);
    from = cells[j];
    i = j + 1;
  }
  return path;
}
