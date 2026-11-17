/**
 * Themes are drawn on a small grid and played on a bigger one (see `widen` in index.ts):
 * a strip along each edge stays put, the middle stretches out.
 */
export const SIZE = 16;
export const SMALL = 8;
export const EDGE = 1.2;
const K = (SIZE - 2 * EDGE) / (SMALL - 2 * EDGE);

/** A point of the played space, written on the drawing grid: for things that must land exactly (a fence, a tile apart). */
export const fine = (x: number) => (x <= EDGE ? x : x >= SIZE - EDGE ? x - SIZE + SMALL : EDGE + (x - EDGE) / K);
