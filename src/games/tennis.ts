/**
 * Tennis 1:1 rules. Pure (no React / three) so scripts/check-games.ts can run them in node.
 *
 * The court, seen from above: x across (−HALF_W … HALF_W), side 0's baseline at
 * z = +HALF_L, side 1's at z = −HALF_L. A shot is a *flight*: from the hitter's
 * x to a target x on the other baseline, taking `dur` seconds. Whoever the ball
 * flies to decides their own return (on their own clock, so lag never robs them):
 * stand within REACH of where it lands and swing in time.
 */
export const HALF_W = 3.2;
export const HALF_L = 6;
/** How far from the ball's line you can still reach it. */
export const REACH = 1.0;
/** Swing window around the ball's arrival: this early … this late (seconds). */
export const EARLY = 0.32;
export const LATE = 0.14;
/** Points to win the match. */
export const WIN = 5;
/** Running speed along the baseline (court units per second). */
export const RUN = 6;

export type Side = 0 | 1;

export interface Flight {
  /** Who hit it (it flies to the other side). */
  by: Side;
  from: number;
  to: number;
  dur: number;
}

export interface Score {
  points: [number, number];
  /** Who serves next. */
  server: Side;
  /** Shots in the current point (they get faster). */
  rally: number;
}

export const newScore = (): Score => ({ points: [0, 0], server: 0, rally: 0 });
export const other = (s: Side): Side => (s === 0 ? 1 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Shot time: 1.6 s for a serve, a little quicker each shot after, never under 0.75 s. */
export const flightTime = (rally: number) => Math.max(0.75, 1.6 - rally * 0.07);

export function serve(by: Side, x: number, aim: number): Flight {
  return { by, from: x, to: clamp(aim * 2.2 || -x * 0.6, -HALF_W + 0.5, HALF_W - 0.5), dur: flightTime(0) };
}

export type Verdict = { ok: true; flight: Flight } | { ok: false; why: 'far' | 'early' | 'late' };

/**
 * I swing `t` seconds after the ball left the other racket, standing at x, pushing
 * `aim` (−1 left … 1 right, my keys turned into court x). In reach and in time:
 * my shot goes where I aim (or cross-court), pulled by how early / late I was.
 */
export function judge(f: Flight, t: number, x: number, aim: number, rally: number): Verdict {
  const late = t - f.dur;
  if (late < -EARLY) return { ok: false, why: 'early' };
  if (late > LATE) return { ok: false, why: 'late' };
  if (Math.abs(x - f.to) > REACH) return { ok: false, why: 'far' };
  const to = aim ? aim * 2.6 : -x * 0.8 + late * 5;
  return { ok: true, flight: { by: other(f.by), from: f.to, to: clamp(to, -HALF_W + 0.3, HALF_W - 0.3), dur: flightTime(rally + 1) } };
}

/** The ball at t seconds into a flight: across, along (0 at the hitter → 1 at the receiver) and height (it bounces at 70 %). */
export function ballAt(f: Flight, t: number) {
  const u = Math.min(1.15, Math.max(0, t / f.dur));
  const x = f.from + (f.to - f.from) * Math.min(u, 1);
  const h = u < 0.7 ? 0.35 + 2.2 * Math.sin((u / 0.7) * Math.PI) * (1 - u * 0.4) : 0.15 + 1.1 * Math.sin(((u - 0.7) / 0.45) * Math.PI);
  const z = (f.by === 0 ? 1 : -1) * HALF_L * (1 - 2 * u);
  return { x, z, h: Math.max(0.12, h), u };
}

/** A point to `winner`: the next point starts slow, and the serve alternates. */
export function point(s: Score, winner: Side): Score {
  const points: [number, number] = [...s.points];
  points[winner] += 1;
  return { points, server: other(s.server), rally: 0 };
}

export const winnerOf = (s: Score): Side | null => (s.points[0] >= WIN ? 0 : s.points[1] >= WIN ? 1 : null);

/**
 * The computer player: gets to the ball if it can cover the distance in time, and
 * returns it with a chance that drops as the rally speeds up. `roll` ∈ [0, 1).
 */
export function cpuReturns(f: Flight, cpuX: number, rally: number, roll: number) {
  const canReach = Math.abs(f.to - cpuX) - REACH <= RUN * 0.8 * f.dur;
  return canReach && roll < Math.max(0.55, 0.93 - rally * 0.035);
}
