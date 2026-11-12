// Runnable rules check for the tennis rally mini-game: `pnpm check`
import assert from 'node:assert/strict';
import { startRally, stepRally, swingRally, ZONE } from '../src/hooks/rallyGame.ts';

const fresh = startRally();
assert.equal(swingRally(fresh).over, true, 'swinging before the ball reaches my zone is a whiff');

const inZone = stepRally(fresh, (ZONE + 0.05) / fresh.speed);
assert.ok(!inZone.over && inZone.pos > ZONE, 'ball travels into my zone');

const hit = swingRally(inZone);
assert.equal(hit.hits, 1, 'a swing in the zone counts');
assert.equal(hit.dir, -1, 'and sends the ball back');
assert.ok(hit.speed > inZone.speed, 'each return speeds the ball up');
assert.deepEqual(swingRally(hit), hit, 'swinging while it flies away does nothing');

const returned = stepRally(hit, 10);
assert.equal(returned.dir, 1, 'the friend always returns it');
assert.equal(returned.pos, 0);

assert.equal(stepRally(fresh, 10).over, true, 'an unhit ball reaching my end is a miss');
console.log('rally rules ok');
