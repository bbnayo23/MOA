import { useEffect, useState, type FormEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toGame } from '../bridge';
import { HUB, THEME_CONFIGS, type ThemeId } from '../data/themes';
import { roomsOf, ROOM_MAX } from '../net/rooms';
import { closeRoom, enterRoom, loadRooms, saveRoom, useSocial, type RoomSetup } from '../net/social';
import { supabase } from '../net/supabase';
import { presenceOf, roomOf, useMoa } from '../store';

/** The rooms people are in right now (me included), and mine among them. */
export function useRoomList() {
  // re-render when any of these change; the list itself is worked out from them
  useMoa(useShallow((st) => [st.peers, st.room, st.me, st.themeId, st.joinedAt, st.spaceName, st.lang]));
  const s = useMoa.getState();
  const rooms = roomsOf([...s.peers, presenceOf(s)]);
  return { rooms, here: rooms.find((r) => r.id === roomOf(s).id)! };
}

const blank = (): RoomSetup => ({ name: '', description: '', theme: HUB, max: ROOM_MAX, visibility: 'public', password: '' });

/**
 * The room list panel: who's here, the open rooms (made rooms from the server,
 * with how many are in each right now), making one, and — in my own room — its settings.
 */
export function useLobby(close: () => void) {
  const { rooms: live, here } = useRoomList();
  const room = useMoa((st) => st.room);
  const nickname = useMoa((st) => st.me.nickname);
  const myId = useMoa((st) => st.me.id);
  const saved = useSocial((s) => s.rooms);
  const people = useSocial((s) => s.people);
  const [form, setForm] = useState<RoomSetup>(blank);
  const [editing, setEditing] = useState(false);
  const [knock, setKnock] = useState<{ id: string; password: string; wrong: boolean } | null>(null);
  const [error, setError] = useState('');
  const st = useMoa.getState();
  const server = !!supabase;
  useEffect(() => void (server && loadRooms().catch(() => {})), [server]);

  const mine = saved.find((r) => `room:${r.id}` === here.id && r.owner_id === myId);
  // made rooms (listed ones and mine) with who's in them now, then rooms only presence knows (no server)
  const rows = [
    ...saved
      .filter((r) => r.visibility === 'public' || r.owner_id === myId)
      .map((r) => {
        const now = live.find((x) => x.id === `room:${r.id}`);
        return { id: `room:${r.id}`, name: r.name, description: r.description, themeId: now?.themeId ?? r.theme_id, max: r.max_members, locked: r.locked && r.owner_id !== myId, host: people[r.owner_id]?.nickname ?? '…', count: now?.members.length ?? 0, listed: r.visibility === 'public', ownedByMe: r.owner_id === myId };
      })
      .filter((r) => r.count > 0 || r.ownedByMe),
    ...live
      .filter((r) => r.listed && !saved.some((x) => `room:${x.id}` === r.id))
      .map((r) => ({ id: r.id, name: r.name, description: '', themeId: r.themeId, max: r.max ?? ROOM_MAX, locked: false, host: r.members[0].nickname, count: r.members.length, listed: true, ownedByMe: false })),
  ];

  const go = (r: { id: string; name: string; listed: boolean; max: number }, themeId: ThemeId) => {
    st.joinRoom({ id: r.id, name: r.name, listed: r.listed, max: r.max }, THEME_CONFIGS[themeId] ? themeId : HUB);
    close();
  };

  return {
    here,
    max: here.max ?? mine?.max_members ?? ROOM_MAX,
    inOwnSpace: !room,
    server,
    members: here.members.filter((m) => m.id !== myId),
    rooms: rows.map((r) => ({ ...r, mine: r.id === here.id, full: r.count >= r.max })),
    knock,
    setKnockPassword: (password: string) => knock && setKnock({ ...knock, password, wrong: false }),
    join: async (r: (typeof rows)[number]) => {
      if (!server) return go(r, r.themeId);
      if (r.locked && knock?.id !== r.id) return setKnock({ id: r.id, password: '', wrong: false });
      const ok = await enterRoom(r.id.slice(5), r.locked ? knock!.password : null).catch(() => false);
      if (!ok) return setKnock({ id: r.id, password: '', wrong: true });
      setKnock(null);
      go(r, r.themeId);
    },
    leave: () => st.setRoom(null),
    profile: (id: string) => useSocial.setState({ profile: id }),
    form,
    setForm: (patch: Partial<RoomSetup>) => setForm({ ...form, ...patch }),
    placeholder: `${nickname}의 방`,
    error,
    /** Settings for my own room (the form, filled in). */
    mine: !!mine,
    editing,
    edit: () => {
      if (!mine) return;
      setForm({ name: mine.name, description: mine.description, theme: mine.theme_id, max: mine.max_members, visibility: mine.visibility, password: null });
      setEditing(true);
    },
    cancel: () => {
      setForm(blank());
      setEditing(false);
    },
    submit: async (e: FormEvent) => {
      e.preventDefault();
      const setup = { ...form, name: form.name.trim() || `${nickname}의 방`, description: form.description.trim() };
      setError('');
      if (!server) {
        st.createRoom(setup.name);
        return close();
      }
      try {
        const id = await saveRoom(setup, editing ? mine!.id : null);
        if (!editing) go({ id: `room:${id}`, name: setup.name, listed: setup.visibility === 'public', max: setup.max }, setup.theme);
        else setEditing(false);
        setForm(blank());
      } catch {
        setError('방을 저장하지 못했어요. 잠시 뒤에 다시 해 주세요.');
      }
    },
    /** Close my room: everyone in it goes home (the server lets no one back in). */
    closeRoom: async () => {
      if (!mine) return;
      for (const m of here.members) if (m.id !== myId) toGame.emit('kick', m.id);
      await closeRoom(mine.id);
      st.setRoom(null);
      setEditing(false);
      close();
    },
  };
}
