// Runnable check for the pixel character: `pnpm check`
import assert from 'node:assert/strict';
import { AV_FOOT, AV_H, AV_W, moodOf, renderAvatar } from '../src/art/avatar.ts';
import { ANIMS } from '../src/data/anims.ts';
import { LOOK_OPTIONS, PRESETS, type CharacterLook } from '../src/data/character.ts';

const row = (cells: (string | null)[], y: number) => cells.slice(y * AV_W, (y + 1) * AV_W);
const col = (cells: (string | null)[], x: number) => Array.from({ length: AV_H }, (_, y) => cells[y * AV_W + x]);

/** Draws, nothing cut off at the canvas edge, and (standing) the soles on the foot row. */
function ok(look: CharacterLook, pose: Parameters<typeof renderAvatar>[1], back: boolean, what: string) {
  const { cells } = renderAvatar(look, pose, { back });
  assert.equal(cells.length, AV_W * AV_H);
  for (const edge of [row(cells, 0), col(cells, 0), col(cells, AV_W - 1)]) assert.ok(edge.every((c) => c === null), `${what}: cut off at an edge`);
  const legs = pose?.legs ?? 'stand';
  if (legs === 'stand' || legs === 'stepA' || legs === 'stepB') assert.ok(row(cells, AV_FOOT - 1).some(Boolean), `${what}: feet on the ground`);
  if (legs === 'swim') assert.ok(row(cells, AV_FOOT - 1).every((c) => c === null), `${what}: no legs in the water`);
}

// every option of every slot, standing, walking and sitting, from the front and from behind
const some = [ANIMS.idle.frames[0], ANIMS.walk.frames[0], ANIMS.walk.frames[2], ANIMS.sit.frames[0]];
for (const o of LOOK_OPTIONS)
  for (const v of o.values)
    for (const pose of some) for (const back of [false, true]) ok({ ...PRESETS[0].look, [o.key]: v }, pose, back, `${o.key}=${v}`);
// every frame of every animation (props and all), on every preset
for (const [key, anim] of Object.entries(ANIMS))
  for (const [i, pose] of anim.frames.entries()) for (const p of PRESETS) for (const back of [false, true]) ok(p.look, pose, back, `${p.name} ${key}#${i}`);
// a look saved before eye colours existed still draws
const { eyeColor: _, ...old } = PRESETS[0].look;
ok(old, {}, false, 'no eye colour');

// a wave mirrors nothing else: the left hand stays down
const wave = renderAvatar(PRESETS[3].look, ANIMS.wave.frames[0]).cells;
const still = renderAvatar(PRESETS[3].look, {}).cells;
assert.notDeepEqual(wave, still);

// chat → a face
assert.equal(moodOf('ㅋㅋㅋ 웃겨'), 'laugh');
assert.equal(moodOf('보고 싶어 ❤️'), 'love');
assert.equal(moodOf('안녕'), null);

console.log('avatar rules ok');
