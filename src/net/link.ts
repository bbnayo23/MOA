import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ActionId } from '../data/actions';
import type { AnimKey } from '../data/anims';
import type { CharacterLook } from '../data/character';
import type { ThemeId } from '../data/themes';
import type { Tile } from '../world/space';
import { supabase } from './supabase';

/** Who's online and where — slow-changing, kept by presence. */
export interface Presence {
  id: string;
  nickname: string;
  look: CharacterLook;
  themeId: ThemeId;
}

/** Where a character is and what it's doing (sent as it changes). */
export interface Motion {
  pos: Tile;
  heading: number;
  anim: AnimKey;
  action: ActionId | null;
}

export type Message =
  | ({ type: 'state'; id: string; themeId: ThemeId } & Motion)
  | { type: 'chat'; id: string; themeId: ThemeId; text: string; original?: string };

export interface Link {
  track(me: Presence): void;
  send(msg: Message): void;
  close(): void;
}

export interface LinkHandlers {
  /** Everyone online, me included, whenever that changes. */
  presence: (all: Presence[]) => void;
  message: (msg: Message) => void;
}

// ponytail: one channel for the whole world (clients filter by themeId); split per theme if it gets busy.
const TOPIC = 'moa:world';

/** Opens the realtime link: Supabase when configured, otherwise between this browser's tabs. */
export function openLink(me: Presence, on: LinkHandlers): Link {
  return supabase ? supabaseLink(me, on) : tabLink(me, on);
}

/**
 * The previous link's channel on its way out. supabase-js hands back the same
 * channel for a topic until it has fully left, so a new link (back from
 * 꾸미기, React's dev double-mount) waits for that instead of joining a dying one.
 */
let leaving: Promise<unknown> = Promise.resolve();

/** Supabase Realtime: presence for who's here, broadcast for movement and chat (private channel, members only). */
function supabaseLink(me: Presence, on: LinkHandlers): Link {
  const sb = supabase!;
  let ch: RealtimeChannel | undefined;
  let mine = me;
  let live = false;
  let closed = false;
  void leaving
    .then(() => sb.realtime.setAuth())
    .then(() => {
      if (closed) return; // closed before it ever joined
      const c = (ch = sb.channel(TOPIC, { config: { private: true, presence: { key: me.id }, broadcast: { self: false } } }));
      c.on('presence', { event: 'sync' }, () => on.presence(Object.values(c.presenceState<Presence>()).map((list) => list[0])))
        .on('broadcast', { event: 'msg' }, ({ payload }) => on.message(payload as Message))
        .subscribe((status) => {
          live = status === 'SUBSCRIBED';
          if (live) void c.track(mine);
        });
    });
  return {
    track: (p) => {
      mine = p;
      if (live) void ch!.track(p);
    },
    send: (msg) => {
      if (live) void ch!.send({ type: 'broadcast', event: 'msg', payload: msg });
    },
    close: () => {
      closed = true;
      live = false;
      if (ch) leaving = sb.removeChannel(ch);
    },
  };
}

/**
 * The same thing between tabs of this browser (no server): each tab says hello
 * every couple of seconds; one that goes quiet for 6 s has left.
 */
function tabLink(me: Presence, on: LinkHandlers): Link {
  const bc = new BroadcastChannel(TOPIC);
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
  return {
    track: (p) => {
      mine = p;
      hello(true);
      emit();
    },
    send: (msg) => bc.postMessage({ kind: 'msg', msg }),
    close: () => {
      clearInterval(beat);
      bc.postMessage({ kind: 'bye', id: mine.id });
      bc.close();
    },
  };
}
