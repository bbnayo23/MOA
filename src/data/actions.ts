import type { AnimKey } from './anims';

/** What a character *does*. Which object it happens at is decided per theme. */
export interface ActionDef {
  label: string;
  icon: string;
  anim: AnimKey;
  /** One-shot actions return to idle after this; others loop until you move. */
  durationMs?: number;
  /** UI panel that opens while *I* am doing this. */
  opens?: 'board' | 'timer' | 'menu';
}

export type ActionId =
  | 'sit' | 'wave' | 'dance'
  | 'fireGaze' | 'roast' | 'bbq' | 'rest'
  | 'pray' | 'lightCandle' | 'cheer'
  | 'read' | 'study' | 'focus'
  | 'order' | 'eat' | 'drink' | 'talk';

export const ACTIONS: Record<ActionId, ActionDef> = {
  sit: { label: '앉기', icon: '🪑', anim: 'sit' },
  wave: { label: '인사하기', icon: '👋', anim: 'wave', durationMs: 2400 },
  dance: { label: '춤추기', icon: '💃', anim: 'dance' },
  fireGaze: { label: '불멍', icon: '🔥', anim: 'sit' },
  roast: { label: '마시멜로 굽기', icon: '🍡', anim: 'campfire' },
  bbq: { label: '바비큐 굽기', icon: '🍖', anim: 'cook' },
  rest: { label: '텐트에서 쉬기', icon: '⛺', anim: 'sit' },
  pray: { label: '기도하기', icon: '🙏', anim: 'pray' },
  lightCandle: { label: '촛불 켜기', icon: '🕯️', anim: 'candle', durationMs: 3000 },
  cheer: { label: '응원 메시지', icon: '💌', anim: 'write', opens: 'board' },
  read: { label: '책 읽기', icon: '📖', anim: 'read' },
  study: { label: '공부하기', icon: '✏️', anim: 'study' },
  focus: { label: '집중 타이머', icon: '⏰', anim: 'study', opens: 'timer' },
  order: { label: '음식 주문', icon: '🧾', anim: 'idle', opens: 'menu' },
  eat: { label: '식사하기', icon: '🍝', anim: 'eat' },
  drink: { label: '음료 마시기', icon: '🧋', anim: 'drink' },
  talk: { label: '대화하기', icon: '💬', anim: 'talk' },
};
