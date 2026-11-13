/**
 * World coordinates. Theme data places things on a size × size grid of tiles
 * (tx, ty); the 3D world lays that grid flat on the ground: x = tx·T, z = ty·T.
 * The camera looks from the +x +z side, so tile (0, 0) is the far corner and
 * the two "back" edges (tx = 0, ty = 0) are where indoor walls stand.
 */
export interface Tile {
  tx: number;
  ty: number;
}

/** World units (≈ metres) per tile. */
export const T = 2.4;

/** Walking speed in tiles per second. */
export const SPEED = 1.45;

/** Camera yaw: it looks from the +x +z diagonal. Models face this way by default. */
export const FACE_CAMERA = Math.PI / 4;

/** Heading (radians, 0 = facing +z) for walking along a tile-space direction. */
export const headingOf = (dtx: number, dty: number) => Math.atan2(dtx, dty);

/**
 * Screen-relative input (dx → right, dy → down) as a tile-space direction:
 * right on screen runs along (1, −1), down runs along (1, 1).
 */
export const screenToTile = (dx: number, dy: number): Tile => ({ tx: (dx + dy) / Math.SQRT2, ty: (dy - dx) / Math.SQRT2 });
