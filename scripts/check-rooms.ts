// Runnable check for rooms (grouping, where you land, the 10-person limit): `pnpm check`
import assert from 'node:assert/strict';
import type { Presence } from '../src/net/link.ts';
import { bumped, ownRoom, roomsOf, ROOM_MAX } from '../src/net/rooms.ts';

const party = { id: 'r1', name: '같이 놀자', listed: true };
const p = (id: string, joinedAt: number, themeId: Presence['themeId'], room = party): Presence =>
  ({ id, nickname: id, look: {} as Presence['look'], themeId, room, joinedAt });

const rooms = roomsOf([
  p('c', 3, 'pool'),
  p('a', 1, 'plaza'),
  p('solo', 0, 'library', ownRoom({ id: 'solo', nickname: '혼자' })),
  p('b', 2, 'pool'),
]);
assert.deepEqual(rooms.map((r) => r.id), ['solo', 'r1'], 'oldest room first');
const r1 = rooms[1];
assert.deepEqual(r1.members.map((m) => m.id), ['a', 'b', 'c'], 'members by arrival (host first)');
assert.equal(r1.themeId, 'pool', 'you land where most of them are');
assert.equal(r1.name, '같이 놀자');
assert.equal(rooms[0].listed, false, 'your own space is not on the list');

// two people take the 10th seat at once: the later one goes
const full = roomsOf(Array.from({ length: ROOM_MAX + 1 }, (_, i) => p(`m${i}`, i, 'plaza')))[0];
assert.ok(!bumped(full, 'm9') && bumped(full, 'm10'));

console.log('room rules ok');
