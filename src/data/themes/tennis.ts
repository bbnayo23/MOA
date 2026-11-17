import type { Tile } from '../../world/space';
import { fine } from './grid';
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
  activities: ['벤치에서 관람 · 수다', '서브', '스윙', '랠리', '랠리 연습', '1:1 경기 신청 (친구 · 컴퓨터)', '2:2 복식 (빈자리는 컴퓨터)'],
  color: '#f2a37e',
  background: {
    size: 8,
    sky: ['#9fd4ff', '#b3dcff', '#c8e4ff', '#dcecff', '#eef3ff', '#fff3ec'],
    grass: '#92cf71',
    floor: 'grass',
    ground: ['#92cf71', '#84c465'],
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
  spawnPosition: { tx: 6.1, ty: 6.3 }, // at the court's corner
  availableActions: ['tennisMatch', 'tennisDoubles', 'serve', 'swing', 'rally', 'minigame', 'sit', 'wave', 'jump'],
  interactionObjects: [
    {
      id: 'net', kind: 'net', label: '테니스 코트', icon: '🎾', at: { tx: 4.0, ty: 4.0 },
      actions: ['tennisMatch', 'tennisDoubles', 'serve', 'swing', 'rally', 'minigame'],
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
    // green windscreens along the two back edges, a tile apart
    ...Array.from({ length: 15 }, (_, i) => ({ kind: 'windscreen' as const, at: { tx: fine(i + 1), ty: -0.1 }, yaw: 0 })),
    ...Array.from({ length: 15 }, (_, i) => ({ kind: 'windscreen' as const, at: { tx: -0.1, ty: fine(i + 1) }, yaw: Math.PI / 2 })),
    // the umpire's chair at the net (on the far side), the score board at the end of the court
    { kind: 'highChair', at: { tx: 4.0, ty: 1.75 }, yaw: 0 },
    { kind: 'scoreboard', at: { tx: 0.45, ty: 4.0 }, yaw: Math.PI / 2 },
    { kind: 'ballMachine', at: { tx: 7.3, ty: fine(5.2) } },
    { kind: 'cooler', at: { tx: 7.35, ty: 0.55 } },
    { kind: 'iceBox', at: { tx: 1.6, ty: 0.75 }, color: '#7fb7e8' },
    { kind: 'lamp', at: { tx: 7.4, ty: 1.4 } },
    { kind: 'lamp', at: { tx: 0.5, ty: 7.0 } },
    { kind: 'lamp', at: { tx: 7.3, ty: 7.0 } },
    { kind: 'balls', at: { tx: 1.0, ty: 1.6 } },
    { kind: 'bicycle', at: { tx: 6.2, ty: 7.55 }, yaw: 0.4 },
    // flowers along the front lawn
    ...([
      [1.6, 7.2, '#ffb3c6'], [3.3, 7.5, '#fff1a8'], [4.9, 7.2, '#ffffff'], [7.5, 5.9, '#ffb3c6'], [7.6, 2.9, '#c9b6ff'], [2.4, 6.6, '#ffd38a'],
    ] as const).map(([tx, ty, color]) => ({ kind: 'flowers' as const, at: { tx, ty }, color })),
    { kind: 'flowerbed', at: { tx: 4.0, ty: 7.6 }, color: '#ffd38a' },
    // a picnic spot on the front lawn to watch from
    { kind: 'picnicTable', at: { tx: fine(5.0), ty: 7.05 }, color: '#7fb7e8' },
    { kind: 'parasol', at: { tx: fine(6.4), ty: 7.2 } },
    { kind: 'iceBox', at: { tx: fine(7.2), ty: 7.0 } },
    { kind: 'picnicTable', at: { tx: 7.1, ty: fine(5.5) }, yaw: Math.PI / 2 },
    { kind: 'bush', at: { tx: 7.4, ty: 5.0 } },
    { kind: 'bush', at: { tx: 2.4, ty: 7.4 } },
  ],
  recommendedOutfits: [
    { name: '🎾 테니스룩', look: { top: 'tee', topColor: '#fffaf2', bottom: 'skirt', bottomColor: '#fffaf2', hat: 'cap' } },
    { name: '🧢 스포티', look: { top: 'hoodie', topColor: '#b5e8c9', bottom: 'shorts', bottomColor: '#5c6185', hat: 'cap' } },
  ],
};
