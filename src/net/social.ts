import { create } from 'zustand';
import type { CharacterLook } from '../data/character';
import type { ThemeId } from '../data/themes';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useMoa } from '../store';
import { leave, settled } from './link';
import { supabase, type Settings } from './supabase';
import { langOf, translate, type Lang } from './translate';

// Rows of supabase/migrations/0002_social.sql
export type Visibility = 'public' | 'friends' | 'invite' | 'private';
export type DmPolicy = Settings['dm_policy'];
export interface Person {
  id: string;
  nickname: string;
  look: CharacterLook;
}
export interface FriendRow {
  from_id: string;
  to_id: string;
  accepted: boolean;
}
export interface Dm {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  lang: Lang | null;
  translation: string | null;
  translation_lang: Lang | null;
  created_at: string;
  read_at: string | null;
}
export interface InviteRow {
  id: string;
  place: string;
  place_name: string;
  theme_id: ThemeId;
  from_id: string;
  to_id: string | null;
  status: 'pending' | 'accepted' | 'declined';
  expires_at: string;
}
export interface Space {
  owner_id: string;
  name: string;
  theme_id: ThemeId;
  visibility: Visibility;
}
export interface RoomRow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  theme_id: ThemeId;
  max_members: number;
  visibility: 'public' | 'private';
  locked: boolean;
}
export interface RoomSetup {
  name: string;
  description: string;
  theme: ThemeId;
  max: number;
  visibility: 'public' | 'private';
  /** null keeps the current one, '' takes it off. */
  password: string | null;
}

export const VISIBILITY: Record<Visibility, string> = { public: '전체 공개', friends: '친구 공개', invite: '초대 전용', private: '비공개' };
export const DM_POLICY: Record<DmPolicy, string> = { all: '모두에게 받기', friends: '친구에게만', none: '받지 않기' };

interface Social {
  people: Record<string, Person>;
  friends: FriendRow[];
  blocks: string[];
  dms: Dm[];
  /** Invites to me, still open. */
  invites: InviteRow[];
  space: Space | null;
  rooms: RoomRow[];
  dmPolicy: DmPolicy;
  /** Whose profile card is open. */
  profile: string | null;
  /** The whisper window: open / folded down, and whose conversation (null: the list). */
  dm: { open: boolean; min: boolean; with: string | null };
  /** Something to tell me (a refused whisper, an expired invite…). */
  notice: string;
}

const sb = () => supabase!;
const me = () => useMoa.getState().me.id;
/** A supabase-js result's data, or its error thrown. */
const must = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

const fresh = (): Social => ({
  people: {},
  friends: [],
  blocks: [],
  dms: [],
  invites: [],
  space: null,
  rooms: [],
  dmPolicy: 'all',
  profile: null,
  dm: { open: false, min: false, with: null },
  notice: '',
});
export const useSocial = create<Social>()(fresh);
const set = useSocial.setState;
const get = useSocial.getState;
const tell = (notice: string) => set({ notice });

/** Fetch whoever of these I don't know yet (nickname, look). */
async function meet(ids: (string | null | undefined)[]) {
  const known = get().people;
  const missing = [...new Set(ids)].filter((id): id is string => !!id && !known[id]);
  if (!missing.length) return;
  const rows = must(await sb().from('profiles').select('id, nickname, look').in('id', missing)) as Person[];
  set((s) => ({ people: { ...s.people, ...Object.fromEntries(rows.map((p) => [p.id, p])) } }));
}

const upsert = <T extends { id: string }>(list: T[], row: T) =>
  list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];

/** A whisper to me in another language: translate it into mine and keep that with it (shown as it lands). */
async function readable(dm: Dm) {
  const { lang, autoTranslate } = useMoa.getState();
  if (dm.to_id !== me() || !autoTranslate || !dm.lang || dm.lang === lang || dm.translation_lang === lang) return;
  try {
    const translation = await translate(dm.body, lang);
    if (translation === dm.body) return;
    const row = { ...dm, translation, translation_lang: lang };
    set((s) => ({ dms: upsert(s.dms, row) }));
    await sb().from('direct_messages').update({ translation, translation_lang: lang }).eq('id', dm.id);
  } catch {
    // no translation: the original stays
  }
}

/**
 * Everything social for the signed-in account: loaded once, then kept live on
 * my own channel (new whispers, invites, friend requests). Returns a stop function.
 */
export function startSocial() {
  const id = me();
  let live = true;
  let ch: RealtimeChannel | undefined;
  set(fresh()); // a different account than before, maybe
  void (async () => {
    const [friends, blocks, dms, invites, space, profile] = await Promise.all([
      sb().from('friends').select('from_id, to_id, accepted'),
      sb().from('blocks').select('blocked'),
      sb().from('direct_messages').select('*').order('created_at').limit(500),
      sb().from('invites').select('*').eq('to_id', id).eq('status', 'pending').gt('expires_at', new Date().toISOString()),
      sb().from('spaces').select('owner_id, name, theme_id, visibility').eq('owner_id', id).maybeSingle(),
      sb().from('profiles').select('dm_policy').eq('id', id).maybeSingle(),
    ]);
    if (!live) return;
    set({
      friends: must(friends) as FriendRow[],
      blocks: (must(blocks) as { blocked: string }[]).map((b) => b.blocked),
      dms: must(dms) as Dm[],
      invites: must(invites) as InviteRow[],
      space: must(space) as Space | null,
      dmPolicy: (must(profile) as { dm_policy: DmPolicy } | null)?.dm_policy ?? 'all',
    });
    useMoa.getState().setSpaceName(get().space?.name ?? '');
    const s = get();
    await meet([...s.friends.flatMap((f) => [f.from_id, f.to_id]), ...s.blocks, ...s.dms.flatMap((d) => [d.from_id, d.to_id]), ...s.invites.map((i) => i.from_id)]);
    s.dms.forEach((d) => void readable(d));
    void loadRooms();
  })().catch((e) => console.warn('[moa] social not loaded:', e.message));

  const wire = (c: RealtimeChannel) =>
    c
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, ({ new: row }) => {
        const dm = row as Dm;
        if (!dm.id) return;
        set((s) => ({ dms: upsert(s.dms, dm) }));
        void meet([dm.from_id, dm.to_id]);
        void readable(dm);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invites' }, ({ new: row }) => {
        const inv = row as InviteRow;
        if (inv.to_id !== id) return;
        void meet([inv.from_id]).then(() => {
          set((s) => ({ invites: upsert(s.invites, inv) }));
          showInvite(inv);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, ({ new: row }) => {
        const f = row as FriendRow;
        if (!f.from_id) return;
        void meet([f.from_id, f.to_id]);
        set((s) => ({ friends: [...s.friends.filter((x) => !(x.from_id === f.from_id && x.to_id === f.to_id)), f] }));
      });
  // my own channel (after any earlier one has fully left: see link.ts)
  void settled()
    .then(() => sb().realtime.setAuth())
    .then(() => {
      if (live) ch = wire(sb().channel(`user:${id}`, { config: { private: true } })).subscribe();
    });
  return () => {
    live = false;
    if (ch) leave(ch);
  };
}

/** Pop an invite up as the toast (the store's invite: accepting goes through the server). */
function showInvite(inv: InviteRow) {
  const from = get().people[inv.from_id]?.nickname ?? '누군가';
  useMoa.getState().setInvite({ id: inv.id, from, room: { id: inv.place, name: inv.place_name, listed: inv.place.startsWith('room:') }, themeId: inv.theme_id });
}

// ── people ──────────────────────────────────────────────────────────────────
export const friendOf = (s: Pick<Social, 'friends'>, other: string) =>
  s.friends.find((f) => (f.from_id === other && f.to_id === me()) || (f.to_id === other && f.from_id === me()));

/** 'friend' | 'asked' (I asked them) | 'asking' (they asked me) | null */
export function friendship(s: Pick<Social, 'friends'>, other: string) {
  const f = friendOf(s, other);
  return !f ? null : f.accepted ? 'friend' : f.from_id === me() ? 'asked' : 'asking';
}

export async function addFriend(other: string) {
  const f = friendOf(get(), other);
  if (f && !f.accepted && f.to_id === me()) return acceptFriend(other); // they asked first: that's a yes
  if (f) return;
  try {
    must(await sb().from('friends').insert({ to_id: other }));
    set((s) => ({ friends: [...s.friends, { from_id: me(), to_id: other, accepted: false }] }));
  } catch {
    tell('친구 요청을 보낼 수 없어요.');
  }
}

export async function acceptFriend(other: string) {
  must(await sb().from('friends').update({ accepted: true }).eq('from_id', other).eq('to_id', me()));
  set((s) => ({ friends: s.friends.map((f) => (f.from_id === other && f.to_id === me() ? { ...f, accepted: true } : f)) }));
}

/** Unfriend, decline, or take back a request. */
export async function dropFriend(other: string) {
  must(await sb().from('friends').delete().or(`and(from_id.eq.${other},to_id.eq.${me()}),and(from_id.eq.${me()},to_id.eq.${other})`));
  set((s) => ({ friends: s.friends.filter((f) => f !== friendOf(s, other)) }));
}

export async function block(other: string) {
  must(await sb().from('blocks').insert({ blocked: other }));
  set((s) => ({ blocks: [...s.blocks, other], friends: s.friends.filter((f) => f !== friendOf(s, other)) }));
}

export async function unblock(other: string) {
  must(await sb().from('blocks').delete().eq('blocked', other));
  set((s) => ({ blocks: s.blocks.filter((b) => b !== other) }));
}

/** People by nickname (for invites), not me. */
export async function search(q: string): Promise<Person[]> {
  const term = q.trim().replace(/[%_,()]/g, '');
  if (!term) return [];
  const rows = must(await sb().from('profiles').select('id, nickname, look').ilike('nickname', `%${term}%`).neq('id', me()).limit(10)) as Person[];
  set((s) => ({ people: { ...s.people, ...Object.fromEntries(rows.map((p) => [p.id, p])) } }));
  return rows;
}

// ── whispers ────────────────────────────────────────────────────────────────
export const openDm = (withId: string | null) => set({ dm: { open: true, min: false, with: withId }, profile: null });

export async function sendDm(to: string, body: string) {
  const text = body.trim();
  if (!text) return;
  try {
    const row = must(await sb().from('direct_messages').insert({ to_id: to, body: text, lang: langOf(text) }).select().single()) as Dm;
    set((s) => ({ dms: upsert(s.dms, row) }));
  } catch {
    tell(`${get().people[to]?.nickname ?? '상대'}님은 지금 귓속말을 받지 않아요.`);
  }
}

/** I've seen their whispers. */
export async function markRead(from: string) {
  const unread = get().dms.filter((d) => d.from_id === from && d.to_id === me() && !d.read_at);
  if (!unread.length) return;
  const read_at = new Date().toISOString();
  set((s) => ({ dms: s.dms.map((d) => (unread.includes(d) ? { ...d, read_at } : d)) }));
  await sb().from('direct_messages').update({ read_at }).in('id', unread.map((d) => d.id));
}

/** What to show for a whisper: my language when there's a translation, and the original under it. */
export function shown(dm: Dm): { text: string; original?: string } {
  const { lang, autoTranslate } = useMoa.getState();
  return autoTranslate && dm.to_id === me() && dm.translation && dm.translation_lang === lang ? { text: dm.translation, original: dm.body } : { text: dm.body };
}

// ── settings & my space ─────────────────────────────────────────────────────
export async function saveSettings(patch: Partial<Settings>) {
  if ('dm_policy' in patch) set({ dmPolicy: patch.dm_policy! });
  if (supabase) await sb().from('profiles').update(patch).eq('id', me());
}

export async function saveSpace(patch: Partial<Omit<Space, 'owner_id'>>) {
  const space = must(await sb().from('spaces').update({ ...patch, updated_at: new Date().toISOString() }).eq('owner_id', me()).select('owner_id, name, theme_id, visibility').single()) as Space;
  set({ space });
  useMoa.getState().setSpaceName(space.name);
}

// ── places: entering, invites, rooms ────────────────────────────────────────
/** Would the server let me into this place right now? */
export async function canEnter(place: string) {
  return !!must(await sb().rpc('can_enter', { p_place: place }));
}

/** Invite someone (or, with `to` null, make a link valid for a day). Returns the invite's id. */
export async function invite(place: string, placeName: string, themeId: ThemeId, to: string | null): Promise<string | null> {
  const expires_at = new Date(Date.now() + (to ? 3600_000 : 86400_000)).toISOString();
  try {
    const row = must(await sb().from('invites').insert({ place, place_name: placeName, theme_id: themeId, to_id: to, expires_at }).select('id').single()) as { id: string };
    return row.id;
  } catch {
    tell(to ? '여기로는 초대할 수 없어요.' : '초대 링크를 만들 수 없어요.');
    return null;
  }
}

/** Take up an invite: the server hands back where it leads (then I go there), or it's no good any more. */
export async function acceptInvite(id: string): Promise<{ place: string; place_name: string; theme_id: ThemeId } | null> {
  set((s) => ({ invites: s.invites.filter((i) => i.id !== id) }));
  const { data, error } = await sb().rpc('accept_invite', { p_invite: id });
  const row = (data as { place: string; place_name: string; theme_id: ThemeId }[] | null)?.[0];
  if (error || !row) {
    tell('만료됐거나 더 이상 쓸 수 없는 초대예요.');
    return null;
  }
  return row;
}

export async function declineInvite(id: string) {
  set((s) => ({ invites: s.invites.filter((i) => i.id !== id) }));
  await sb().from('invites').update({ status: 'declined' }).eq('id', id);
}

export async function loadRooms() {
  set({ rooms: must(await sb().from('rooms').select('id, owner_id, name, description, theme_id, max_members, visibility, locked').order('created_at')) as RoomRow[] });
  await meet(get().rooms.map((r) => r.owner_id));
}

/** Make a room (no id) or change mine. Returns its id. */
export async function saveRoom(r: RoomSetup, id: string | null = null): Promise<string> {
  const rid = must(
    await sb().rpc('save_room', { p_room: id, p_name: r.name, p_description: r.description, p_theme: r.theme, p_max: r.max, p_visibility: r.visibility, p_password: r.password }),
  ) as string;
  await loadRooms();
  return rid;
}

/** Knock: true when I may go in (open, or the right password). */
export async function enterRoom(id: string, password: string | null) {
  return !!must(await sb().rpc('enter_room', { p_room: id, p_password: password }));
}

export async function closeRoom(id: string) {
  must(await sb().from('rooms').delete().eq('id', id));
  set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) }));
}

/** As this place's owner, send someone out (they're kept out for 30 minutes). */
export async function kick(place: string, user: string) {
  must(await sb().rpc('kick', { p_place: place, p_user: user }));
}
