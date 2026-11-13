import { useState, type FormEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { roomsOf, ROOM_MAX, type RoomInfo } from '../net/rooms';
import { presenceOf, roomOf, useMoa } from '../store';

/** The rooms people are in right now (me included), and mine among them. */
export function useRoomList() {
  // re-render when any of these change; the list itself is worked out from them
  useMoa(useShallow((st) => [st.peers, st.room, st.me, st.themeId, st.joinedAt]));
  const s = useMoa.getState();
  const rooms = roomsOf([...s.peers, presenceOf(s)]);
  return { rooms, here: rooms.find((r) => r.id === roomOf(s).id)! };
}

/** The room list panel: join a listed room, make one, or go back to my own space. */
export function useLobby(close: () => void) {
  const { rooms, here } = useRoomList();
  const room = useMoa((st) => st.room);
  const nickname = useMoa((st) => st.me.nickname);
  const [name, setName] = useState('');
  const st = useMoa.getState();
  return {
    here,
    inOwnSpace: !room,
    rooms: rooms.filter((r) => r.listed).map((r) => ({ ...r, mine: r.id === here.id, full: r.members.length >= ROOM_MAX })),
    name,
    setName,
    placeholder: `${nickname}의 방`,
    create: (e: FormEvent) => {
      e.preventDefault();
      st.createRoom(name.trim() || `${nickname}의 방`);
      setName('');
      close();
    },
    join: (r: RoomInfo) => {
      st.joinRoom(r, r.themeId);
      close();
    },
    leave: () => st.setRoom(null),
  };
}
