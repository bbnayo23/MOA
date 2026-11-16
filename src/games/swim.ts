/**
 * Swim race rules. Pure (no React / three) so scripts/check-games.ts can run them in node.
 *
 * One length of LENGTH metres. Strokes alternate arms (← → or the two buttons): each
 * stroke on the other arm, in rhythm, pushes you on; the same arm twice splashes
 * and slows you. Water drags you back down between strokes.
 */
export const LENGTH = 25;
/** Nobody swims faster than this (m/s) — so nobody finishes in under LENGTH / V_MAX (the server checks). */
export const V_MAX = 3.2;
/** The stroke rhythm that pushes hardest (seconds between strokes). */
export const BEAT = 0.3;
/** Give up on swimmers who haven't finished after this long (seconds). */
export const CUTOFF = 60;

export type Arm = 'L' | 'R';

export interface Swimmer {
  /** Metres from the start. */
  d: number;
  /** Speed (m/s). */
  v: number;
  last: Arm | null;
  /** Race time of the last stroke. */
  at: number;
  /** Seconds since the start when they touched the wall (null: still swimming). */
  time: number | null;
}

export const newSwimmer = (): Swimmer => ({ d: 0, v: 0, last: null, at: -1, time: null });

/** How good a stroke is (0 … 1): on the other arm, near the beat (flailing faster than it is worse than lagging). */
export function strokeQuality(s: Swimmer, arm: Arm, t: number) {
  if (s.last === arm) return 0;
  if (s.last === null) return 0.6;
  const gap = t - s.at;
  return Math.max(0.3, gap < BEAT ? 1 - (BEAT - gap) / 0.15 : 1 - (gap - BEAT) / 0.6);
}

export function stroke(s: Swimmer, arm: Arm, t: number): Swimmer {
  if (s.time !== null) return s;
  const q = strokeQuality(s, arm, t);
  const v = q === 0 ? s.v * 0.5 : Math.min(V_MAX, s.v + 0.45 * q);
  return { ...s, v, last: arm, at: t };
}

/** Move on by dt seconds (race time `t` at the end of it); touching the wall stops the clock. */
export function swimFor(s: Swimmer, dt: number, t: number): Swimmer {
  if (s.time !== null) return s;
  const d = s.d + s.v * dt;
  const v = s.v * Math.exp(-0.5 * dt);
  if (d >= LENGTH) return { ...s, d: LENGTH, v: 0, time: +(t - (d - LENGTH) / Math.max(s.v, 0.01)).toFixed(2) };
  return { ...s, d, v };
}

/** Finishing order: fastest first, then those who didn't finish (null). */
export const ranking = (times: Record<string, number | null>) =>
  Object.entries(times).sort(([, a], [, b]) => (a ?? Infinity) - (b ?? Infinity));

/**
 * A computer swimmer's stroke times: a steady rhythm, a little off the beat
 * (`skill` 0 … 1: 1 is right on it). `rnd` gives 0 … 1.
 */
export function cpuStrokes(skill: number, rnd: () => number, until = CUTOFF) {
  const times: number[] = [];
  let t = 0.25 + rnd() * 0.3;
  while (t < until) {
    times.push(t);
    t += BEAT + (rnd() - 0.4) * 0.25 * (1.2 - skill);
  }
  return times;
}

/** A small seeded random generator (everyone in a race makes the same computer swimmers). */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
