import type { Tile } from '../../world/space';

/**
 * A seat *behind* a piece of furniture (its far side from the camera), so you
 * see the sitter over it. `side` slides along the screen's x-axis; `depth` is
 * how far back. The world puts a chair there.
 */
export const behind = (at: Tile, side = 0, depth = 0.35): Tile => ({
  tx: at.tx - depth + side,
  ty: at.ty - depth - side,
});
