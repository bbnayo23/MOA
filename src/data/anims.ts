/**
 * Animation = a looping list of poses. Pure data: the avatar renderer turns a
 * pose into pixels, actions (actions.ts) decide *which* animation to play.
 */
export interface Pose {
  /** Upper-body vertical offset in art pixels (negative = up). */
  bob?: number;
  /** Upper-body sideways offset in art pixels (side bends). */
  lean?: number;
  legs?: 'stand' | 'stepA' | 'stepB' | 'sit' | 'swim';
  arms?: 'down' | 'waveA' | 'waveB' | 'up' | 'front' | 'pray';
  eyes?: 'closed' | 'happy';
  mouth?: 'open';
  prop?:
    | 'stick' | 'spatula' | 'spatulaUp' | 'candle' | 'pen' | 'book' | 'bookFlip' | 'fork' | 'forkUp' | 'cup'
    | 'dumbbells' | 'sweat'
    | 'tube' | 'splash' | 'splashB'
    | 'racketUp' | 'racketFwd' | 'racketServe' | 'racketBall'
    | 'sparkle';
  /** Mirror this frame (on top of the avatar's facing). */
  flip?: boolean;
}

export interface Anim {
  fps: number;
  frames: Pose[];
}

// Grouped by the theme that introduced them; new themes add theirs here.
export type AnimKey =
  | 'idle' | 'walk' | 'sit' | 'wave' | 'dance'
  | 'campfire' | 'cook'
  | 'pray' | 'candle' | 'write'
  | 'read' | 'study'
  | 'eat' | 'drink' | 'talk'
  | 'workout' | 'run' | 'stretch' | 'squat'
  | 'swim' | 'tube' | 'splash'
  | 'swing' | 'serve' | 'rally'
  | 'browse' | 'tryOn' | 'pose';

const SIT = { legs: 'sit' } as const;
const ROAST = { legs: 'sit', arms: 'front', prop: 'stick' } as const;
const COOK = { arms: 'front', prop: 'spatula' } as const;
const PRAY = { legs: 'sit', arms: 'pray', eyes: 'closed' } as const;
const CANDLE = { arms: 'front', prop: 'candle' } as const;
const WRITE = { arms: 'front', prop: 'pen' } as const;
const READ = { legs: 'sit', arms: 'pray', prop: 'book' } as const;
const STUDY = { legs: 'sit', arms: 'front', prop: 'pen' } as const;
const EAT = { legs: 'sit', arms: 'front', prop: 'fork' } as const;
const DRINK = { legs: 'sit', arms: 'front', prop: 'cup' } as const;

export const ANIMS: Record<AnimKey, Anim> = {
  idle: { fps: 3, frames: [{}, {}, {}, { bob: 1 }, { bob: 1 }, {}, {}, { eyes: 'closed' }] },
  walk: { fps: 8, frames: [{ legs: 'stepA' }, { bob: -1 }, { legs: 'stepB' }, { bob: -1 }] },
  sit: { fps: 2, frames: [SIT, SIT, SIT, SIT, { ...SIT, eyes: 'closed' }, SIT] },
  wave: { fps: 5, frames: [{ arms: 'waveA', eyes: 'happy' }, { arms: 'waveB', eyes: 'happy' }] },
  dance: {
    fps: 5,
    frames: [
      { arms: 'up', bob: -1, eyes: 'happy' },
      { legs: 'stepA' },
      { arms: 'up', bob: -1, eyes: 'happy', flip: true },
      { legs: 'stepB', flip: true },
    ],
  },
  campfire: { fps: 2, frames: [ROAST, ROAST, { ...ROAST, bob: 1 }, ROAST, { ...ROAST, eyes: 'closed' }] },
  cook: { fps: 4, frames: [COOK, COOK, { ...COOK, prop: 'spatulaUp', bob: -1 }, COOK] },
  pray: { fps: 2, frames: [PRAY, PRAY, PRAY, { ...PRAY, bob: 1 }, { ...PRAY, bob: 1 }, PRAY] },
  candle: { fps: 3, frames: [CANDLE, CANDLE, { ...CANDLE, bob: 1 }, { ...CANDLE, eyes: 'happy' }] },
  write: { fps: 4, frames: [WRITE, { ...WRITE, bob: 1 }, WRITE, { ...WRITE, bob: -1 }] },
  read: { fps: 2, frames: [READ, READ, READ, { ...READ, prop: 'bookFlip' }, READ, { ...READ, eyes: 'closed' }] },
  study: { fps: 3, frames: [STUDY, { ...STUDY, bob: 1 }, STUDY, STUDY, { ...STUDY, eyes: 'closed' }] },
  eat: { fps: 3, frames: [EAT, EAT, { ...EAT, prop: 'forkUp', mouth: 'open', bob: -1 }, EAT, { ...EAT, eyes: 'happy' }] },
  drink: { fps: 2, frames: [DRINK, DRINK, { ...DRINK, mouth: 'open', eyes: 'closed', bob: -1 }, DRINK] },
  workout: {
    fps: 3,
    frames: [
      { prop: 'dumbbells' },
      { arms: 'up', prop: 'dumbbells', bob: -1, eyes: 'closed' },
      { prop: 'dumbbells' },
      { arms: 'up', prop: 'dumbbells', bob: -1 },
    ],
  },
  run: {
    fps: 12,
    frames: [{ legs: 'stepA' }, { bob: -1, prop: 'sweat' }, { legs: 'stepB' }, { bob: -1 }],
  },
  stretch: {
    fps: 2,
    frames: [
      { arms: 'up', eyes: 'closed', lean: -1 },
      { arms: 'up', eyes: 'closed', lean: -1 },
      { arms: 'up', eyes: 'closed', lean: 1 },
      { arms: 'up', eyes: 'closed', lean: 1 },
    ],
  },
  squat: { fps: 2, frames: [{ arms: 'pray' }, { legs: 'sit', arms: 'pray', eyes: 'closed' }] },
  browse: {
    fps: 2,
    frames: [{ arms: 'front' }, { arms: 'front', eyes: 'happy' }, {}, { arms: 'front', lean: 1 }],
  },
  // try_on: a little twirl in the new outfit
  tryOn: {
    fps: 3,
    frames: [
      { arms: 'up', eyes: 'happy' },
      { arms: 'up', eyes: 'happy', flip: true },
      { arms: 'waveA', prop: 'sparkle', eyes: 'happy' },
      { prop: 'sparkle' },
    ],
  },
  pose: {
    fps: 3,
    frames: [
      { arms: 'waveA', eyes: 'happy', prop: 'sparkle' },
      { arms: 'waveB', eyes: 'happy' },
      { arms: 'up', mouth: 'open', prop: 'sparkle' },
      { eyes: 'happy', lean: 1 },
    ],
  },
  // tennis_swing: wind up behind, swing through, follow-through
  swing: {
    fps: 5,
    frames: [
      { arms: 'front', prop: 'racketFwd' },
      { arms: 'waveB', prop: 'racketUp' },
      { arms: 'front', prop: 'racketFwd', lean: 1, eyes: 'happy' },
      { arms: 'front', prop: 'racketFwd' },
    ],
  },
  serve: {
    fps: 4,
    frames: [
      { arms: 'up', prop: 'racketServe' },
      { arms: 'up', prop: 'racketServe', bob: -1 },
      { arms: 'waveB', prop: 'racketUp', bob: -1 },
      { arms: 'front', prop: 'racketBall', lean: 1, eyes: 'happy' },
      { arms: 'front', prop: 'racketFwd' },
    ],
  },
  // ready stance, ball comes in, return it
  rally: {
    fps: 4,
    frames: [
      { arms: 'front', prop: 'racketFwd' },
      { arms: 'front', prop: 'racketFwd', bob: 1 },
      { arms: 'front', prop: 'racketBall' },
      { arms: 'waveB', prop: 'racketUp' },
      { arms: 'front', prop: 'racketFwd', lean: 1 },
      { arms: 'front', prop: 'racketFwd', bob: 1 },
    ],
  },
  // crawl: one arm over the water, then the other (flip mirrors the frame)
  swim: {
    fps: 4,
    frames: [
      { legs: 'swim', arms: 'waveA' },
      { legs: 'swim', bob: 1 },
      { legs: 'swim', arms: 'waveA', flip: true },
      { legs: 'swim', bob: 1 },
    ],
  },
  tube: {
    fps: 2,
    frames: [
      { legs: 'swim', prop: 'tube', eyes: 'happy' },
      { legs: 'swim', prop: 'tube', bob: -1 },
      { legs: 'swim', prop: 'tube', bob: -1, eyes: 'happy' },
      { legs: 'swim', prop: 'tube' },
    ],
  },
  splash: {
    fps: 5,
    frames: [
      { legs: 'swim', arms: 'up', prop: 'splash', eyes: 'happy', mouth: 'open' },
      { legs: 'swim', prop: 'splashB', bob: 1 },
    ],
  },
  talk: {
    fps: 3,
    frames: [
      SIT,
      { ...SIT, mouth: 'open' },
      SIT,
      { ...SIT, mouth: 'open', arms: 'waveA' },
      { ...SIT, eyes: 'happy' },
      { ...SIT, mouth: 'open' },
    ],
  },
};
