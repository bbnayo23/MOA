// Runnable check for who may do what on the server (supabase/migrations): `pnpm check`
// Runs the migrations on PGlite in a Supabase-like shell (roles, auth.uid(), realtime.topic()),
// then walks through the permission rules as three different people.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const MIG = new URL('../supabase/migrations/', import.meta.url);
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema realtime;
  create table realtime.messages (id serial primary key, topic text, extension text, payload jsonb);
  alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
  create schema extensions;
  create publication supabase_realtime;
  grant usage on schema public, auth, realtime, extensions to anon, authenticated;
  grant select, insert on realtime.messages to authenticated;
  grant usage on sequence realtime.messages_id_seq to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);
// every migration, in order — as they're run in the Supabase SQL editor
for (const f of readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b', C = '00000000-0000-0000-0000-00000000000c';
for (const [id, n] of [[A, '에이'], [B, '비'], [C, '씨']]) {
  await db.query(`insert into auth.users values ($1)`, [id]);
}
// as a signed-in user (fresh transaction-less session settings each call)
const as = async (who: string, sql: string, params: unknown[] = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who}', false); set role authenticated;`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role;');
  }
};
const fails = async (who, sql, params, why) => {
  let err;
  try { await as(who, sql, params); } catch (e) { err = e; }
  assert.ok(err, `should fail: ${why}`);
  return err.message;
};
const can = async (who, place) => (await as(who, `select public.can_enter($1) ok`, [place]))[0].ok;
const out = [];
const ok = (msg) => out.push('✓ ' + msg);

// profiles are made by each user (RLS) → their space appears
for (const [id, n] of [[A, '에이'], [B, '비'], [C, '씨']]) await as(id, `insert into profiles (id, nickname, look) values ($1, $2, '{}')`, [id, n]);
assert.equal((await as(A, `select count(*)::int n from spaces`))[0].n, 3); ok('a space for everyone, from their first save');
assert.equal((await as(A, `select visibility from spaces where owner_id = $1`, [A]))[0].visibility, 'friends');

// friends-only space: B (not a friend) can't come in; A always can
assert.equal(await can(A, `space:${A}`), true);
assert.equal(await can(B, `space:${A}`), false); ok('friends-only space: a stranger is kept out');
const D = '00000000-0000-0000-0000-00000000000d'; // brand new: no profile (so no space row) yet
await db.query(`insert into auth.users values ($1)`, [D]);
assert.equal(await can(D, `space:${D}`), true);
assert.equal(await can(A, `space:${D}`), false); ok('my own space is mine from the very first moment');
// someone else can't invite into A's space; A can
await fails(C, `insert into invites (place, place_name, theme_id, to_id) values ($1, 'x', 'plaza', $2)`, [`space:${A}`, B], 'C invites into A\'s space');
const [inv] = await as(A, `insert into invites (place, place_name, theme_id, to_id) values ($1, '에이의 공간', 'plaza', $2) returning id`, [`space:${A}`, B]);
assert.equal((await as(C, `select count(*)::int n from invites`))[0].n, 0); ok('only the inviter and invitee see an invite');
await fails(C, `select * from public.accept_invite($1)`, [inv.id], 'C uses B\'s invite');
const [land] = await as(B, `select * from public.accept_invite($1)`, [inv.id]);
assert.deepEqual(land, { place: `space:${A}`, place_name: '에이의 공간', theme_id: 'plaza' });
assert.equal(await can(B, `space:${A}`), true); ok('accepting an invite lets them in');
await fails(B, `select * from public.accept_invite($1)`, [inv.id], 'an invite used twice'); ok('a personal invite works once');
await fails(B, `update invites set place = 'space:x' where id = $1`, [inv.id], 'invitee rewrites the place');

// private: the owner only, even with a pass; invites into it are refused
await as(A, `update spaces set visibility = 'private' where owner_id = $1`, [A]);
assert.equal(await can(B, `space:${A}`), false); ok('private space: the owner only, invite or not');
await fails(A, `insert into invites (place, place_name, theme_id, to_id) values ($1, 'x', 'plaza', $2)`, [`space:${A}`, C], 'invite into a private space');

// public, then kicked: out for a while
await as(A, `update spaces set visibility = 'public' where owner_id = $1`, [A]);
assert.equal(await can(C, `space:${A}`), true); ok('public space: anyone signed in');
await fails(C, `select public.kick($1, $2)`, [`space:${A}`, B], 'a visitor kicks someone');
await as(A, `select public.kick($1, $2)`, [`space:${A}`, B]);
assert.equal(await can(B, `space:${A}`), false); ok('the owner sends someone out: kept out (30 min)');

// friends: C asks, A accepts → C may come into a friends-only space
await as(A, `update spaces set visibility = 'friends' where owner_id = $1`, [A]);
assert.equal(await can(C, `space:${A}`), false);
await as(C, `insert into friends (to_id) values ($1)`, [A]);
// accepting my own request changes nothing (RLS: not addressed to me)
assert.equal((await as(C, `update friends set accepted = true where to_id = $1 returning *`, [A])).length, 0);
await as(A, `update friends set accepted = true where from_id = $1`, [C]);
assert.equal(await can(C, `space:${A}`), true); ok('friends get into a friends-only space');

// whispers: only the two of them; a closed inbox or a block stops them
await as(A, `insert into direct_messages (to_id, body, lang) values ($1, '안녕 비', 'ko')`, [B]);
assert.equal((await as(B, `select body from direct_messages`)).length, 1);
assert.equal((await as(C, `select body from direct_messages`)).length, 0); ok('a whisper reaches only its two people');
await fails(C, `insert into direct_messages (from_id, to_id, body) values ($1, $2, '사칭')`, [A, B], 'whisper as someone else');
await as(B, `update direct_messages set translation = 'Hi B', translation_lang = 'en', read_at = now()`);
await fails(B, `update direct_messages set body = '바꿈'`, [], 'rewrite a whisper');
assert.equal((await as(A, `select translation from direct_messages`))[0].translation, 'Hi B'); ok('the reader stores its translation; the text itself is fixed');
await as(B, `update profiles set dm_policy = 'none' where id = $1`, [B]);
await fails(A, `insert into direct_messages (to_id, body) values ($1, '또')`, [B], 'whisper to a closed inbox');
await as(B, `update profiles set dm_policy = 'friends' where id = $1`, [B]);
await fails(A, `insert into direct_messages (to_id, body) values ($1, '또')`, [B], 'whisper to friends-only from a non-friend'); ok('whisper settings: everyone / friends only / no one');
await as(C, `update profiles set dm_policy = 'all' where id = $1`, [C]);
await as(A, `insert into direct_messages (to_id, body) values ($1, '씨 안녕')`, [C]);
await as(C, `insert into blocks (blocked) values ($1)`, [A]);
await fails(A, `insert into direct_messages (to_id, body) values ($1, '왜')`, [C], 'whisper to someone who blocked me');
assert.equal((await as(A, `select count(*)::int n from friends where accepted`))[0].n, 0); ok('blocking stops whispers and ends the friendship');
assert.equal((await as(A, `select count(*)::int n from blocks`))[0].n, 0, 'the blocked can\'t see the block list');

// rooms: a password room, a private room; the hash never leaves the server
const [{ id: room }] = await as(A, `select public.save_room(null, '같이 놀자', '수다방', 'camping', 4, 'public', 'pw') id`);
assert.equal(await can(B, `room:${room}`), false);
assert.equal((await as(B, `select public.enter_room($1, 'nope') ok`, [room]))[0].ok, false);
assert.equal((await as(B, `select public.enter_room($1, 'pw') ok`, [room]))[0].ok, true);
assert.equal(await can(B, `room:${room}`), true); ok('password room: right password → in, wrong → not');
await fails(B, `select password_hash from rooms`, [], 'read the password hash');
assert.deepEqual((await as(B, `select name, locked, max_members from rooms`))[0], { name: '같이 놀자', locked: true, max_members: 4 }); ok('room list shows a lock, never the hash');
await fails(B, `select public.save_room($1, 'mine now', '', 'plaza', 10, 'public', '')`, [room], 'change someone else\'s room');
const [{ id: secret }] = await as(A, `select public.save_room(null, '비밀방', '', 'plaza', 10, 'private', null) id`);
assert.equal((await as(B, `select count(*)::int n from rooms where id = $1`, [secret]))[0].n, 0, 'a private room isn\'t listed');
assert.equal((await as(B, `select public.enter_room($1) ok`, [secret]))[0].ok, false); ok('private room: not listed, no way in without an invite');
const [inv2] = await as(A, `insert into invites (place, place_name, theme_id, to_id) values ($1, '비밀방', 'plaza', null) returning id`, [`room:${secret}`]);
await as(B, `select * from public.accept_invite($1)`, [inv2.id]);
await as(B, `select * from public.accept_invite($1)`, [inv2.id]); // a link works more than once
assert.equal(await can(B, `room:${secret}`), true); ok('invite link into a private room');
// anyone in a room may invite others into it
await as(B, `insert into invites (place, place_name, theme_id, to_id) values ($1, '같이 놀자', 'camping', $2)`, [`room:${room}`, C]);
ok('people in a room can invite others into it');

// the realtime policy itself: send into a place channel
const send = async (who, topic) => {
  await db.query(`select set_config('realtime.topic', $1, false)`, [topic]);
  return as(who, `insert into realtime.messages (topic) values ($1) returning id`, [topic]);
};
await send(B, `room:${room}`);
let denied = false;
await send(C, `room:${secret}`).catch(() => (denied = true));
assert.ok(denied, 'send into a room without access');
await send(C, 'moa:world');
ok('realtime: place channels only for those allowed; the world channel for every member');
// each person's own channel (whispers / invites arrive there): theirs alone
const listen = async (who: string, topic: string) => {
  await db.query(`select set_config('realtime.topic', $1, false)`, [topic]);
  return (await as(who, `select count(*)::int n from realtime.messages where topic = $1`, [topic]))[0].n;
};
await db.query(`insert into realtime.messages (topic) values ($1), ($2)`, [`user:${B}`, `user:${A}`]);
assert.equal(await listen(B, `user:${B}`), 1);
assert.equal(await listen(B, `user:${A}`), 0);
ok("a person's own channel is theirs alone");

// minigame matches: the server keeps a result only if it makes sense and the players agree
const age = (id: string, secs: number) => db.query(`update matches set started_at = now() - make_interval(secs => $2) where id = $1`, [id, secs]);
const report = async (who: string, id: string, scores: object) =>
  (await as(who, `select public.report_match($1, $2::jsonb) s`, [id, JSON.stringify(scores)]))[0].s;
const startMatch = async (who: string, game: string, place: string, players: string[]) =>
  (await as(who, `select public.start_match($1, $2, $3::uuid[]) id`, [game, place, `{${players.join(',')}}`]))[0].id;
await fails(C, `select public.start_match('tennis', $1, $2::uuid[])`, [`room:${secret}`, `{${C},${A}}`], 'a match where not everyone may be');
await fails(A, `select public.start_match('tennis', $1, $2::uuid[])`, [`room:${room}`, `{${B},${C}}`], 'start a match I am not in');
const solo = await startMatch(A, 'swim', `space:${A}`, [A]);
assert.equal(await report(A, solo, { [A]: 8.1, cpu1: 13 }), 'disputed', 'an 8 s swim reported 0 s after the start');
const swim = await startMatch(A, 'swim', `space:${A}`, [A]);
await age(swim, 20);
assert.equal(await report(A, swim, { [A]: 12.5, cpu1: 14.2, cpu2: null }), 'done');
ok('swim: a time faster than the race has run is refused; a real one is kept');
const match = await startMatch(A, 'tennis', `room:${room}`, [A, B]);
await age(match, 40);
await fails(C, `select public.report_match($1, '{}'::jsonb)`, [match], 'report a match I did not play');
assert.equal(await report(B, match, { [A]: 5, [B]: 3 }), 'pending');
assert.equal(await report(A, match, { [A]: 5, [B]: 3 }), 'done');
ok('tennis: kept once both players report the same score');
const fight = await startMatch(A, 'tennis', `room:${room}`, [A, B]);
await age(fight, 40);
await report(A, fight, { [A]: 5, [B]: 2 });
assert.equal(await report(B, fight, { [A]: 2, [B]: 5 }), 'disputed');
ok('tennis: players who disagree → disputed, nothing kept');
const quick = await startMatch(A, 'tennis', `room:${room}`, [A, B]);
await age(quick, 6);
assert.equal(await report(A, quick, { [A]: 5, [B]: 4 }), 'disputed');
ok('tennis: nine points in six seconds is refused');
const bogus = await startMatch(A, 'tennis', `room:${room}`, [A, B]);
await age(bogus, 60);
assert.equal(await report(A, bogus, { [A]: 9, [B]: 0 }), 'disputed');
ok('tennis: more than five points is refused');
await fails(A, `insert into matches (game, place, players) values ('tennis', 'x', '{}')`, [], 'write a match row directly');
assert.deepEqual((await as(C, `select * from public.game_records('swim')`)).map((r) => [r.nickname, Number(r.value)]), [['에이', 12.5]]);
assert.deepEqual((await as(C, `select * from public.game_records('tennis')`)).map((r) => [r.nickname, Number(r.value)]), [['에이', 1]]);
ok('records: fastest swims, most tennis wins');

console.log(out.join('\n'));
console.log('all permission rules ok');
