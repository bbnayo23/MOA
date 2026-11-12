import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toGame } from './bridge';
import type { ActionId } from './data/actions';
import { PRESETS, type CharacterLook, type Player } from './data/character';
import type { ThemeId } from './data/themes';

export type Screen = 'create' | 'themes' | 'world';

export interface ChatMessage {
  id: number;
  playerId: string;
  nickname: string;
  text: string;
  system?: boolean;
}

interface MoaState {
  screen: Screen;
  me: Player;
  /** Theme currently entered (null until the first entry). */
  themeId: ThemeId | null;
  /** Theme highlighted on the select screen. */
  preview: ThemeId;
  messages: ChatMessage[];
  selectedObject: string | null;
  currentAction: ActionId | null;

  go: (screen: Screen, preview?: ThemeId) => void;
  setNickname: (nickname: string) => void;
  setLook: (patch: Partial<CharacterLook>) => void;
  enterTheme: (id: ThemeId) => void;
  say: (from: Pick<Player, 'id' | 'nickname'>, text: string) => void;
  system: (text: string) => void;
  selectObject: (id: string | null) => void;
  setCurrentAction: (id: ActionId | null) => void;
}

let nextId = 1;
const push = (list: ChatMessage[], m: Omit<ChatMessage, 'id'>) => [...list.slice(-99), { ...m, id: nextId++ }];

// ponytail: localStorage persistence of `me`; swap for a Supabase profile row later.
export const useMoa = create<MoaState>()(
  persist(
    (set, get) => ({
      screen: 'create',
      me: { id: 'me', nickname: '', look: PRESETS[0].look },
      themeId: null,
      preview: 'camping',
      messages: [],
      selectedObject: null,
      currentAction: null,

      go: (screen, preview) => set((s) => ({ screen, preview: preview ?? s.preview })),
      setNickname: (nickname) => set((s) => ({ me: { ...s.me, nickname } })),
      setLook: (patch) => {
        set((s) => ({ me: { ...s.me, look: { ...s.me.look, ...patch } } }));
        toGame.emit('look', { playerId: 'me', look: get().me.look });
      },
      enterTheme: (themeId) =>
        set({ themeId, screen: 'world', messages: [], selectedObject: null, currentAction: null }),
      say: (from, text) => {
        set((s) => ({ messages: push(s.messages, { playerId: from.id, nickname: from.nickname, text }) }));
        toGame.emit('chat', { playerId: from.id, text });
      },
      system: (text) => set((s) => ({ messages: push(s.messages, { playerId: '', nickname: '', text, system: true }) })),
      selectObject: (selectedObject) => set({ selectedObject }),
      setCurrentAction: (currentAction) => set({ currentAction }),
    }),
    { name: 'moa', partialize: (s) => ({ me: s.me }) },
  ),
);
