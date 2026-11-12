/**
 * Rally mini-game rules. Pure (no React, no imports) so scripts/check-rally.ts
 * can verify them with plain node.
 *
 * pos runs 0 (friend's end) → 1 (my end). The friend always returns the ball;
 * I have to swing while it's inside my zone.
 */
export interface Rally {
  pos: number;
  dir: 1 | -1;
  speed: number; // track lengths per second
  hits: number;
  over: boolean;
}

/** The ball must be at least this far along when I swing. */
export const ZONE = 0.78;
const SPEED_UP = 1.08;

export const startRally = (): Rally => ({ pos: 0, dir: 1, speed: 0.6, hits: 0, over: false });

/** Advance by dt seconds. Reaching my end unhit ends the game. */
export function stepRally(r: Rally, dt: number): Rally {
  if (r.over) return r;
  const pos = r.pos + r.dir * r.speed * dt;
  if (r.dir === 1 && pos >= 1) return { ...r, pos: 1, over: true };
  if (r.dir === -1 && pos <= 0) return { ...r, pos: 0, dir: 1 };
  return { ...r, pos };
}

/** My swing: in the zone returns it faster; too early is a whiff; while it flies away it does nothing. */
export function swingRally(r: Rally): Rally {
  if (r.over || r.dir === -1) return r;
  if (r.pos >= ZONE) return { ...r, dir: -1, hits: r.hits + 1, speed: r.speed * SPEED_UP };
  return { ...r, over: true };
}
