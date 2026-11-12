import type { ActionId } from './data/actions';
import type { CharacterLook } from './data/character';

/** React → Phaser commands. */
export interface ToGame {
  act: ActionId;
  chat: { playerId: string; text: string };
  look: { playerId: string; look: CharacterLook };
}

/** Phaser → React events. */
export interface FromGame {
  /** An interaction object was clicked (its id). */
  objectClick: string;
  /** My avatar started / stopped an action. */
  actionChange: ActionId | null;
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
