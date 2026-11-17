/**
 * The "most points in N seconds" minigames, one per space. Pure (no React / three),
 * so scripts/check-games.ts runs them in node. Everyone at a table gets the same
 * challenge, dealt from the match seed; a computer player's score comes from it too.
 */
import type { CharacterLook } from '../data/character';
import { seeded } from './swim.ts'; // (with its extension: scripts/check-games.ts runs this in node)

export type TimedId =
  | 'fishing' | 'barista' | 'squat' | 'memory' | 'styling' | 'breath'
  | 'stars' | 'recall' | 'rhythm' | 'bookhunt' | 'vote' | 'glass';

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
  // second games (supabase/migrations/0006)
  stars: { secs: 45, cap: 180 },
  recall: { secs: 50, cap: 75 },
  rhythm: { secs: 40, cap: 150 },
  bookhunt: { secs: 45, cap: 115 },
  vote: { secs: 45, cap: 3 },
  glass: { secs: 60, cap: 0 },
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

// ── 🌌 constellations (camping) ─────────────────────────────────────────────
/** Star patterns to join up, in the order you tap them (0 … 1 across the sky). */
export const SKY: { name: string; stars: [number, number][] }[] = [
  { name: '북두칠성', stars: [[0.08, 0.3], [0.24, 0.26], [0.38, 0.34], [0.5, 0.46], [0.56, 0.72], [0.82, 0.76], [0.86, 0.5]] },
  { name: '카시오페이아', stars: [[0.08, 0.32], [0.3, 0.68], [0.5, 0.38], [0.7, 0.72], [0.92, 0.3]] },
  { name: '오리온', stars: [[0.7, 0.12], [0.28, 0.1], [0.42, 0.46], [0.5, 0.5], [0.58, 0.54], [0.76, 0.9], [0.24, 0.86]] },
  { name: '백조자리', stars: [[0.5, 0.08], [0.5, 0.32], [0.18, 0.4], [0.5, 0.56], [0.82, 0.48], [0.5, 0.9]] },
  { name: '사자자리', stars: [[0.8, 0.2], [0.7, 0.1], [0.58, 0.18], [0.6, 0.36], [0.42, 0.5], [0.16, 0.56], [0.3, 0.82]] },
  { name: '작은곰자리', stars: [[0.1, 0.2], [0.28, 0.3], [0.44, 0.36], [0.58, 0.46], [0.84, 0.48], [0.82, 0.78], [0.6, 0.74]] },
];
/** Taps closer together than this are ignored; a wrong star holds you up; a finished one waits for the next. */
export const TAP_GAP = 0.25;
export const STAR_MISS = 0.6;
export const NEXT_SKY = 1;

/** Constellation k tonight: the patterns in a seeded order, each maybe mirrored. */
export function sky(seed: number, k: number) {
  const order = shuffle(SKY.map((_, i) => i), seeded(seed));
  const c = SKY[order[k % order.length]];
  const flip = seeded(seed + (k + 1) * 313)() < 0.5;
  return { name: c.name, stars: c.stars.map(([x, y]) => [flip ? 1 - x : x, y] as [number, number]) };
}

/** Where I am in the sky: constellation k, the next star to tap, my points, no taps before `hold`. */
export interface StarRun {
  k: number;
  next: number;
  pts: number;
  hold: number;
  last: number;
}

/** Tap star i at t (in a constellation of `len`): the next one scores; any other holds me up; too fast is ignored (null). */
export function tapStar(r: StarRun, i: number, t: number, len: number): { run: StarRun; ok: boolean | null } {
  if (t < r.hold || t - r.last < TAP_GAP) return { run: r, ok: null };
  if (i !== r.next) return { run: { ...r, hold: t + STAR_MISS, last: t }, ok: false };
  const done = r.next + 1 === len;
  return { run: { k: done ? r.k + 1 : r.k, next: done ? 0 : r.next + 1, pts: r.pts + 1, hold: done ? t + NEXT_SKY : r.hold, last: t }, ok: true };
}

// ── 🧾 remember the order (cafe) ────────────────────────────────────────────
export const DISHES = ['🍝', '🍕', '🍔', '🥗', '🍰', '🧋'];
/** Each dish of an order shows this long; then a word about it this long before the next. */
export const SHOW = 0.7;
export const AFTER = 0.8;

/** Order n (len dishes), never the same dish twice running. */
export function recallOrder(seed: number, n: number, len: number) {
  const rnd = seeded(seed + (n + 1) * 59);
  const out: number[] = [];
  for (let i = 0; i < len; i++) out.push(pickNot(DISHES.length, out[i - 1] ?? -1, rnd));
  return out;
}

/** Orders get a dish longer after one remembered right, a dish shorter after a slip (3 … 9). */
export const nextLen = (len: number, ok: boolean) => (ok ? Math.min(9, len + 1) : Math.max(3, len - 1));

// ── 🎵 rhythm workout (gym) ─────────────────────────────────────────────────
/** A note falls this long to the line; beats this far apart; three lanes (← · Space · →). */
export const FALL = 1.6;
export const BEATS = 0.5;

export interface Note {
  at: number;
  lane: 0 | 1 | 2;
}

/** The song: most beats have a note, in some lane. */
export function notes(seed: number, secs = 40): Note[] {
  const rnd = seeded(seed);
  const out: Note[] = [];
  for (let t = 2; t < secs - 0.5; t += BEATS) if (rnd() < 0.7) out.push({ at: +t.toFixed(2), lane: Math.floor(rnd() * 3) as Note['lane'] });
  return out;
}

/** A press in a lane at t: the nearest note there not yet hit, if in reach — 2 spot on, 1 close; null: a stray press (−1). */
export function pressLane(ns: Note[], hit: Set<number>, lane: number, t: number): { i: number; pts: 1 | 2 } | null {
  let best = -1, d = 0.26;
  ns.forEach((n, i) => {
    if (n.lane === lane && !hit.has(i) && Math.abs(n.at - t) < d) [best, d] = [i, Math.abs(n.at - t)];
  });
  return best < 0 ? null : { i: best, pts: d <= 0.1 ? 2 : 1 };
}

// ── 📖 find the book (library) ──────────────────────────────────────────────
export const BOOK_COLORS = ['#ff8fab', '#7fb8f0', '#ffd166', '#8fd6a4', '#b79cf2', '#ff9a7a'];
export const SYMBOLS = ['★', '●', '▲', '♥', '◆', '✿'];
/** Book b is colour ⌊b / 6⌋ with symbol b % 6. A wrong pick holds you up; a found one waits for the next shelf. */
export const WRONG_BOOK = 0.7;
export const NEXT_SHELF = 0.4;

/** Shelf k: 24 different books in a row, and the one to find. */
export function shelf(seed: number, k: number) {
  const rnd = seeded(seed + (k + 1) * 97);
  const books = shuffle(Array.from({ length: 36 }, (_, i) => i), rnd).slice(0, 24);
  return { books, want: books[Math.floor(rnd() * books.length)] };
}

// ── 👗 dress to the theme, then vote (mall) ─────────────────────────────────
/** Dressing until this many seconds in; voting after. */
export const DRESS_SECS = 28;

export type Pick = Omit<Request, 'name'> & { topColor: string };

/** The day's theme (one of the styling requests). */
export const voteTheme = (seed: number) => REQUESTS[Math.floor(seeded(seed + 7)() * REQUESTS.length)];

/** How well a look fits the theme: how many of its hat / top / extra you wore. */
export const fitOf = (p: Omit<Request, 'name'>, r: Request) => (['hat', 'top', 'accessory'] as const).filter((k) => p[k] === r[k]).length;

/** A computer's look: each part on theme about half the time. */
export function cpuPick(seed: number, i: number, r: Request, opts: { hat: readonly string[]; top: readonly string[]; accessory: readonly string[]; color: readonly string[] }): Pick {
  const rnd = seeded(seed * 17 + i + 3);
  const any = <T extends string>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  return {
    hat: (rnd() < 0.5 ? r.hat : any(opts.hat)) as Pick['hat'],
    top: (rnd() < 0.5 ? r.top : any(opts.top)) as Pick['top'],
    accessory: (rnd() < 0.5 ? r.accessory : any(opts.accessory)) as Pick['accessory'],
    topColor: any(opts.color),
  };
}

/** Who a computer votes for: the best fit among the others (on a tie, the first of them in seat order). */
export function cpuVote(voter: string, looks: [string, Pick][], r: Request) {
  return looks.filter(([id]) => id !== voter).sort(([, a], [, b]) => fitOf(b, r) - fitOf(a, r))[0]?.[0] ?? null;
}

/** Votes each got. */
export function tally(votes: Record<string, string | null>) {
  const n: Record<string, number> = {};
  for (const [voter, to] of Object.entries(votes)) if (to && to !== voter) n[to] = (n[to] ?? 0) + 1;
  return n;
}

// ── 🧩 a stained-glass window, together (church): no score ─────────────────
/** Window k: each of its 3 × 3 panes' starting quarter turns (never all straight). */
export function panes(seed: number, k: number) {
  const rnd = seeded(seed + (k + 1) * 131);
  const turns = Array.from({ length: 9 }, () => Math.floor(rnd() * 4));
  if (!turns.some(Boolean)) turns[4] = 1;
  return turns;
}
export const straight = (turns: number[]) => turns.every((x) => x % 4 === 0);

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
    case 'stars': {
      // a star every so often, a pause between constellations
      let n = 0;
      for (let t = 0, k = 0; ; k++) {
        const len = sky(seed, k).stars.length;
        for (let s = 0; s < len; s++) {
          t += 0.75 + rnd() * 0.7 - skill * 0.3;
          if (t > secs) return n;
          n++;
        }
        t += NEXT_SKY;
      }
    }
    case 'recall': {
      let n = 0;
      for (let t = 0, len = 3; ; ) {
        t += len * SHOW + len * (0.45 + rnd() * 0.4) + AFTER;
        if (t > secs) return n;
        const ok = rnd() < skill + 0.45 - len * 0.07;
        if (ok) n += len;
        len = nextLen(len, ok);
      }
    }
    case 'rhythm':
      return notes(seed, secs).reduce((n: number) => {
        const r = rnd();
        return n + (r < 0.3 + skill * 0.25 ? 2 : r < 0.8 ? 1 : 0);
      }, 0);
    case 'bookhunt':
      return fit(secs, () => NEXT_SHELF + 1.6 + rnd() * 1.6 - skill);
    case 'breath':
    case 'vote': // (votes: the board counts them)
    case 'glass':
      return 0;
  }
}
