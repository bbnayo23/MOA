import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toGame } from './bridge';
import type { ActionId } from './data/actions';
import { PRESETS, type CharacterLook, type Player } from './data/character';
import { THEME_CONFIGS, type ThemeId } from './data/themes';

export type Screen = 'create' | 'world';

export interface ChatMessage {
  id: number;
  playerId: string;
  nickname: string;
  text: string;
  system?: boolean;
}

/** A note on the cheer board. */
export interface Cheer {
  id: string;
  nickname: string;
  text: string;
}

interface MoaState {
  screen: Screen;
  me: Player;
  /** Theme currently entered (null until the first entry). */
  themeId: ThemeId | null;
  /** Not-yet-open theme whose preview panel is showing. */
  preview: ThemeId | null;
  messages: ChatMessage[];
  selectedObject: string | null;
  currentAction: ActionId | null;
  cheers: Cheer[];

  go: (screen: Screen) => void;
  showPreview: (id: ThemeId | null) => void;
  setNickname: (nickname: string) => void;
  setLook: (patch: Partial<CharacterLook>) => void;
  enterTheme: (id: ThemeId) => void;
  /** Enter if the theme is open, otherwise show its preview. */
  visit: (id: ThemeId) => void;
  say: (from: Pick<Player, 'id' | 'nickname'>, text: string) => void;
  system: (text: string) => void;
  selectObject: (id: string | null) => void;
  setCurrentAction: (id: ActionId | null) => void;
  addCheer: (nickname: string, text: string) => void;
}

let nextId = 1;
const push = (list: ChatMessage[], m: Omit<ChatMessage, 'id'>) => [...list.slice(-99), { ...m, id: nextId++ }];

// ponytail: localStorage persistence of `me` and cheers; swap for Supabase rows later.
export const useMoa = create<MoaState>()(
  persist(
    (set, get) => ({
      screen: 'create',
      me: { id: 'me', nickname: '', look: PRESETS[0].look },
      themeId: null,
      preview: null,
      messages: [],
      selectedObject: null,
      currentAction: null,
      cheers: [],

      go: (screen) => set({ screen }),
      showPreview: (preview) => set({ preview }),
      setNickname: (nickname) => set((s) => ({ me: { ...s.me, nickname } })),
      setLook: (patch) => set((s) => ({ me: { ...s.me, look: { ...s.me.look, ...patch } } })),
      enterTheme: (themeId) =>
        set({ themeId, screen: 'world', messages: [], selectedObject: null, currentAction: null, preview: null }),
      visit: (id) => (THEME_CONFIGS[id] ? get().enterTheme(id) : set({ preview: id })),
      say: (from, text) => {
        set((s) => ({ messages: push(s.messages, { playerId: from.id, nickname: from.nickname, text }) }));
        toGame.emit('chat', { playerId: from.id, text });
      },
      system: (text) => set((s) => ({ messages: push(s.messages, { playerId: '', nickname: '', text, system: true }) })),
      selectObject: (selectedObject) => set({ selectedObject }),
      setCurrentAction: (currentAction) => set({ currentAction }),
      addCheer: (nickname, text) =>
        set((s) => ({ cheers: [...s.cheers.slice(-29), { id: crypto.randomUUID(), nickname, text }] })),
    }),
    {
      name: 'moa',
      version: 1,
      partialize: (s) => ({ me: s.me, cheers: s.cheers }),
      // v0 looks predate face shape / nose: fill them in
      migrate: (saved) => {
        const s = saved as Pick<MoaState, 'me' | 'cheers'>;
        return { ...s, me: { ...s.me, look: { ...PRESETS[0].look, ...s.me.look } } };
      },
    },
  ),
);
