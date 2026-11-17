// Runnable check for the minigame rules (tennis 1:1, swim race): `pnpm check`
import assert from 'node:assert/strict';
import { ballAt, cpuReturns, EARLY, HALF_L, judge, LATE, newScore, point, REACH, serve, winnerOf, WIN, type Flight } from '../src/games/tennis.ts';
import { cpuStrokes, LENGTH, newSwimmer, ranking, seeded, stroke, swimFor, V_MAX, BEAT, type Swimmer } from '../src/games/swim.ts';
import {
  bites, cpuScore, deal, DRINKS, FISH, fits, gauge, grade, guide, isDrink, jerk, NEXT_LOOK, NEXT_ORDER, orders, rep, REP_LOCK, REQUESTS, requests, ROUND, wait, type TimedId,
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
// computer players: the same for everyone, within the cap, and a fair fight
for (const g of Object.keys(ROUND) as TimedId[]) {
  const n = cpuScore(g, 11, 0);
  assert.equal(n, cpuScore(g, 11, 0));
  assert.ok(n >= 0 && n <= ROUND[g].cap && Number.isInteger(n), `${g}: cpu ${n}`);
  if (g !== 'breath') assert.ok(n > 0, `${g}: the computer plays`);
}

console.log(`game rules ok (swim: on the beat ${good.time}s, lagging ${sloppy.time ?? 'DNF'}, mashing ${mash.time ?? 'DNF'})`);
