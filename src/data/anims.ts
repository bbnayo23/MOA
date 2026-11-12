/**
 * Animation = a looping list of poses. Pure data: the avatar renderer turns a
 * pose into pixels, actions (actions.ts) decide *which* animation to play.
 */
export interface Pose {
  /** Upper-body vertical offset in art pixels (negative = up). */
  bob?: number;
  legs?: 'stand' | 'stepA' | 'stepB' | 'sit';
  arms?: 'down' | 'waveA' | 'waveB' | 'up' | 'front';
  eyes?: 'closed' | 'happy';
  prop?: 'stick' | 'spatula' | 'spatulaUp';
  /** Mirror this frame (on top of the avatar's facing). */
  flip?: boolean;
}

export interface Anim {
  fps: number;
  frames: Pose[];
}

// ponytail: only the MVP set. Theme anims (pray, swim, tennis_swing, workout,
// read, try_on, eat) get added here with their theme.
export type AnimKey = 'idle' | 'walk' | 'sit' | 'wave' | 'dance' | 'campfire' | 'cook';

const SIT = { legs: 'sit' } as const;
const ROAST = { legs: 'sit', arms: 'front', prop: 'stick' } as const;
const COOK = { arms: 'front', prop: 'spatula' } as const;

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
};
