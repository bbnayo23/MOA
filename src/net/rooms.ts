import type { ThemeId } from '../data/themes';
import type { Presence } from './link';

/**
 * A room: the people in the same one share the world (every space in it), and
 * only see each other. Everyone starts in their own space; a room made with
 * 방 만들기 shows on the room list, your own space only by invitation.
 */
export interface Room {
  /** Its realtime topic: 'space:<owner id>' (someone's own space) or 'room:<room id>' (a group room). */
  id: string;
  name: string;
  /** On the room list. */
  listed: boolean;
  /** How many fit (default ROOM_MAX). */
  max?: number;
}

export const ROOM_MAX = 10;

/** Your own space (its name, when you've given it one). */
export const ownRoom = (me: { id: string; nickname: string }, name?: string): Room => ({
  id: `space:${me.id}`,
  name: name || `${me.nickname}의 공간`,
  listed: false,
});

/** Whose space this is (null: a group room). */
export const spaceOwner = (room: Pick<Room, 'id'>) => (room.id.startsWith('space:') ? room.id.slice(6) : null);

export interface RoomInfo extends Room {
  /** Who's in it, first to arrive first (the first is the host). */
  members: Presence[];
  /** The space most of them are in: where you land when you join. */
  themeId: ThemeId;
}

const arrival = (a: Presence, b: Presence) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1);

function mostCommon<T>(xs: T[]): T {
  const n = new Map<T, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0][0]; // ties: the earlier arrival's
}

/** The rooms people are in right now, oldest first (a room is open while anyone's in it). */
export function roomsOf(everyone: Presence[]): RoomInfo[] {
  const byId = new Map<string, Presence[]>();
  for (const p of [...everyone].sort(arrival)) byId.set(p.room.id, [...(byId.get(p.room.id) ?? []), p]);
  return [...byId.values()].map((members) => ({ ...members[0].room, members, themeId: mostCommon(members.map((m) => m.themeId)) }));
}

/** Past the limit (two took the last seat at once), the later arrivals have to go. */
export const bumped = (room: RoomInfo, id: string) => room.members.findIndex((m) => m.id === id) >= (room.max ?? ROOM_MAX);
