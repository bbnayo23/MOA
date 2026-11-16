import { useEffect, useState, type FormEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toGame } from '../bridge';
import type { GameId } from '../data/games';
import { HUB, THEME_CONFIGS, type ThemeId } from '../data/themes';
import { ask } from '../games/session';
import { ownRoom, spaceOwner, type Room } from '../net/rooms';
import {
  acceptFriend,
  acceptInvite,
  addFriend,
  block,
  canEnter,
  declineInvite,
  dropFriend,
  friendship,
  invite,
  kick,
  markRead,
  openDm,
  saveSettings,
  saveSpace,
  search,
  sendDm,
  shown,
  unblock,
  useSocial,
  type DmPolicy,
  type Person,
  type Visibility,
} from '../net/social';
import { supabase } from '../net/supabase';
import type { Lang } from '../net/translate';
import { roomOf, useMoa } from '../store';
import { accountId, claimAccount, ID_RULE, logOut } from './useAccount';

const close = () => useSocial.setState({ profile: null });

/** Who this is: online (where they are) or someone I know of. */
export function usePerson(id: string | null) {
  const peer = useMoa((st) => st.peers.find((p) => p.id === id));
  const known = useSocial((s) => (id ? s.people[id] : undefined));
  if (!id) return null;
  if (peer) return { ...peer, online: true as const };
  return known ? { ...known, online: false as const, room: null, themeId: null } : null;
}

/** The owner of the place I'm in (a space's owner, a room's maker). */
export function usePlaceOwner() {
  const room = useMoa(useShallow((st) => roomOf(st)));
  const rooms = useSocial((s) => s.rooms);
  return spaceOwner(room) ?? rooms.find((r) => `room:${r.id}` === room.id)?.owner_id ?? null;
}

/** May I invite people into the place I'm in? (the server checks again) */
function useCanInviteHere() {
  const room = useMoa(useShallow((st) => roomOf(st)));
  const myId = useMoa((st) => st.me.id);
  const mySpace = useSocial((s) => s.space);
  if (!supabase) return true;
  const owner = spaceOwner(room);
  if (!owner) return true; // a room: anyone in it
  return owner === myId && mySpace?.visibility !== 'private';
}

/** Ask someone into the place I'm in. */
export async function inviteHere(p: { id: string; nickname: string }) {
  const s = useMoa.getState();
  const here = roomOf(s);
  if (!supabase) toGame.emit('invite', p.id);
  else if (!(await invite(here.id, here.name, s.themeId ?? HUB, p.id))) return;
  s.system(`💌 ${p.nickname}님을 ${here.name}에 초대했어요.`);
}

/** Go to someone's own space, if the server will have me. */
async function visitSpace(p: { id: string; nickname: string; room?: Room | null; themeId?: ThemeId | null }) {
  const place = `space:${p.id}`;
  const s = useMoa.getState();
  if (supabase && !(await canEnter(place).catch(() => false))) {
    useSocial.setState({ notice: `🔒 ${p.nickname}님의 공간은 지금 들어갈 수 없어요 (공개 범위).` });
    return;
  }
  // into the space they're in, if they're home; their plaza otherwise
  const home = p.room?.id === place;
  s.joinRoom({ id: place, name: home ? p.room!.name : ownRoom(p).name, listed: false }, home && p.themeId ? p.themeId : HUB);
}

/** The card that opens on someone's character / name: whisper, friend, visit, invite, send out, block. */
export function useProfileCard() {
  const id = useSocial((s) => s.profile);
  const p = usePerson(id);
  const myId = useMoa((st) => st.me.id);
  const here = useMoa(useShallow((st) => roomOf(st)));
  const owner = usePlaceOwner();
  const canInvite = useCanInviteHere();
  const { friends, blocked } = useSocial(useShallow((s) => ({ friends: s.friends, blocked: !!id && s.blocks.includes(id) })));
  if (!id || !p || id === myId) return null;
  const server = !!supabase;
  const inMyPlace = p.online && p.room?.id === here.id;
  return {
    p,
    server,
    blocked,
    friend: server ? friendship({ friends }, id) : null,
    where: p.online ? (inMyPlace ? '같은 곳에 있어요' : p.room?.listed ? `${p.room.name}에 있어요` : '자기 공간에 있어요') : '오프라인',
    close,
    whisper: () => openDm(id),
    addFriend: () => void addFriend(id),
    acceptFriend: () => void acceptFriend(id),
    dropFriend: () => void dropFriend(id),
    visit: () => {
      close();
      void visitSpace(p);
    },
    canInvite: canInvite && !inMyPlace,
    invite: () => {
      close();
      void inviteHere(p);
    },
    canKick: server && owner === myId && inMyPlace,
    kick: async () => {
      close();
      await kick(here.id, id);
      toGame.emit('kick', id);
      useMoa.getState().system(`👢 ${p.nickname}님을 내보냈어요 (30분 동안 못 들어와요).`);
    },
    toggleBlock: () => void (blocked ? unblock(id) : block(id)),
    // here with me: ask them to a game (opens my table for it)
    canAsk: inMyPlace && !blocked,
    challenge: (game: GameId) => {
      close();
      if (!ask(game, id)) useMoa.getState().system('🎲 하던 게임을 마치고 신청해 주세요.');
    },
  };
}

/** One conversation's lines, oldest first. */
const between = (dms: ReturnType<typeof useSocial.getState>['dms'], me: string, other: string) =>
  dms.filter((d) => (d.from_id === me && d.to_id === other) || (d.from_id === other && d.to_id === me));

/** Whispers waiting for me (not from people I've blocked). */
export function useUnread() {
  const myId = useMoa((st) => st.me.id);
  return useSocial((s) => s.dms.filter((d) => d.to_id === myId && !d.read_at && !s.blocks.includes(d.from_id)).length);
}

/** The floating whisper window: the list of conversations, or one of them. */
export function useWhispers() {
  const { dm, dms, people, blocks } = useSocial(useShallow((s) => ({ dm: s.dm, dms: s.dms, people: s.people, blocks: s.blocks })));
  const myId = useMoa((st) => st.me.id);
  useMoa(useShallow((st) => [st.lang, st.autoTranslate])); // shown() reads them
  const [text, setText] = useState('');
  const unread = useUnread();
  const lines = dm.with ? between(dms, myId, dm.with) : [];
  const seeing = dm.open && !dm.min && dm.with;
  useEffect(() => {
    if (seeing) void markRead(seeing);
  }, [seeing, lines.length]);

  const partners = new Map<string, { last: (typeof dms)[number]; unread: number }>();
  for (const d of dms) {
    const other = d.from_id === myId ? d.to_id : d.from_id;
    if (blocks.includes(other)) continue;
    const was = partners.get(other);
    partners.set(other, { last: d, unread: (was?.unread ?? 0) + (d.to_id === myId && !d.read_at ? 1 : 0) });
  }
  const set = (patch: Partial<typeof dm>) => useSocial.setState({ dm: { ...dm, ...patch } });
  return {
    ...dm,
    unread,
    name: (id: string) => people[id]?.nickname ?? '…',
    look: (id: string) => people[id]?.look,
    conversations: [...partners].sort((a, b) => b[1].last.created_at.localeCompare(a[1].last.created_at)).map(([id, c]) => ({ id, ...c, preview: shown(c.last).text })),
    lines: lines.map((d) => ({ id: d.id, mine: d.from_id === myId, ...shown(d) })),
    pick: (id: string | null) => set({ with: id }),
    minimize: () => set({ min: !dm.min }),
    close: () => set({ open: false }),
    text,
    setText,
    send: (e: FormEvent) => {
      e.preventDefault();
      if (dm.with) void sendDm(dm.with, text);
      setText('');
    },
  };
}

/** 🔔: invites and friend requests waiting for me. */
export function useAlerts() {
  const myId = useMoa((st) => st.me.id);
  const { invites, friends, people } = useSocial(useShallow((s) => ({ invites: s.invites, friends: s.friends, people: s.people })));
  const now = Date.now();
  const open = invites.filter((i) => Date.parse(i.expires_at) > now);
  const requests = friends.filter((f) => f.to_id === myId && !f.accepted);
  return {
    count: open.length + requests.length,
    invites: open.map((i) => ({ ...i, from: people[i.from_id]?.nickname ?? '누군가' })),
    requests: requests.map((f) => ({ id: f.from_id, nickname: people[f.from_id]?.nickname ?? '누군가' })),
    accept: (id: string) => void takeInvite(id),
    decline: (id: string) => void declineInvite(id),
    befriend: (id: string) => void acceptFriend(id),
    refuse: (id: string) => void dropFriend(id),
  };
}

/** Accept an invite (the server's pass), then go there. */
export async function takeInvite(id: string) {
  const s = useMoa.getState();
  s.setInvite(null);
  const to = await acceptInvite(id);
  if (to) s.joinRoom({ id: to.place, name: to.place_name, listed: to.place.startsWith('room:') }, THEME_CONFIGS[to.theme_id] ? to.theme_id : HUB);
}

/** 친구 초대: friends, people online, or anyone found by name → into the place I'm in; or a link. */
export function useInvitePanel() {
  const myId = useMoa((st) => st.me.id);
  const here = useMoa(useShallow((st) => roomOf(st)));
  const themeId = useMoa((st) => st.themeId);
  const peers = useMoa((st) => st.peers);
  const { friends, people, blocks } = useSocial(useShallow((s) => ({ friends: s.friends, people: s.people, blocks: s.blocks })));
  const allowed = useCanInviteHere();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Person[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [link, setLink] = useState('');
  useEffect(() => {
    if (!supabase || !q.trim()) return setFound([]);
    const t = setTimeout(() => void search(q).then(setFound, () => setFound([])), 300);
    return () => clearTimeout(t);
  }, [q]);

  const list = new Map<string, { id: string; nickname: string; note: string }>();
  for (const f of friends) {
    const id = f.from_id === myId ? f.to_id : f.from_id;
    if (f.accepted && people[id]) list.set(id, { id, nickname: people[id].nickname, note: '친구' });
  }
  for (const p of peers) if (p.room.id !== here.id) list.set(p.id, { id: p.id, nickname: p.nickname, note: list.has(p.id) ? '친구 · 온라인' : '온라인' });
  const shownList = (q.trim() ? found.map((p) => ({ id: p.id, nickname: p.nickname, note: '' })) : [...list.values()]).filter(
    (p) => p.id !== myId && !blocks.includes(p.id) && !peers.some((x) => x.id === p.id && x.room.id === here.id),
  );
  return {
    here,
    allowed,
    server: !!supabase,
    q,
    setQ,
    people: shownList.map((p) => ({ ...p, sent: sent.includes(p.id) })),
    invite: (p: { id: string; nickname: string }) => {
      setSent([...sent, p.id]);
      void inviteHere(p);
    },
    link,
    makeLink: async () => {
      const id = await invite(here.id, here.name, themeId ?? HUB, null);
      if (!id) return;
      const url = `${location.origin}${location.pathname}?invite=${id}`;
      setLink(url);
      await navigator.clipboard?.writeText(url).catch(() => {});
    },
  };
}

/** ⚙️ 설정: language & translation, whispers, my space, blocked people, account. */
export function useSettings() {
  const { lang, autoTranslate, nickname } = useMoa(useShallow((st) => ({ lang: st.lang, autoTranslate: st.autoTranslate, nickname: st.me.nickname })));
  const { dmPolicy, space, blocks, people } = useSocial(useShallow((s) => ({ dmPolicy: s.dmPolicy, space: s.space, blocks: s.blocks, people: s.people })));
  const [draft, setDraft] = useState<{ name: string; theme: ThemeId; visibility: Visibility } | null>(null);
  const [account, setAccount] = useState<string | null | undefined>(undefined);
  const [claim, setClaim] = useState({ id: '', password: '', error: '' });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void supabase?.auth.getSession().then(({ data }) => setAccount(accountId(data.session?.user.email)));
  }, []);
  const mine = draft ?? (space ? { name: space.name, theme: space.theme_id, visibility: space.visibility } : null);
  const st = useMoa.getState();
  return {
    server: !!supabase,
    lang,
    setLang: (l: Lang) => {
      st.setLang(l);
      void saveSettings({ lang: l });
    },
    autoTranslate,
    setAutoTranslate: (on: boolean) => {
      st.setAutoTranslate(on);
      void saveSettings({ auto_translate: on });
    },
    dmPolicy,
    setDmPolicy: (p: DmPolicy) => void saveSettings({ dm_policy: p }),
    space: mine,
    placeholder: `${nickname}의 공간`,
    editSpace: (patch: Partial<NonNullable<typeof mine>>) => {
      setSaved(false);
      setDraft({ ...mine!, ...patch });
    },
    saved,
    saveSpace: async (e: FormEvent) => {
      e.preventDefault();
      if (!mine) return;
      await saveSpace({ name: mine.name.trim(), theme_id: mine.theme, visibility: mine.visibility });
      setDraft(null);
      setSaved(true);
    },
    goHome: () => st.setRoom(null),
    blocked: blocks.map((id) => ({ id, nickname: people[id]?.nickname ?? '…' })),
    unblock: (id: string) => void unblock(id),
    account,
    claim,
    setClaim: (patch: Partial<typeof claim>) => setClaim({ ...claim, ...patch, error: '' }),
    makeAccount: async (e: FormEvent) => {
      e.preventDefault();
      const id = claim.id.trim().toLowerCase();
      if (!ID_RULE.test(id)) return setClaim({ ...claim, error: '아이디는 영문 소문자·숫자·_ 3~20자로 해 주세요.' });
      const error = await claimAccount(id, claim.password);
      if (error) setClaim({ ...claim, error });
      else setAccount(id);
    },
    logOut: () => void logOut(),
  };
}
