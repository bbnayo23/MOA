// Runnable check for the minigame rules (tennis 1:1, swim race): `pnpm check`
import assert from 'node:assert/strict';
import { ballAt, cpuReturns, EARLY, HALF_L, judge, LATE, newScore, point, REACH, serve, winnerOf, WIN, type Flight } from '../src/games/tennis.ts';
import { cpuStrokes, LENGTH, newSwimmer, ranking, seeded, stroke, swimFor, V_MAX, BEAT, type Swimmer } from '../src/games/swim.ts';

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

console.log(`game rules ok (swim: on the beat ${good.time}s, lagging ${sloppy.time ?? 'DNF'}, mashing ${mash.time ?? 'DNF'})`);
