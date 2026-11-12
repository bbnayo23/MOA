import { POOL_WATER } from '../../art/avatar';
import type { Tile } from '../../game/iso';
import type { InteractionObject, ThemeConfig } from './types';

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
  activities: ['수영하기', '튜브 타기', '물장구치기'],
  color: '#7cc4f0',
  background: {
    size: 8,
    sky: ['#8fd3ff', '#a6dcff', '#bde5ff', '#d4eeff', '#e8f6ff', '#f5fbff'],
    hills: ['#bfe6c9', '#a6dcb4'],
    ground: ['#fdf8ef', '#f3ead9'],
    side: ['#e0cdb0', '#cdb898'],
    rugs: [
      // the pool itself (tx 2.2–5.6, ty 2.2–5.0) with white coping, and a lane rope
      { from: { tx: 2.2, ty: 3.6 }, to: { tx: 5.6, ty: 3.6 }, width: 2.8, color: POOL_WATER, border: '#ffffff' },
      { from: { tx: 2.4, ty: 3.6 }, to: { tx: 5.4, ty: 3.6 }, width: 0.14, color: '#ffb3c6', border: '#ffb3c6' },
    ],
    motes: 0xffffff,
  },
  spawnPosition: { tx: 6.6, ty: 6.0 },
  availableActions: ['swim', 'tube', 'splash', 'sit', 'wave'],
  interactionObjects: [
    {
      id: 'ladder', kind: 'ladder', label: '수영장', icon: '🏊', at: { tx: 4.0, ty: 2.1 },
      actions: ['swim', 'tube', 'splash'],
      // places well inside the water, so the waterline never overlaps the coping
      spots: [{ tx: 3.4, ty: 3.4 }, { tx: 4.6, ty: 3.2 }, { tx: 3.2, ty: 4.3 }, { tx: 4.4, ty: 4.2 }],
    },
    lounger('lounger-1', { tx: 6.6, ty: 1.6 }),
    lounger('lounger-2', { tx: 7.0, ty: 3.4 }),
  ],
  decorations: [
    { kind: 'parasol', at: { tx: 6.4, ty: 2.7 } },
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
