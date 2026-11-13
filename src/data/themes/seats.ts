import type { Tile } from '../../world/space';

/**
 * A seat *behind* a piece of furniture (smaller screen y), so the furniture
 * hides the legs and you see the sitter over it. `side` slides along the
 * screen's x-axis; `depth` is how far back.
 */
export const behind = (at: Tile, side = 0, depth = 0.35): Tile => ({
  tx: at.tx - depth + side,
  ty: at.ty - depth - side,
});
