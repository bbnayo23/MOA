import type { Tile } from '../../world/space';
import type { InteractionObject, ThemeConfig } from './types';

// Court runs along tx (1.4 → 6.6), ty 2.4 → 5.6; the net crosses the middle at tx = 4.
const line = (from: Tile, to: Tile) => ({ from, to, width: 0.1, color: '#ffffff', border: '#ffffff' });

/** Courtside benches: sit, watch, chat. */
const bench = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'pew', label: '관람 벤치', icon: '🪑', at,
  actions: ['sit'],
  spots: [{ tx: at.tx + 0.33, ty: at.ty - 0.17 }, { tx: at.tx - 0.17, ty: at.ty + 0.33 }],
});

export const tennis: ThemeConfig = {
  themeId: 'tennis',
  name: '테니스장',
  emoji: '🎾',
  tagline: '랠리 한 판 어때?',
  activities: ['벤치에서 관람 · 수다', '서브', '스윙', '랠리', '랠리 연습', '1:1 경기 신청 (친구 · 컴퓨터)'],
  color: '#f2a37e',
  background: {
    size: 8,
    sky: ['#9fd4ff', '#b3dcff', '#c8e4ff', '#dcecff', '#eef3ff', '#fff3ec'],
    grass: '#a9db92',
    floor: 'grass',
    ground: ['#a9db92', '#9dd187'],
    side: ['#c99b7a', '#b5876a'],
    flowers: ['#ffffff', '#fff1a8'],
    rugs: [
      // a mint apron, the blue court on it (its white border is the outer line), the lines
      { from: { tx: 0.9, ty: 4.0 }, to: { tx: 7.1, ty: 4.0 }, width: 4.2, color: '#78c49b', border: '#6db78f' },
      { from: { tx: 1.4, ty: 4.0 }, to: { tx: 6.6, ty: 4.0 }, width: 3.2, color: '#5b9de0', border: '#ffffff' },
      line({ tx: 2.6, ty: 4.0 }, { tx: 5.4, ty: 4.0 }), // centre service line
      line({ tx: 2.6, ty: 2.6 }, { tx: 2.6, ty: 5.4 }), // service lines
      line({ tx: 5.4, ty: 2.6 }, { tx: 5.4, ty: 5.4 }),
    ],
  },
  spawnPosition: { tx: 6.9, ty: 6.9 },
  availableActions: ['tennisMatch', 'serve', 'swing', 'rally', 'minigame', 'sit', 'wave', 'jump'],
  interactionObjects: [
    {
      id: 'net', kind: 'net', label: '테니스 코트', icon: '🎾', at: { tx: 4.0, ty: 4.0 },
      actions: ['tennisMatch', 'serve', 'swing', 'rally', 'minigame'],
      // baselines: two at the far end, two at the near end
      spots: [{ tx: 6.0, ty: 3.4 }, { tx: 2.0, ty: 4.6 }, { tx: 6.0, ty: 4.6 }, { tx: 2.0, ty: 3.4 }],
    },
    bench('bench', { tx: 6.2, ty: 1.2 }),
    bench('bench-2', { tx: 4.4, ty: 1.2 }),
    bench('bench-3', { tx: 2.6, ty: 1.2 }),
  ],
  decorations: [
    ...[[-0.6, 1.5], [-0.5, 4.0], [1.5, -0.6], [4.0, -0.5], [0.3, 6.6], [6.6, 0.3]].map(([tx, ty], i) => ({
      kind: i % 2 ? ('pine' as const) : ('tree' as const),
      at: { tx, ty },
    })),
    { kind: 'lamp', at: { tx: 7.4, ty: 1.4 } },
    { kind: 'balls', at: { tx: 1.0, ty: 1.6 } },
    { kind: 'bush', at: { tx: 7.4, ty: 5.0 } },
    { kind: 'bush', at: { tx: 2.4, ty: 7.4 } },
  ],
  recommendedOutfits: [
    { name: '🎾 테니스룩', look: { top: 'tee', topColor: '#fffaf2', bottom: 'skirt', bottomColor: '#fffaf2', hat: 'cap' } },
    { name: '🧢 스포티', look: { top: 'hoodie', topColor: '#b5e8c9', bottom: 'shorts', bottomColor: '#5c6185', hat: 'cap' } },
  ],
};
