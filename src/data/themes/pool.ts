import type { Tile } from '../../world/space';
import type { InteractionObject, ThemeConfig } from './types';

const POOL_WATER = '#8fd0f5';

const onTop = (at: Tile): Tile => ({ tx: at.tx + 0.05, ty: at.ty + 0.05 });

const lounger = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'lounger', label: '선베드', icon: '🏖️', at,
  actions: ['sit'],
  spots: [onTop(at)],
});

export const pool: ThemeConfig = {
  themeId: 'pool',
  name: '수영장',
  emoji: '🏊',
  tagline: '첨벙첨벙 여름 한가운데',
  activities: ['수영하기', '튜브 타기', '물장구치기', '선베드 휴식', '수영 레이스 (최대 4명)', '오리 피하기 레이스'],
  color: '#7cc4f0',
  background: {
    size: 8,
    sky: ['#8fd3ff', '#a6dcff', '#bde5ff', '#d4eeff', '#e8f6ff', '#f5fbff'],
    grass: '#9fd8a8',
    ground: ['#f7eedd', '#e8d8bc'],
    side: ['#e0cdb0', '#cdb898'],
    // the pool itself (tx 2.2–5.6, ty 2.2–5.0): a basin painted on the floor with white coping, water on top
    water: { from: { tx: 2.2, ty: 3.6 }, to: { tx: 5.6, ty: 3.6 }, width: 2.8 },
    rugs: [
      { from: { tx: 2.2, ty: 3.6 }, to: { tx: 5.6, ty: 3.6 }, width: 2.8, color: POOL_WATER, border: '#ffffff' },
      { from: { tx: 2.4, ty: 3.6 }, to: { tx: 5.4, ty: 3.6 }, width: 0.14, color: '#ffb3c6', border: '#ffb3c6' },
    ],
    motes: 0xffffff,
  },
  spawnPosition: { tx: 6.6, ty: 6.0 },
  availableActions: ['swimRace', 'duckRace', 'swim', 'tube', 'splash', 'sit', 'wave', 'jump'],
  interactionObjects: [
    {
      id: 'ladder', kind: 'ladder', label: '수영장', icon: '🏊', at: { tx: 4.0, ty: 2.1 },
      actions: ['swimRace', 'duckRace', 'swim', 'tube', 'splash'],
      // places well inside the water, so the waterline never overlaps the coping
      spots: [{ tx: 3.4, ty: 3.4 }, { tx: 4.6, ty: 3.2 }, { tx: 3.2, ty: 4.3 }, { tx: 4.4, ty: 4.2 }],
    },
    lounger('lounger-1', { tx: 6.6, ty: 1.6 }),
    lounger('lounger-2', { tx: 7.0, ty: 3.4 }),
    lounger('lounger-3', { tx: 7.2, ty: 6.2 }),
  ],
  decorations: [
    // palms at the corners of the deck, a lifeguard chair at the deep end
    { kind: 'palm', at: { tx: 0.6, ty: 1.0 } },
    { kind: 'palm', at: { tx: 7.5, ty: 0.5 } },
    { kind: 'palm', at: { tx: 0.5, ty: 6.9 } },
    { kind: 'palm', at: { tx: 7.6, ty: 7.4 } },
    { kind: 'highChair', at: { tx: 1.55, ty: 2.0 }, color: '#ff8f8f', yaw: 0.8 },
    { kind: 'shower', at: { tx: 0.45, ty: 3.6 }, yaw: Math.PI / 2 },
    { kind: 'shower', at: { tx: 0.45, ty: 4.6 }, yaw: Math.PI / 2 },
    // along the back: more loungers with towels, a snack cart, a vending machine
    { kind: 'lounger', at: { tx: 2.6, ty: 0.9 } },
    { kind: 'lounger', at: { tx: 3.6, ty: 0.9 } },
    { kind: 'towel', at: { tx: 5.1, ty: 1.0 }, color: '#7fb7e8', yaw: 0.2 },
    { kind: 'towel', at: { tx: 5.5, ty: 1.15 }, color: '#ffd38a', yaw: -0.1 },
    { kind: 'kiosk', at: { tx: 0.7, ty: 5.7 }, color: '#7cc4f0', yaw: Math.PI / 2 },
    { kind: 'vending', at: { tx: 6.3, ty: 0.4 } },
    // on the deck and in the water
    { kind: 'beachBall', at: { tx: 5.3, ty: 6.1 } },
    { kind: 'beachBall', at: { tx: 1.6, ty: 5.9 } },
    { kind: 'towel', at: { tx: 5.9, ty: 6.6 }, color: '#ffb3c6', yaw: 0.5 },
    { kind: 'rubberDuck', at: { tx: 2.9, ty: 2.9 } },
    { kind: 'rubberDuck', at: { tx: 5.0, ty: 4.4 }, yaw: 2.4 },
    { kind: 'rubberDuck', at: { tx: 4.2, ty: 2.9 }, yaw: -1.2 },
    { kind: 'ring', at: { tx: 2.5, ty: 4.2 } },
    { kind: 'plant', at: { tx: 1.6, ty: 0.4 } },
    { kind: 'plant', at: { tx: 7.6, ty: 2.4 } },
    { kind: 'flowers', at: { tx: 3.0, ty: 7.5 }, color: '#ffb3c6' },
    { kind: 'flowers', at: { tx: 5.0, ty: 7.6 }, color: '#fff1a8' },
    { kind: 'parasol', at: { tx: 6.4, ty: 2.7 } },
    { kind: 'parasol', at: { tx: 6.6, ty: 5.6 } },
    { kind: 'ring', at: { tx: 3.6, ty: 6.4 } },
    { kind: 'bush', at: { tx: 0.6, ty: 6.6 } },
    { kind: 'bush', at: { tx: 1.0, ty: 1.0 } },
    { kind: 'plant', at: { tx: 7.4, ty: 6.6 } },
  ],
  recommendedOutfits: [
    { name: '🩱 수영복 느낌', look: { top: 'tee', topColor: '#a9cdfc', bottom: 'shorts', bottomColor: '#a9cdfc', hat: 'none' } },
    { name: '🧢 여름 캡', look: { top: 'stripe', topColor: '#ffd38a', bottom: 'shorts', bottomColor: '#fffaf2', hat: 'cap' } },
  ],
};
