import type { ActionId } from './data/actions';
import type { Player } from './data/character';
import type { ThemeId } from './data/themes';
import type { Motion } from './net/link';

/** React → world commands. */
export interface ToGame {
  /** Do an action; without objectId the nearest object offering it is used. */
  act: { actionId: ActionId; objectId?: string };
  /** Stop whatever my avatar is doing. */
  stop: null;
  chat: { playerId: string; text: string };
  /** Someone else in this space moved / changed (they appear on first sight). */
  peer: { player: Player } & Motion;
  /** …or left it. */
  peerLeave: string;
}

/** World → React events. */
export interface FromGame {
  /** An interaction object was clicked (its id). */
  objectClick: string;
  /** My avatar started / stopped an action. */
  actionChange: ActionId | null;
  /** My avatar reached a door leading to this theme. */
  portal: ThemeId;
  /** Where I am / what I'm doing, whenever it changes (≤ 10×/s). */
  moved: Motion;
}

function channel<M>() {
  const subs: { [K in keyof M]?: Set<(payload: M[K]) => void> } = {};
  return {
    on<K extends keyof M>(type: K, fn: (payload: M[K]) => void) {
      (subs[type] ??= new Set()).add(fn);
      return () => void subs[type]?.delete(fn);
    },
    emit<K extends keyof M>(type: K, payload: M[K]) {
      subs[type]?.forEach((fn) => fn(payload));
    },
  };
}

/** The only two doors between the UI and the game engine. */
export const toGame = channel<ToGame>();
export const fromGame = channel<FromGame>();
