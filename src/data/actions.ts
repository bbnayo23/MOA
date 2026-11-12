import type { AnimKey } from './anims';

/** What a character *does*. Which object it happens at is decided per theme. */
export interface ActionDef {
  label: string;
  icon: string;
  anim: AnimKey;
  /** One-shot actions return to idle after this; others loop until you move. */
  durationMs?: number;
}

export type ActionId = 'sit' | 'wave' | 'dance' | 'fireGaze' | 'roast' | 'bbq' | 'rest';

export const ACTIONS: Record<ActionId, ActionDef> = {
  sit: { label: '앉기', icon: '🪑', anim: 'sit' },
  wave: { label: '인사하기', icon: '👋', anim: 'wave', durationMs: 2400 },
  dance: { label: '춤추기', icon: '💃', anim: 'dance' },
  fireGaze: { label: '불멍', icon: '🔥', anim: 'sit' },
  roast: { label: '마시멜로 굽기', icon: '🍡', anim: 'campfire' },
  bbq: { label: '바비큐 굽기', icon: '🍖', anim: 'cook' },
  rest: { label: '텐트에서 쉬기', icon: '⛺', anim: 'sit' },
};
