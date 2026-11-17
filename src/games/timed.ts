/**
 * The "most points in N seconds" minigames, one per space. Pure (no React / three),
 * so scripts/check-games.ts runs them in node. Everyone at a table gets the same
 * challenge, dealt from the match seed; a computer player's score comes from it too.
 */
import type { CharacterLook } from '../data/character';
import { seeded } from './swim.ts'; // (with its extension: scripts/check-games.ts runs this in node)

export type TimedId = 'fishing' | 'barista' | 'squat' | 'memory' | 'styling' | 'breath';

/**
 * How long a round lasts, and the most points anyone could make in it. The server
 * (supabase/migrations/0005) refuses results past `cap` or reported before `secs` are up:
 * keep the two in step.
 */
export const ROUND: Record<TimedId, { secs: number; cap: number }> = {
  fishing: { secs: 40, cap: 75 },
  barista: { secs: 45, cap: 45 },
  squat: { secs: 40, cap: 140 },
  memory: { secs: 60, cap: 120 },
  styling: { secs: 45, cap: 45 },
  breath: { secs: 64, cap: 0 },
};

const pickNot = (n: number, last: number, rnd: () => number) => {
  const i = Math.floor(rnd() * (n - 1));
  return i >= last && last >= 0 ? i + 1 : i;
};
const shuffle = <T>(xs: readonly T[], rnd: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ── 🎣 fishing (camping) ────────────────────────────────────────────────────
/** What bites: the bigger, the shorter the moment to hook it (seconds). */
export const FISH = [
  { name: '피라미', icon: '🐟', pts: 1, window: 0.8 },
  { name: '붕어', icon: '🐠', pts: 2, window: 0.6 },
  { name: '황금 잉어', icon: '🐡', pts: 3, window: 0.45 },
] as const;

export interface Bite {
  at: number;
  fish: 0 | 1 | 2;
}

/** When the fish bite, and which: the same pond for everyone at the table. */
export function bites(seed: number, secs = ROUND.fishing.secs): Bite[] {
  const rnd = seeded(seed);
  const out: Bite[] = [];
  for (let t = 1.5 + rnd() * 1.5; t < secs - 1; t += 1.6 + rnd() * 2.4) {
    const r = rnd();
    out.push({ at: +t.toFixed(2), fish: r < 0.55 ? 0 : r < 0.85 ? 1 : 2 });
  }
  return out;
}

/** My line: the next bite to come (earlier ones were caught or got away), and my points. */
export interface Line {
  next: number;
  pts: number;
}

/** Bites I let go by are gone. */
export function wait(bs: Bite[], l: Line, t: number): Line {
  let next = l.next;
  while (next < bs.length && t > bs[next].at + FISH[bs[next].fish].window) next++;
  return next === l.next ? l : { ...l, next };
}

/** Jerk the rod at t: a fish on the hook is caught; with nothing biting, the next one's scared off. */
export function jerk(bs: Bite[], l: Line, t: number): { line: Line; caught: Bite | null } {
  const w = wait(bs, l, t);
  const b = bs[w.next];
  if (!b) return { line: w, caught: null };
  if (t >= b.at) return { line: { next: w.next + 1, pts: w.pts + FISH[b.fish].pts }, caught: b };
  return { line: { ...w, next: w.next + 1 }, caught: null };
}

// ── ☕ barista (cafe) ────────────────────────────────────────────────────────
export const INGREDIENTS = [
  { id: 'shot', name: '에스프레소', icon: '☕', color: '#7a4a2a' },
  { id: 'water', name: '물', icon: '💧', color: '#bfe6ff' },
  { id: 'milk', name: '우유', icon: '🥛', color: '#fff6e8' },
  { id: 'choco', name: '초코', icon: '🍫', color: '#8b5a3c' },
  { id: 'vanilla', name: '바닐라', icon: '🌼', color: '#ffe9a8' },
  { id: 'matcha', name: '녹차', icon: '🍵', color: '#9fd98c' },
  { id: 'ice', name: '얼음', icon: '🧊', color: '#e6f7ff' },
] as const;
export type Ingredient = (typeof INGREDIENTS)[number]['id'];

export const DRINKS: { name: string; recipe: Ingredient[] }[] = [
  { name: '아메리카노', recipe: ['shot', 'water'] },
  { name: '아이스 아메리카노', recipe: ['shot', 'water', 'ice'] },
  { name: '카페라떼', recipe: ['shot', 'milk'] },
  { name: '바닐라라떼', recipe: ['shot', 'vanilla', 'milk'] },
  { name: '카페모카', recipe: ['shot', 'choco', 'milk'] },
  { name: '핫초코', recipe: ['choco', 'milk'] },
  { name: '녹차라떼', recipe: ['matcha', 'milk'] },
  { name: '아이스 녹차라떼', recipe: ['matcha', 'milk', 'ice'] },
];

/** Seconds before the next customer steps up. */
export const NEXT_ORDER = 1;

/** The queue of orders (indexes into DRINKS), never the same drink twice running. */
export function orders(seed: number, n = 60) {
  const rnd = seeded(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(pickNot(DRINKS.length, out[i - 1] ?? -1, rnd));
  return out;
}

/** Is this cup (each ingredient at most once, any order) that drink? */
export const isDrink = (cup: Ingredient[], d: (typeof DRINKS)[number]) => cup.length === d.recipe.length && d.recipe.every((x) => cup.includes(x));

// ── 🦵 squats (gym) ──────────────────────────────────────────────────────────
/** After a good squat you're standing again this long later; a wobble (off the mark) costs more. */
export const REP_LOCK = 0.6;
export const WOBBLE = 0.9;

/** Squat n: how fast the gauge swings (quicker each time), and where its sweet spot is. */
export function rep(seed: number, n: number) {
  const rnd = seeded(seed + (n + 1) * 101);
  return { period: Math.max(0.9, 1.7 - n * 0.05), c: 0.5 + rnd() * 0.35, w: 0.12 };
}

/** The gauge s seconds into a squat: 0 (standing) … 1 (deepest) and back up. */
export const gauge = (period: number, s: number) => (1 - Math.cos((2 * Math.PI * s) / period)) / 2;

/** Pressing at height p: 2 spot on, 1 near enough, 0 a wobble. */
export function grade(r: ReturnType<typeof rep>, p: number) {
  const d = Math.abs(p - r.c);
  return d < 0.04 ? 2 : d < r.w ? 1 : 0;
}

// ── 🃏 memory cards (library) ────────────────────────────────────────────────
export const CARDS = ['📕', '📗', '📘', '📙', '🔖', '✏️', '🔍', '📜', '🖋️', '📎', '🎓', '🗂️'];
/** A wrong pair stays face up this long; a cleared table waits this long for the next deal. */
export const PEEK = 0.7;
export const REDEAL = 1;

/** Table k: 8 pairs face down, the same for everyone. */
export function deal(seed: number, k: number) {
  const rnd = seeded(seed + (k + 1) * 7717);
  const icons = shuffle(CARDS, rnd).slice(0, 8);
  return shuffle([...icons, ...icons], rnd);
}

// ── 👗 styling (mall) ────────────────────────────────────────────────────────
export interface Request {
  name: string;
  hat: CharacterLook['hat'];
  top: CharacterLook['top'];
  accessory: CharacterLook['accessory'];
}

/** What customers ask for: a hat, a top and something extra, to fit the day. */
export const REQUESTS: Request[] = [
  { name: '🏖️ 바캉스 가요', hat: 'sunhat', top: 'dress', accessory: 'flower' },
  { name: '❄️ 눈 오는 날', hat: 'beanie', top: 'hoodie', accessory: 'scarf' },
  { name: '⚾ 스트릿 감성', hat: 'cap', top: 'hoodie', accessory: 'star' },
  { name: '📚 도서관 데이트', hat: 'none', top: 'stripe', accessory: 'glasses' },
  { name: '🎀 러블리 데이', hat: 'ribbon', top: 'dress', accessory: 'star' },
  { name: '💼 첫 출근', hat: 'none', top: 'jacket', accessory: 'glasses' },
  { name: '🏃 가볍게 운동', hat: 'cap', top: 'tee', accessory: 'none' },
  { name: '🌸 봄 피크닉', hat: 'sunhat', top: 'stripe', accessory: 'flower' },
  { name: '🎄 겨울 데이트', hat: 'ribbon', top: 'jacket', accessory: 'scarf' },
  { name: '🎨 주말 캐주얼', hat: 'beanie', top: 'tee', accessory: 'star' },
];

/** Seconds before the next customer comes in. */
export const NEXT_LOOK = 1;

export function requests(seed: number, n = 50) {
  const rnd = seeded(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(pickNot(REQUESTS.length, out[i - 1] ?? -1, rnd));
  return out;
}

export const fits = (pick: Omit<Request, 'name'>, r: Request) => pick.hat === r.hat && pick.top === r.top && pick.accessory === r.accessory;

// ── 🕊️ breathing together (church): no score ────────────────────────────────
/** Seconds breathing in, then out. */
export const BREATH = 4;

/** The guide at t: breathing in or out, and how full (0 … 1, eased). */
export function guide(t: number) {
  const k = (((t % (2 * BREATH)) + 2 * BREATH) % (2 * BREATH)) / BREATH;
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  return k < 1 ? { inhale: true, size: ease(k) } : { inhale: false, size: 1 - ease(k - 1) };
}

// ── computer players ─────────────────────────────────────────────────────────
/** How many times something that takes `each()` seconds fits in the round. */
const fit = (secs: number, each: () => number) => {
  let n = 0;
  for (let t = each(); t < secs; t += each()) n++;
  return n;
};

/** A computer player's score (the i-th, from 0: each a bit better), the same for everyone at the table. */
export function cpuScore(game: TimedId, seed: number, i: number) {
  const rnd = seeded(seed * 31 + i + 1);
  const skill = 0.5 + 0.12 * i;
  const { secs } = ROUND[game];
  switch (game) {
    case 'fishing':
      return bites(seed).reduce((n, b) => n + (rnd() < skill + 0.15 - b.fish * 0.1 ? FISH[b.fish].pts : 0), 0);
    case 'barista':
      return fit(secs, () => NEXT_ORDER + 2.2 + rnd() * 2 - skill);
    case 'squat': {
      let n = 0;
      for (let t = 0; ; ) {
        const r = rnd();
        const pts = r < skill * 0.5 ? 2 : r < 0.8 ? 1 : 0;
        t += 0.5 + rnd() * 0.5 + (pts ? REP_LOCK : WOBBLE);
        if (t > secs) return n;
        n += pts;
      }
    }
    case 'memory':
      return fit(secs, () => 3 + rnd() * 2.5 - skill);
    case 'styling':
      return fit(secs, () => NEXT_LOOK + 3.2 + rnd() * 2.5 - skill);
    case 'breath':
      return 0;
  }
}
