import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ActionId } from '../data/actions';
import type { AnimKey } from '../data/anims';
import type { CharacterLook } from '../data/character';
import type { ThemeId } from '../data/themes';
import type { Tile } from '../world/space';
import type { Room } from './rooms';
import { supabase } from './supabase';
import type { Lang } from './translate';

/** Who's online and where — slow-changing, kept by presence. */
export interface Presence {
  id: string;
  nickname: string;
  look: CharacterLook;
  /** The language they read in (what to translate my lines into for them). */
  lang: Lang;
  themeId: ThemeId;
  room: Room;
  /** When they came into that room (who's over the limit). */
  joinedAt: number;
}

/** Where a character is and what it's doing (sent as it changes). */
export interface Motion {
  pos: Tile;
  heading: number;
  anim: AnimKey;
  action: ActionId | null;
}

/** What goes between the people in one place (room + space). */
export type Message =
  | ({ type: 'state'; id: string; roomId: string; themeId: ThemeId } & Motion)
  /** A line, as written (`lang`: what it's written in); its translations follow as 'tr'. */
  | { type: 'chat'; id: string; roomId: string; themeId: ThemeId; mid: string; text: string; lang: Lang | null }
  | { type: 'tr'; id: string; roomId: string; themeId: ThemeId; mid: string; lang: Lang; text: string }
  /** The owner sent `to` out of this place. */
  | { type: 'kick'; id: string; roomId: string; to: string }
  // without a server only: invitations go over the tabs' channel (with one, they're rows in `invites`)
  | { type: 'invite'; id: string; to: string; nickname: string; room: Room; themeId: ThemeId };

export interface Link {
  /** How I appear to everyone online. */
  track(me: Presence): void;
  /** Join this place's channel (leaving the last one). */
  enter(place: string): void;
  /** To everyone in my place. */
  send(msg: Message): void;
  close(): void;
}

export interface LinkHandlers {
  /** Everyone online, me included, whenever that changes. */
  presence: (all: Presence[]) => void;
  message: (msg: Message) => void;
  /** In this place's channel now: what I send reaches everyone there. */
  joined: () => void;
  /** The server wouldn't let me into this place. */
  denied: (place: string) => void;
  /** Connected or not (it reconnects by itself). */
  status: (live: boolean) => void;
  /** This account came in from another window, more recently: this one should stand down. */
  taken: () => void;
}

const WORLD = 'moa:world';
/** This window (one account may be open in several). */
const TAB = crypto.randomUUID();

/** Opens the realtime link: Supabase when configured, otherwise between this browser's tabs. */
export function openLink(me: Presence, on: LinkHandlers): Link {
  return supabase ? supabaseLink(me, on) : tabLink(me, on);
}

/**
 * Channels on their way out. supabase-js hands back the same channel for a
 * topic until it has fully left, so a new one (back from 꾸미기, React's dev
 * double-mount, re-entering a place) waits for those instead of joining a dying one.
 */
let leaving: Promise<unknown> = Promise.resolve();
/** Wait for channels on their way out (before opening another). */
export const settled = () => leaving;
/** Leave a channel; the next one opened waits for it. */
export const leave = (c: RealtimeChannel) => (leaving = Promise.all([leaving, supabase!.removeChannel(c)]));

type Meta = Presence & { tab: string; since: number };

/**
 * Supabase Realtime, two private channels: the world (presence: who's online,
 * where) and the place I'm in (broadcast: movement, chat). Who may join a
 * place's channel is the server's call (`can_enter`, supabase/migrations/0002).
 */
function supabaseLink(me: Presence, on: LinkHandlers): Link {
  const sb = supabase!;
  let mine: Meta = { ...me, tab: TAB, since: Date.now() };
  let world: RealtimeChannel | undefined;
  let place: RealtimeChannel | undefined;
  let placeLive = false;
  let worldLive = false;
  let closed = false;
  let want = '';

  const open = (topic: string, wire: (c: RealtimeChannel) => RealtimeChannel, onStatus: (status: string, err?: Error) => void) =>
    leaving.then(async () => {
      await sb.realtime.setAuth();
      if (closed) return undefined;
      const c = wire(sb.channel(topic, { config: { private: true, presence: { key: me.id }, broadcast: { self: false } } }));
      c.subscribe(onStatus);
      return c;
    });
  const drop = (c: RealtimeChannel | undefined) => c && leave(c);

  void open(
    WORLD,
    (c) =>
      c.on('presence', { event: 'sync' }, () => {
        const state = c.presenceState<Meta>();
        // one entry per person: their latest window
        on.presence(Object.values(state).map((metas) => metas.reduce((a, b) => (b.since > a.since ? b : a))));
        if ((state[me.id] ?? []).some((m) => m.tab !== TAB && m.since > mine.since)) on.taken();
      }),
    (status) => {
      worldLive = status === 'SUBSCRIBED';
      on.status(worldLive);
      if (worldLive) void world?.track(mine);
    },
  ).then((c) => (world = c));

  const enter = (topic: string) => {
    want = topic;
    drop(place);
    place = undefined;
    placeLive = false;
    void open(
      topic,
      (c) => c.on('broadcast', { event: 'msg' }, ({ payload }) => on.message(payload as Message)),
      (status, err) => {
        if (want !== topic) return;
        placeLive = status === 'SUBSCRIBED';
        if (placeLive) on.joined();
        // refused by the realtime policy (not just a dropped connection, which retries by itself)
        if (status === 'CHANNEL_ERROR' && /unauthori[sz]ed|permission/i.test(err?.message ?? '')) on.denied(topic);
      },
    ).then((c) => {
      if (want === topic) place = c;
      else drop(c);
    });
  };

  return {
    track: (p) => {
      mine = { ...p, tab: TAB, since: mine.since };
      if (worldLive) void world?.track(mine);
    },
    enter,
    send: (msg) => {
      if (placeLive) void place!.send({ type: 'broadcast', event: 'msg', payload: msg });
    },
    close: () => {
      closed = true;
      worldLive = placeLive = false;
      drop(world);
      drop(place);
    },
  };
}

/**
 * The same thing between tabs of this browser (no server, so no permissions):
 * each tab says hello every couple of seconds; one that goes quiet for 6 s has left.
 */
function tabLink(me: Presence, on: LinkHandlers): Link {
  const bc = new BroadcastChannel(WORLD);
  const peers = new Map<string, { p: Presence; seen: number }>();
  let mine = me;
  const emit = () => on.presence([mine, ...[...peers.values()].map((x) => x.p)]);
  const hello = (reply: boolean) => bc.postMessage({ kind: 'hello', p: mine, reply });
  bc.onmessage = ({ data }) => {
    if (data.kind === 'hello') {
      const isNew = !peers.has(data.p.id);
      peers.set(data.p.id, { p: data.p, seen: Date.now() });
      emit();
      if (isNew && !data.reply) hello(true); // introduce ourselves to a newcomer
    } else if (data.kind === 'bye') {
      peers.delete(data.id);
      emit();
    } else if (data.kind === 'msg') on.message(data.msg);
  };
  const beat = setInterval(() => {
    hello(true);
    const before = peers.size;
    for (const [id, x] of peers) if (Date.now() - x.seen > 6000) peers.delete(id);
    if (peers.size !== before) emit();
  }, 2000);
  hello(false);
  emit();
  on.status(true);
  return {
    track: (p) => {
      mine = p;
      hello(true);
      emit();
    },
    enter: () => {},
    send: (msg) => bc.postMessage({ kind: 'msg', msg }),
    close: () => {
      clearInterval(beat);
      bc.postMessage({ kind: 'bye', id: mine.id });
      bc.close();
    },
  };
}
