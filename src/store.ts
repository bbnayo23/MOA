import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toGame } from './bridge';
import type { ActionId } from './data/actions';
import { PRESETS, type CharacterLook, type Player } from './data/character';
import { HUB, THEME_CONFIGS, type ThemeId } from './data/themes';
import type { Presence } from './net/link';
import type { Profile } from './net/supabase';
import { ownRoom, type Room } from './net/rooms';
import type { Lang } from './net/translate';
import type { Tile } from './world/space';

export type Screen = 'create' | 'world';

export interface ChatMessage {
  id: number;
  playerId: string;
  nickname: string;
  text: string;
  /** What they typed, when `text` is its translation. */
  original?: string;
  system?: boolean;
}

/** A note on the cheer board. */
export interface Cheer {
  id: string;
  nickname: string;
  text: string;
}

/** Someone asked me over to their room. */
export interface Invite {
  from: string;
  room: Room;
  /** The space they're in. */
  themeId: ThemeId;
}

/** Where I was: brought back on the next visit. */
export interface Place {
  themeId: ThemeId;
  pos: Tile;
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
  /** Other people online right now (any space). */
  peers: Presence[];
  last: Place | null;
  /** My speech bubbles come out in this language (null: as typed). */
  lang: Lang | null;
  /** The room I'm in (null: my own space). */
  room: Room | null;
  joinedAt: number;
  invite: Invite | null;

  go: (screen: Screen) => void;
  showPreview: (id: ThemeId | null) => void;
  setNickname: (nickname: string) => void;
  setLook: (patch: Partial<CharacterLook>) => void;
  enterTheme: (id: ThemeId) => void;
  /** Enter if the theme is open, otherwise show its preview. */
  visit: (id: ThemeId) => void;
  say: (from: Pick<Player, 'id' | 'nickname'>, text: string, original?: string) => void;
  setLang: (lang: Lang | null) => void;
  /** Move to a room (null: back to my own space), staying in this space. */
  setRoom: (room: Room | null) => void;
  createRoom: (name: string) => void;
  /** Go to a room, into the space they're in. */
  joinRoom: (room: Room, themeId: ThemeId) => void;
  setInvite: (invite: Invite | null) => void;
  system: (text: string) => void;
  selectObject: (id: string | null) => void;
  setCurrentAction: (id: ActionId | null) => void;
  addCheer: (nickname: string, text: string) => void;
  setPeers: (peers: Presence[]) => void;
  setLast: (last: Place) => void;
  /** Signed in: become this account, and pick up where its profile left off. */
  signIn: (id: string, profile: Profile | null) => void;
}

/** The room I'm in: a made / joined one, or my own space. */
export const roomOf = (s: Pick<MoaState, 'room' | 'me'>) => s.room ?? ownRoom(s.me);

/** How I appear to everyone online. */
export const presenceOf = (s: MoaState): Presence => ({
  id: s.me.id,
  nickname: s.me.nickname,
  look: s.me.look,
  themeId: s.themeId!,
  room: roomOf(s),
  joinedAt: s.joinedAt,
});

let nextId = 1;
const push = (list: ChatMessage[], m: Omit<ChatMessage, 'id'>) => [...list.slice(-99), { ...m, id: nextId++ }];

/** Without an account each tab is its own character (so two tabs can meet each other). */
const tabId = () => {
  let id = sessionStorage.getItem('moa-tab');
  if (!id) sessionStorage.setItem('moa-tab', (id = crypto.randomUUID()));
  return id;
};

/** Come back into the world where I left, if I've been here before. */
const resume = (nickname: string, last: Place | null) =>
  nickname ? { screen: 'world' as const, themeId: last && THEME_CONFIGS[last.themeId] ? last.themeId : HUB } : { screen: 'create' as const };

export const useMoa = create<MoaState>()(
  persist(
    (set, get) => ({
      screen: 'create',
      me: { id: tabId(), nickname: '', look: PRESETS[0].look },
      themeId: null,
      preview: null,
      messages: [],
      selectedObject: null,
      currentAction: null,
      cheers: [],
      peers: [],
      last: null,
      lang: null,
      room: null,
      joinedAt: Date.now(),
      invite: null,

      go: (screen) => set({ screen }),
      showPreview: (preview) => set({ preview }),
      setNickname: (nickname) => set((s) => ({ me: { ...s.me, nickname } })),
      setLook: (patch) => set((s) => ({ me: { ...s.me, look: { ...s.me.look, ...patch } } })),
      enterTheme: (themeId) =>
        set({ themeId, screen: 'world', messages: [], selectedObject: null, currentAction: null, preview: null }),
      visit: (id) => (THEME_CONFIGS[id] ? get().enterTheme(id) : set({ preview: id })),
      say: (from, text, original) => {
        set((s) => ({ messages: push(s.messages, { playerId: from.id, nickname: from.nickname, text, original }) }));
        toGame.emit('chat', { playerId: from.id, text, original });
      },
      setLang: (lang) => set({ lang }),
      setRoom: (room) => {
        set({ room, joinedAt: Date.now(), invite: null, messages: [], selectedObject: null, currentAction: null });
        get().system(`🚪 ${room?.name ?? '내 공간'}에 들어왔어요.`);
      },
      createRoom: (name) => get().setRoom({ id: crypto.randomUUID(), name, listed: true }),
      joinRoom: (room, themeId) => {
        if (themeId !== get().themeId && THEME_CONFIGS[themeId]) get().enterTheme(themeId);
        get().setRoom(room.id === get().me.id ? null : room);
      },
      setInvite: (invite) => set({ invite }),
      system: (text) => set((s) => ({ messages: push(s.messages, { playerId: '', nickname: '', text, system: true }) })),
      selectObject: (selectedObject) => set({ selectedObject }),
      setCurrentAction: (currentAction) => set({ currentAction }),
      addCheer: (nickname, text) =>
        set((s) => ({ cheers: [...s.cheers.slice(-29), { id: crypto.randomUUID(), nickname, text }] })),
      setPeers: (peers) => set({ peers }),
      setLast: (last) => set({ last }),
      signIn: (id, profile) => {
        const me = profile ? { id, nickname: profile.nickname, look: { ...PRESETS[0].look, ...profile.look } } : { ...get().me, id };
        const last = profile?.theme_id && profile.pos ? { themeId: profile.theme_id, pos: profile.pos } : null;
        set({ me, last, messages: [], ...resume(profile?.nickname ?? '', last) });
      },
    }),
    {
      name: 'moa',
      version: 2,
      // the id isn't kept: it's per tab, or the signed-in account's
      partialize: (s) => ({ me: { nickname: s.me.nickname, look: s.me.look }, cheers: s.cheers, last: s.last, lang: s.lang }),
      // v0 looks predate face shape / nose: fill them in
      migrate: (saved) => {
        const s = saved as { me: Player; cheers?: Cheer[] };
        return { cheers: s.cheers ?? [], last: null, lang: null, me: { nickname: s.me.nickname, look: { ...PRESETS[0].look, ...s.me.look } } };
      },
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<Pick<MoaState, 'cheers' | 'last'>> & { me?: Partial<Player> };
        const { id: _, ...me } = s.me ?? {};
        const merged = { ...current, ...s, me: { ...current.me, ...me } };
        return { ...merged, ...resume(merged.me.nickname, merged.last) };
      },
    },
  ),
);
