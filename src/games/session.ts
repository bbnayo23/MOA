import { create } from 'zustand';
import type { CharacterLook } from '../data/character';
import { GAMES, type GameId } from '../data/games';
import type { ThemeId } from '../data/themes';
import { supabase } from '../net/supabase';
import { roomOf, useMoa } from '../store';

/**
 * Every minigame's shared shell: a table someone opens in a space (lobby), seats
 * and ready checks, the start, in-game events, results the server checks, a
 * rematch, and leaving. Games plug in a scene + rules and talk through `ev` /
 * `onEvent`; everything here goes over the place's realtime channel, so anyone
 * in the space sees open tables and can join one or watch.
 */
export interface Seat {
  id: string;
  nickname: string;
  look: CharacterLook;
  ready: boolean;
  cpu?: boolean;
}

/** An open (or running) table someone else is hosting in this space. */
export interface Table {
  mid: string;
  game: GameId;
  host: string;
  seats: Seat[];
  status: 'open' | 'playing';
  /** Who's watching (they sit in the stands). */
  watchers?: Seat[];
}

export type Scores = Record<string, number | null>;

export interface Match extends Table {
  role: 'player' | 'watch';
  phase: 'lobby' | 'countdown' | 'play' | 'result';
  seed: number;
  /** performance.now() when play begins (after the countdown). */
  startAt: number;
  /** The server's record of it (null: no server, or not started). */
  serverId: string | null;
  scores: Scores | null;
  /** How the result stands with the server. */
  verdict: 'local' | 'pending' | 'done' | 'disputed' | null;
  /** Players who dropped out mid-game. */
  left: string[];
  /** Who the host has asked over (so the lobby can say so). */
  asked?: string[];
}

/** Over the place's channel. */
export type GameMsg =
  | { k: 'table'; t: Table }
  | { k: 'close'; mid: string }
  | { k: 'join'; mid: string; seat: Seat }
  | { k: 'leave'; mid: string }
  | { k: 'ready'; mid: string; on: boolean }
  | { k: 'start'; mid: string; seed: number; seats: Seat[]; serverId: string | null }
  | { k: 'ev'; mid: string; seq: number; data: unknown }
  /** I'm watching (or not any more): the host keeps the list, the table carries it. */
  | { k: 'watch'; mid: string; seat: Seat }
  | { k: 'unwatch'; mid: string }
  /** "Play with me?": a host asks one person in the room (any space in it) to their table; `nope` is their "not now". */
  | { k: 'ask'; to: string; t: Table; theme: ThemeId }
  | { k: 'nope'; mid: string };

export type Ask = Table & { theme: ThemeId };

interface GameState {
  tables: Record<string, Table & { seen: number }>;
  match: Match | null;
  /** Tables I've been asked to (and the space they're in), newest last. */
  asks: Ask[];
}

export const useGame = create<GameState>()(() => ({ tables: {}, match: null, asks: [] }));
const set = useGame.setState;
const get = useGame.getState;

const COUNTDOWN = 3000;
let sendRaw: (g: GameMsg) => void = () => {};
let seq = 0;
let beat: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<(data: unknown, from: string) => void>();

const me = () => useMoa.getState().me;
const mySeat = (ready = false): Seat => ({ id: me().id, nickname: me().nickname, look: me().look, ready });
const isHost = () => get().match?.host === me().id;
const patch = (m: Partial<Match>) => set((s) => (s.match ? { match: { ...s.match, ...m } } : s));

/** The realtime link hands over its send (useRealtime). */
export const bindGameLink = (send: (g: GameMsg) => void) => (sendRaw = send);

const tableOf = ({ mid, game, host, seats, phase, watchers }: Match): Table => ({ mid, game, host, seats, watchers, status: phase === 'lobby' ? 'open' : 'playing' });

/** Seats in the stands. */
const STANDS = 36;

/** Tell the space about my table (also every few seconds, for people who walk in later). */
function announce() {
  const m = get().match;
  if (m && isHost()) sendRaw({ k: 'table', t: tableOf(m) });
}

function heartbeat(on: boolean) {
  clearInterval(beat);
  beat = on ? setInterval(announce, 3000) : undefined;
}

// ── what I do ───────────────────────────────────────────────────────────────
/** Open a table for this game, with me in the first seat. */
export function host(game: GameId) {
  if (get().match) return;
  set({ match: { mid: crypto.randomUUID(), game, host: me().id, seats: [mySeat(true)], status: 'open', role: 'player', phase: 'lobby', seed: 0, startAt: 0, serverId: null, scores: null, verdict: null, left: [] } });
  announce();
  heartbeat(true);
}

/**
 * Ask someone here to play: opens my table for that game first if I have none.
 * False when I'm busy with something else (another game, or one under way).
 */
export function ask(game: GameId, to: string) {
  if (!get().match) host(game);
  const m = get().match!;
  if (m.game !== game || !isHost() || m.phase !== 'lobby') return false;
  sendRaw({ k: 'ask', to, t: tableOf(m), theme: useMoa.getState().themeId! });
  patch({ asked: [...new Set([...(m.asked ?? []), to])] });
  return true;
}

/** A table I said yes to in another space: I'm on my way, and sit down when it next shows up there. */
let headingTo: { mid: string; until: number } | null = null;

/** Yes (take a seat — going over to its space first) or not now (the host hears so) to a table I was asked to. */
export function answer(a: Ask, yes: boolean) {
  set((s) => ({ asks: s.asks.filter((x) => x.mid !== a.mid) }));
  if (!yes) return sendRaw({ k: 'nope', mid: a.mid });
  const st = useMoa.getState();
  if (a.theme === st.themeId) return join(get().tables[a.mid] ?? a);
  headingTo = { mid: a.mid, until: Date.now() + 10_000 };
  st.enterTheme(a.theme);
  setTimeout(() => {
    if (headingTo?.mid !== a.mid) return;
    headingTo = null;
    useMoa.getState().system(`${GAMES[a.game].icon} 그 게임은 이미 끝났나 봐요.`);
  }, 10_000);
}

export function join(t: Table) {
  if (get().match) return;
  set({ match: { ...t, role: 'player', phase: 'lobby', seed: 0, startAt: 0, serverId: null, scores: null, verdict: null, left: [] } });
  sendRaw({ k: 'join', mid: t.mid, seat: mySeat() });
}

/** Watch a table (a match in progress shows from the next event on), from a seat in its stands. */
export function watch(t: Table) {
  if (get().match) return;
  set({ match: { ...t, role: 'watch', phase: t.status === 'playing' ? 'play' : 'lobby', seed: 0, startAt: performance.now(), serverId: null, scores: null, verdict: null, left: [] } });
  sendRaw({ k: 'watch', mid: t.mid, seat: mySeat() });
}

export function ready(on: boolean) {
  const m = get().match;
  if (!m || m.role !== 'player') return;
  patch({ seats: m.seats.map((s) => (s.id === me().id ? { ...s, ready: on } : s)) });
  if (isHost()) announce();
  else sendRaw({ k: 'ready', mid: m.mid, on });
}

/** The host starts: with friends (everyone ready) or, alone, against the computer. */
export async function start(solo = false) {
  const m = get().match;
  if (!m || !isHost()) return;
  const def = GAMES[m.game];
  const seats = solo
    ? [mySeat(true), ...Array.from({ length: def.cpu }, (_, i) => ({ id: `cpu${i + 1}`, nickname: `컴퓨터 ${i + 1}`, look: me().look, ready: true, cpu: true }))]
    : m.seats;
  if (!solo && (seats.length < def.min || seats.some((s) => !s.ready))) return;
  const serverId = def.score === 'none' ? null : await record(m.game, seats); // nothing to win: nothing to record
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (!solo) sendRaw({ k: 'start', mid: m.mid, seed, seats, serverId });
  begin(seed, seats, serverId);
}

function begin(seed: number, seats: Seat[], serverId: string | null) {
  patch({ seed, seats, serverId, phase: 'countdown', status: 'playing', startAt: performance.now() + COUNTDOWN, scores: null, verdict: null, left: [] });
  setTimeout(() => get().match?.phase === 'countdown' && patch({ phase: 'play' }), COUNTDOWN);
  if (isHost()) announce();
}

/** An in-game event to everyone at the table (and anyone watching). */
export function ev(data: unknown) {
  const m = get().match;
  if (m && m.role === 'player' && !m.seats.every((s) => s.id === me().id || s.cpu)) sendRaw({ k: 'ev', mid: m.mid, seq: ++seq, data });
}

/** Events from the others at the table (the game's view listens while it's up). */
export function onEvent(fn: (data: unknown, from: string) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** The game's over: show the results, and (as a player) report them to the server. */
export function finish(scores: Scores) {
  const m = get().match;
  if (!m || m.phase === 'result') return;
  patch({ phase: 'result', scores, verdict: m.role === 'watch' || GAMES[m.game].score === 'none' ? null : m.serverId ? 'pending' : 'local' });
  if (m.role === 'player' && m.serverId) void report(m.serverId, scores);
}

/** Back to the table for another round (host), everyone else unready. */
export function rematch() {
  const m = get().match;
  if (!m) return;
  if (isHost()) {
    patch({ phase: 'lobby', status: 'open', scores: null, verdict: null, seats: m.seats.filter((s) => !s.cpu).map((s) => ({ ...s, ready: s.id === me().id })) });
    announce();
    heartbeat(true);
  } else patch({ phase: 'lobby', scores: null, verdict: null });
}

/** Leave the table (a host closes it) and go back to the space. */
export function exit() {
  const m = get().match;
  if (!m) return;
  if (isHost()) sendRaw({ k: 'close', mid: m.mid });
  else if (m.role === 'player') sendRaw({ k: 'leave', mid: m.mid });
  else sendRaw({ k: 'unwatch', mid: m.mid });
  heartbeat(false);
  set({ match: null });
}

// ── what the others do ──────────────────────────────────────────────────────
export function receive(from: string, g: GameMsg) {
  const m = get().match;
  switch (g.k) {
    case 'ask':
      if (g.to === me().id && !m) set((s) => ({ asks: [...s.asks.filter((a) => a.mid !== g.t.mid), { ...g.t, theme: g.theme }] }));
      return;
    case 'nope':
      if (m?.mid === g.mid && isHost()) {
        const who = useMoa.getState().peers.find((p) => p.id === from)?.nickname ?? '상대';
        useMoa.getState().system(`${GAMES[m.game].icon} ${who}님은 다음에 같이 하재요.`);
        patch({ asked: (m.asked ?? []).filter((id) => id !== from) });
      }
      return;
    case 'table': {
      set((s) => ({ tables: { ...s.tables, [g.t.mid]: { ...g.t, seen: Date.now() } } }));
      if (!m && headingTo?.mid === g.t.mid) {
        headingTo = null;
        if (g.t.status === 'open') join(g.t);
        return;
      }
      if (m?.mid !== g.t.mid || isHost()) return;
      patch({ watchers: g.t.watchers }); // who's in the stands, at any point
      // the host's word on who's seated; a lobby I'm not in any more (full, or sent away): leave it
      if (m.role === 'player' && m.phase === 'lobby' && !g.t.seats.some((s) => s.id === me().id)) {
        set({ match: null });
        useMoa.getState().system(`${GAMES[g.t.game].icon} 자리가 없어서 참가하지 못했어요.`);
      } else if (m.phase === 'result' && g.t.status === 'open') patch({ phase: 'lobby', seats: g.t.seats, status: 'open', scores: null, verdict: null }); // the host's rematch
      else if (m.phase === 'lobby' || m.role === 'watch') patch({ seats: g.t.seats, status: g.t.status });
      return;
    }
    case 'close':
      set((s) => ({ tables: Object.fromEntries(Object.entries(s.tables).filter(([k]) => k !== g.mid)), asks: s.asks.filter((a) => a.mid !== g.mid) }));
      if (m?.mid === g.mid && !isHost()) {
        set({ match: null });
        useMoa.getState().system('🏁 호스트가 게임을 닫았어요.');
      }
      return;
  }
  if (!m || m.mid !== g.mid) return;
  // spectators come and go whenever (the host keeps the list)
  if (isHost() && (g.k === 'watch' || g.k === 'unwatch')) {
    const rest = (m.watchers ?? []).filter((w) => w.id !== from);
    patch({ watchers: g.k === 'watch' ? [...rest, g.seat].slice(0, STANDS) : rest });
    return announce();
  }
  if (isHost() && m.phase === 'lobby') {
    if (g.k === 'join' && !m.seats.some((s) => s.id === from) && m.seats.length < GAMES[m.game].max) patch({ seats: [...m.seats, g.seat] });
    if (g.k === 'leave') patch({ seats: m.seats.filter((s) => s.id !== from) });
    if (g.k === 'ready') patch({ seats: m.seats.map((s) => (s.id === from ? { ...s, ready: g.on } : s)) });
    if (g.k !== 'ev') announce(); // a join past the last seat hears "full" from this too
  }
  if (g.k === 'start' && (m.phase === 'lobby' || m.phase === 'result')) begin(g.seed, g.seats, g.serverId);
  if (g.k === 'ev' && (m.phase === 'play' || m.phase === 'countdown')) listeners.forEach((fn) => fn(g.data, from));
}

/**
 * Who's still in the space (presence): tables whose host left disappear, lobby
 * seats empty, and a player who drops mid-game is out (the game decides what that means).
 */
export function present(ids: string[]) {
  const here = new Set([...ids, me().id]);
  // (asks can come from anywhere in the room: they keep till answered, or the toast times out)
  set((s) => ({ tables: Object.fromEntries(Object.entries(s.tables).filter(([, t]) => here.has(t.host) && Date.now() - t.seen < 10_000)) }));
  const m = get().match;
  if (!m) return;
  if (!here.has(m.host)) {
    if (m.phase === 'lobby') {
      set({ match: null });
      useMoa.getState().system('🏁 호스트가 나가서 게임이 닫혔어요.');
      return;
    }
  }
  if (isHost() && m.watchers?.some((w) => !here.has(w.id))) {
    patch({ watchers: m.watchers.filter((w) => here.has(w.id)) });
    announce();
  }
  const gone = m.seats.filter((s) => !s.cpu && !here.has(s.id)).map((s) => s.id);
  if (m.phase === 'lobby' && isHost() && gone.length) {
    patch({ seats: m.seats.filter((s) => !gone.includes(s.id)) });
    announce();
  } else if ((m.phase === 'play' || m.phase === 'countdown') && gone.some((id) => !m.left.includes(id))) patch({ left: [...new Set([...m.left, ...gone])] });
}

/** Moving to another space or room: the table there is gone for me. */
export function leaveSpace() {
  exit();
  set({ tables: {} });
}

// ── the server's record ─────────────────────────────────────────────────────
/** Open a record of the match on the server (who plays, where, when it began). */
async function record(game: GameId, seats: Seat[]) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('start_match', { p_game: game, p_place: roomOf(useMoa.getState()).id, p_players: seats.filter((s) => !s.cpu).map((s) => s.id) });
  if (error) console.warn('[moa] match not recorded:', error.message);
  return (data as string | null) ?? null;
}

/** Report the result; the server checks it (time, bounds, everyone agreeing) and keeps it. */
async function report(serverId: string, scores: Scores, retry = true) {
  const { data, error } = await supabase!.rpc('report_match', { p_match: serverId, p_scores: scores });
  const status = error ? 'disputed' : (data as string);
  if (get().match?.serverId !== serverId) return;
  if (status === 'done' || status === 'disputed') patch({ verdict: status });
  // waiting on the others' reports: ask again in a while (someone may have left)
  else if (retry) setTimeout(() => void report(serverId, scores, false), 25_000);
}

/** The fastest swims on record (or most tennis wins), from the server. */
export async function records(game: GameId): Promise<{ nickname: string; value: number }[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('game_records', { p_game: game });
  return (data as { nickname: string; value: number }[] | null) ?? [];
}
