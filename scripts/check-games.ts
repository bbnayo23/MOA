// Runnable check for the minigame rules (tennis 1:1, swim race): `pnpm check`
import assert from 'node:assert/strict';
import { ballAt, cpuReturns, EARLY, HALF_L, HALF_W, judge, laneOf, LATE, newScore, point, REACH, receiverOf, serve, serverOf, teamOf, winnerOf, WIN, type Flight } from '../src/games/tennis.ts';
import { cpuDives, cpuStrokes, dive, DIVE, ducks, LENGTH, newSwimmer, ranking, seeded, stroke, swimFor, under, V_MAX, BEAT, type Swimmer } from '../src/games/swim.ts';
import {
  bites, cpuScore, deal, DRINKS, FISH, fits, gauge, grade, guide, isDrink, jerk, NEXT_LOOK, NEXT_ORDER, orders, rep, REP_LOCK, REQUESTS, requests, ROUND, wait, type TimedId,
  AFTER, cpuPick, cpuVote, fitOf, nextLen, NEXT_SHELF, notes, panes, pressLane, recallOrder, shelf, SHOW, sky, SKY, straight, tally, TAP_GAP, tapStar, voteTheme,
} from '../src/games/timed.ts';

// ── tennis ──
const f: Flight = { by: 1, from: 0, to: 1.5, dur: 1.2 }; // flying to side 0
// in reach, on time → a return from where it landed, going back to side 1, a little faster
const hit = judge(f, 1.2, 1.2, 0, 3);
assert.ok(hit.ok && hit.flight.by === 0 && hit.flight.from === 1.5 && hit.flight.dur < 1.6);
// too far, too early, too late
assert.deepEqual(judge(f, 1.2, 1.5 + REACH + 0.1, 0, 0), { ok: false, why: 'far' });
assert.deepEqual(judge(f, 1.2 - EARLY - 0.01, 1.5, 0, 0), { ok: false, why: 'early' });
assert.deepEqual(judge(f, 1.2 + LATE + 0.01, 1.5, 0, 0), { ok: false, why: 'late' });
// aiming sends it to that side, and always inside the court
const aimed = judge(f, 1.2, 1.5, -1, 0);
assert.ok(aimed.ok && aimed.flight.to < -2);
const wild = judge(f, 1.2 + LATE, 1.5, 1, 0);
assert.ok(wild.ok && Math.abs(wild.flight.to) < 3.2);
// the ball leaves the hitter's baseline and reaches the receiver's
assert.equal(ballAt(f, 0).z, -HALF_L);
assert.equal(ballAt(f, f.dur).z, HALF_L);
assert.ok(ballAt(f, f.dur * 0.35).h > ballAt(f, f.dur * 0.7).h, 'it arcs, then bounces');
// a serve lands in the court
assert.ok(Math.abs(serve(0, 2, 0).to) < 3.2);
// scoring: alternate serves; first to WIN
let s = newScore();
for (let i = 0; i < WIN - 1; i++) s = point(s, 0);
assert.equal(winnerOf(s), null);
assert.equal(s.server, (WIN - 1) % 2 === 0 ? 0 : 1);
s = point(s, 0);
assert.equal(winnerOf(s), 0);
// the computer can't cover the whole court on a fast ball
assert.equal(cpuReturns({ by: 0, from: 0, to: 3, dur: 0.75 }, -3, 0, 0), false);
assert.equal(cpuReturns({ by: 0, from: 0, to: 0.5, dur: 1.2 }, 0, 0, 0.1), true);

// doubles: seats 0 · 2 against 1 · 3; the ball goes to whoever's half it lands in; partners take turns serving
assert.deepEqual([0, 1, 2, 3].map(teamOf), [0, 1, 0, 1]);
assert.equal(receiverOf({ by: 1, from: 0, to: -1.2, dur: 1 }, true), 0);
assert.equal(receiverOf({ by: 1, from: 0, to: 1.2, dur: 1 }, true), 2);
assert.equal(receiverOf({ by: 0, from: 0, to: 1.2, dur: 1 }, true), 3);
assert.equal(receiverOf({ by: 0, from: 0, to: 1.2, dur: 1 }, false), 1, 'singles: the one player');
// every landing spot is in reach of its receiver's half
for (let to = -HALF_W + 0.3; to <= HALF_W - 0.3; to += 0.1) {
  const [lo, hi] = laneOf(receiverOf({ by: 1, from: 0, to, dur: 1 }, true), true);
  assert.ok(to >= lo - REACH && to <= hi + REACH, `ball at ${to.toFixed(1)} out of reach`);
}
let d = newScore();
const servers = [];
for (let i = 0; i < 6; i++) {
  servers.push(serverOf(d, true));
  d = point(d, 0);
}
assert.deepEqual(servers, [0, 1, 2, 3, 0, 1], 'teams alternate, and partners within a team');
assert.equal(serverOf(newScore(), false), 0);

// ── swim ──
const race = (gap: (i: number) => number, arms: (i: number) => 'L' | 'R') => {
  let sw: Swimmer = newSwimmer();
  let t = 0;
  let next = 0.2;
  for (let i = 0; t < 60 && sw.time === null; ) {
    t += 0.02;
    if (t >= next) {
      sw = stroke(sw, arms(i), t);
      next = t + gap(i);
      i++;
    }
    sw = swimFor(sw, 0.02, t);
  }
  return sw;
};
const good = race(() => BEAT, (i) => (i % 2 ? 'R' : 'L'));
const sloppy = race(() => BEAT * 2.2, (i) => (i % 2 ? 'R' : 'L'));
const sameArm = race(() => BEAT, () => 'L');
const mash = race(() => 0.12, (i) => (i % 2 ? 'R' : 'L'));
assert.ok(good.time !== null && good.time >= LENGTH / V_MAX, 'never faster than the server allows');
assert.ok(sloppy.time === null || sloppy.time > good.time!, 'off the beat is slower');
assert.ok(sameArm.time === null || sameArm.time > good.time! * 1.5, 'one arm only barely moves');
assert.ok(mash.time === null || mash.time > good.time! * 1.3, 'mashing loses to rhythm');
assert.deepEqual(ranking({ a: 14.2, b: null, c: 11.9 }).map(([id]) => id), ['c', 'a', 'b']);
// the duck race: swimming into a duck costs most of the speed; under it, you pass
const lane = ducks(4);
assert.ok(lane.length >= 3 && lane.every((d) => d > 3 && d < LENGTH - 2) && lane.every((d, i) => i === 0 || d - lane[i - 1] >= 3));
const before = { ...newSwimmer(), d: lane[0] - 0.05, v: 2 };
const bump = swimFor(before, 0.05, 5, lane);
assert.ok(bump.bumps === 1 && bump.v < 1, 'bumped: slowed right down');
const dived = swimFor(dive(before, 4.9), 0.05, 5, lane);
assert.ok(dived.bumps === 0 && dived.v > 1.8 && under(dive(before, 4.9), 5) && !under(dive(before, 4.9), 4.9 + DIVE + 0.01), 'under it: through');
assert.equal(dive(dive(before, 5), 5.5).diveAt, 5, 'no diving again straight away');
assert.deepEqual(cpuDives(9, 1, lane, 0.7), cpuDives(9, 1, lane, 0.7));
// diving the whole way is slower than diving at the ducks
const dives = (all: boolean) => {
  let sw: Swimmer = newSwimmer();
  for (let t = 0, i = 0, next = 0.2; t < 60 && sw.time === null; ) {
    t += 0.02;
    if (t >= next) [sw, next, i] = [stroke(sw, i % 2 ? 'R' : 'L', t), t + BEAT, i + 1];
    if (all || lane.some((x) => x > sw.d && x - sw.d < 0.6)) sw = dive(sw, t);
    sw = swimFor(sw, 0.02, t, lane);
  }
  return sw;
};
const timed = dives(false), spam = dives(true);
assert.ok(timed.bumps === 0 && timed.time! < (spam.time ?? 99), `dive at the ducks (${timed.time}s) beats diving all the time (${spam.time}s)`);
// computer swimmers are the same for everyone with the same seed
assert.deepEqual(cpuStrokes(0.7, seeded(42)).slice(0, 5), cpuStrokes(0.7, seeded(42)).slice(0, 5));

// ── the timed games ──
// fishing: hooking in the window catches it; too early scares it off; a bite let go is gone
const pond = bites(7);
assert.ok(pond.length > 5 && pond.every((b, i) => i === 0 || b.at - pond[i - 1].at >= 1.6));
let line = { next: 0, pts: 0 };
const first = jerk(pond, line, pond[0].at + 0.1);
assert.ok(first.caught && first.line.pts === FISH[pond[0].fish].pts && first.line.next === 1);
assert.deepEqual(jerk(pond, first.line, pond[1].at - 0.3), { line: { next: 2, pts: first.line.pts }, caught: null }, 'early: the bite is scared off');
assert.equal(wait(pond, line, pond[0].at + 0.9).next, 1, 'too slow: it got away');
// perfect fishing stays under the server's cap
let best = 0;
for (const b of pond) best += FISH[b.fish].pts;
for (let seed = 0; seed < 200; seed++) {
  const all = bites(seed).reduce((n, b) => n + FISH[b.fish].pts, 0);
  assert.ok(all <= ROUND.fishing.cap, `fishing seed ${seed}: ${all} > cap`);
}
// barista: the recipe in any order, nothing else; orders never repeat back to back
const latte = DRINKS.find((d) => d.name === '카페라떼')!;
assert.ok(isDrink(['milk', 'shot'], latte) && !isDrink(['shot'], latte) && !isDrink(['shot', 'milk', 'ice'], latte));
const q = orders(3);
assert.ok(q.every((d, i) => i === 0 || d !== q[i - 1]));
assert.ok(ROUND.barista.secs / NEXT_ORDER <= ROUND.barista.cap, 'a drink a second at most');
// squats: the sweet spot scores 2, near it 1, off it 0; the gauge swings 0 → 1 → 0
const r0 = rep(5, 0);
assert.equal(grade(r0, r0.c), 2);
assert.equal(grade(r0, r0.c + 0.08), 1);
assert.equal(grade(r0, r0.c + 0.2), 0);
assert.ok(gauge(r0.period, 0) === 0 && Math.abs(gauge(r0.period, r0.period / 2) - 1) < 1e-9);
assert.ok(rep(5, 30).period < r0.period, 'faster as you go');
assert.ok((ROUND.squat.secs / REP_LOCK) * 2 <= ROUND.squat.cap, 'two points a squat at most');
// memory: 8 pairs a table, a new table each time, the same for everyone
const t0 = deal(9, 0);
assert.equal(t0.length, 16);
assert.ok(t0.every((x) => t0.filter((y) => y === x).length === 2));
assert.deepEqual(deal(9, 1), deal(9, 1));
assert.notDeepEqual(deal(9, 0), deal(9, 1));
// styling: the order's three picks, exactly
const want = REQUESTS[requests(4)[0]];
assert.ok(fits(want, want) && !fits({ ...want, hat: want.hat === 'cap' ? 'beanie' : 'cap' }, want));
assert.ok(ROUND.styling.secs / NEXT_LOOK <= ROUND.styling.cap);
// breathing: in for 4 s, out for 4 s
assert.ok(guide(1).inhale && !guide(5).inhale && guide(4).size > 0.99 && guide(0).size < 0.01);
// constellations: the next star scores, another holds you up, a finished one moves on; never faster than the cap allows
const c0 = sky(5, 0);
let run = { k: 0, next: 0, pts: 0, hold: 0, last: -9 };
let r1 = tapStar(run, 1, 1, c0.stars.length);
assert.equal(r1.ok, false);
assert.equal(tapStar(r1.run, 0, 1.2, c0.stars.length).ok, null, 'held up after a wrong star');
for (let i = 0, t = 2; i < c0.stars.length; i++, t += 0.3) run = tapStar(run, i, t, c0.stars.length).run;
assert.ok(run.k === 1 && run.next === 0 && run.pts === c0.stars.length);
assert.equal(tapStar({ k: 0, next: 0, pts: 0, hold: 0, last: 5 }, 0, 5.1, 5).ok, null, 'too fast');
assert.ok(ROUND.stars.secs / TAP_GAP <= ROUND.stars.cap);
assert.ok(SKY.every((c) => c.stars.length >= 5 && c.stars.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)));
// remembering orders: lengths 3–9, never the same dish twice running, same for everyone
const o = recallOrder(3, 2, 6);
assert.ok(o.length === 6 && o.every((d, i) => i === 0 || d !== o[i - 1]));
assert.deepEqual(recallOrder(3, 2, 6), o);
assert.equal(nextLen(9, true), 9);
assert.equal(nextLen(3, false), 3);
assert.ok(ROUND.recall.secs / SHOW <= ROUND.recall.cap, 'a dish shown is a point at most');
assert.ok(AFTER > 0);
// rhythm: on the beat 2, close 1, nothing near: a stray press
const song = notes(8);
const n0 = song[0];
assert.deepEqual(pressLane(song, new Set(), n0.lane, n0.at), { i: 0, pts: 2 });
assert.deepEqual(pressLane(song, new Set(), n0.lane, n0.at + 0.2), { i: 0, pts: 1 });
assert.equal(pressLane(song, new Set([0]), n0.lane, n0.at), null);
assert.ok(song.length * 2 <= ROUND.rhythm.cap);
// find the book: 24 different books, the one to find among them
const sh = shelf(4, 3);
assert.ok(sh.books.length === 24 && new Set(sh.books).size === 24 && sh.books.includes(sh.want));
assert.ok(ROUND.bookhunt.secs / NEXT_SHELF <= ROUND.bookhunt.cap);
// vote: fit counts the theme's parts; a computer votes the best fit but never itself; votes for yourself don't count
const th = voteTheme(6);
assert.equal(fitOf(th, th), 3);
const opts = { hat: ['none', 'cap'], top: ['tee', 'dress'], accessory: ['none', 'star'], color: ['#fff'] };
const cp = cpuPick(6, 0, th, opts);
assert.ok(fitOf(cp, th) >= 0 && fitOf(cp, th) <= 3);
const looks: [string, typeof cp][] = [['me', { ...th, topColor: '#fff' }], ['cpu1', cp], ['cpu2', { hat: 'none', top: 'tee', accessory: 'none', topColor: '#fff' }]];
assert.equal(cpuVote('cpu1', looks, th), 'me');
assert.notEqual(cpuVote('me', looks, th), 'me');
assert.deepEqual(tally({ a: 'b', b: 'b', c: 'b', d: null }), { b: 2 });
// stained glass: never dealt straight, straight when every pane is
assert.ok(!straight(panes(1, 0)) && straight([0, 4, 0, 0, 8, 0, 0, 0, 0]));
for (let k = 0; k < 50; k++) assert.ok(!straight(panes(k * 7, k)));

// computer players: the same for everyone, within the cap, and a fair fight
for (const g of Object.keys(ROUND) as TimedId[]) {
  const n = cpuScore(g, 11, 0);
  assert.equal(n, cpuScore(g, 11, 0));
  assert.ok(n >= 0 && n <= ROUND[g].cap && Number.isInteger(n), `${g}: cpu ${n}`);
  if (!['breath', 'glass', 'vote'].includes(g)) assert.ok(n > 0, `${g}: the computer plays`);
}

console.log(`game rules ok (swim: on the beat ${good.time}s, lagging ${sloppy.time ?? 'DNF'}, mashing ${mash.time ?? 'DNF'})`);
