/** Art pixel → screen pixel. All art is painted at 1x and displayed at S×. */
export const S = 3;
export const ART_W = 320;
export const ART_H = 200;
/** What the camera tries to keep on screen: the map and what stands on it (world px). */
export const VIEW = { x: 60, y: 0, w: 840, h: 600 };
const TW = 32; // tile width (art px)
const TH = 16;
const ORIGIN_X = 160; // top corner of the map (art px)
const ORIGIN_Y = 56;

/** Continuous map coordinates: (0,0) top corner, (size,size) bottom corner. */
export interface Tile {
  tx: number;
  ty: number;
}

export function tileToArt(tx: number, ty: number) {
  return { x: ORIGIN_X + ((tx - ty) * TW) / 2, y: ORIGIN_Y + ((tx + ty) * TH) / 2 };
}

export function artToTile(x: number, y: number): Tile {
  const a = (x - ORIGIN_X) / (TW / 2);
  const b = (y - ORIGIN_Y) / (TH / 2);
  return { tx: (a + b) / 2, ty: (b - a) / 2 };
}

export function tileToWorld(t: Tile) {
  const a = tileToArt(t.tx, t.ty);
  return { x: a.x * S, y: a.y * S };
}

// ponytail: walkable = inside the diamond; no per-object collision yet.
export function isWalkable(x: number, y: number, size: number) {
  const { tx, ty } = artToTile(x / S, y / S);
  const m = 0.25;
  return tx > m && ty > m && tx < size - m && ty < size - m;
}
