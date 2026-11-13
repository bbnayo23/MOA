import type { Tile } from '../../world/space';
import type { InteractionObject, ThemeConfig } from './types';

// Court runs along tx (1.4 → 6.6), ty 2.4 → 5.6; the net crosses the middle at tx = 4.
const line = (from: Tile, to: Tile) => ({ from, to, width: 0.1, color: '#ffffff', border: '#ffffff' });

const bench: InteractionObject = {
  id: 'bench', kind: 'pew', label: '벤치', icon: '🪑', at: { tx: 6.2, ty: 1.2 },
  actions: ['sit'],
  spots: [{ tx: 6.53, ty: 1.03 }, { tx: 6.03, ty: 1.53 }],
};

export const tennis: ThemeConfig = {
  themeId: 'tennis',
  name: '테니스장',
  emoji: '🎾',
  tagline: '랠리 한 판 어때?',
  activities: ['서브', '스윙', '랠리', '친구와 미니게임'],
  color: '#f2a37e',
  background: {
    size: 8,
    sky: ['#9fd4ff', '#b3dcff', '#c8e4ff', '#dcecff', '#eef3ff', '#fff3ec'],
    grass: '#bde3b4',
    floor: 'grass',
    ground: ['#c9ebc1', '#bde3b4'],
    side: ['#c99b7a', '#b5876a'],
    flowers: ['#ffffff', '#fff1a8'],
    rugs: [
      { from: { tx: 1.4, ty: 4.0 }, to: { tx: 6.6, ty: 4.0 }, width: 3.2, color: '#7fc9a6', border: '#ffffff' },
      line({ tx: 2.6, ty: 4.0 }, { tx: 5.4, ty: 4.0 }), // centre service line
      line({ tx: 2.6, ty: 2.6 }, { tx: 2.6, ty: 5.4 }), // service lines
      line({ tx: 5.4, ty: 2.6 }, { tx: 5.4, ty: 5.4 }),
    ],
  },
  spawnPosition: { tx: 6.9, ty: 6.9 },
  availableActions: ['serve', 'swing', 'rally', 'minigame', 'sit', 'wave'],
  interactionObjects: [
    {
      id: 'net', kind: 'net', label: '테니스 코트', icon: '🎾', at: { tx: 4.0, ty: 4.0 },
      actions: ['serve', 'swing', 'rally', 'minigame'],
      // baselines: two at the far end, two at the near end
      spots: [{ tx: 6.0, ty: 3.4 }, { tx: 2.0, ty: 4.6 }, { tx: 6.0, ty: 4.6 }, { tx: 2.0, ty: 3.4 }],
    },
    bench,
  ],
  decorations: [
    ...[[-0.6, 1.5], [-0.5, 4.0], [1.5, -0.6], [4.0, -0.5], [0.3, 6.6], [6.6, 0.3]].map(([tx, ty]) => ({
      kind: 'pine' as const,
      at: { tx, ty },
    })),
    { kind: 'balls', at: { tx: 1.0, ty: 1.6 } },
    { kind: 'bush', at: { tx: 7.4, ty: 5.0 } },
    { kind: 'bush', at: { tx: 2.4, ty: 7.4 } },
  ],
  recommendedOutfits: [
    { name: '🎾 테니스룩', look: { top: 'tee', topColor: '#fffaf2', bottom: 'skirt', bottomColor: '#fffaf2', hat: 'cap' } },
    { name: '🧢 스포티', look: { top: 'hoodie', topColor: '#b5e8c9', bottom: 'shorts', bottomColor: '#5c6185', hat: 'cap' } },
  ],
};
