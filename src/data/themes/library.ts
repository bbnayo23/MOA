import type { Tile } from '../../world/space';
import { behind } from './seats';
import type { InteractionObject, ThemeConfig } from './types';

const table = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'table', label: '열람 테이블', icon: '📖', at,
  actions: ['read', 'study', 'memoryGame'],
  spots: [behind(at, 0.25), behind(at, -0.25)],
});

const desk = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'desk', label: '스터디 데스크', icon: '✏️', at,
  actions: ['focus', 'study', 'bookGame'],
  spots: [behind(at, 0.15)],
});

export const library: ThemeConfig = {
  themeId: 'library',
  name: '도서관',
  emoji: '📚',
  tagline: '사각사각 집중 모드',
  activities: ['책 읽기', '공부하기', '집중 타이머', '안락의자에서 독서', '기억력 카드 대결', '책 찾기'],
  color: '#c9a27e',
  background: {
    size: 8,
    sky: ['#e4efe6', '#e8f0e4', '#edf1e2', '#f1f2e0'],
    floor: 'wood',
    ground: ['#d6a571', '#c79563'],
    side: ['#a8825f', '#94704f'],
    walls: { left: '#f1e4cb', right: '#e3d3b6', trim: '#8a6646', glass: ['#cfe8ff', '#e3f2ff'] },
    rugs: [
      { from: { tx: 2.2, ty: 4.2 }, to: { tx: 6.4, ty: 4.2 }, width: 3.2, color: '#a9d6b0', border: '#86c093' },
    ],
    motes: 0xfff8e1,
  },
  spawnPosition: { tx: 6.0, ty: 6.0 },
  availableActions: ['read', 'study', 'focus', 'memoryGame', 'bookGame', 'sit', 'wave', 'jump'],
  interactionObjects: [
    table('table-l', { tx: 3.4, ty: 4.6 }),
    table('table-r', { tx: 4.9, ty: 3.1 }),
    table('table-3', { tx: 2.2, ty: 6.4 }),
    table('table-4', { tx: 6.4, ty: 4.4 }),
    // reading nooks by the left wall
    ...[4.45, 6.45].map((ty, i) => ({
      id: `armchair-${i + 1}`, kind: 'armchair' as const, label: '안락의자', icon: '🛋️', at: { tx: 0.5, ty }, color: i ? '#b5e8c9' : '#ffd38a',
      actions: ['sit' as const, 'read' as const],
      spots: [{ tx: 0.56, ty }],
    })),
    desk('desk-1', { tx: 5.2, ty: 0.95 }),
    desk('desk-2', { tx: 7.2, ty: 0.95 }),
  ],
  decorations: [
    ...[[0.45, 1.6], [0.45, 3.5], [0.45, 5.4], [1.6, 0.45], [3.5, 0.45], [6.2, 0.45]].map(([tx, ty]) => ({
      kind: 'bookshelf' as const,
      at: { tx, ty },
    })),
    { kind: 'plant', at: { tx: 0.5, ty: 7.3 } },
    { kind: 'plant', at: { tx: 7.4, ty: 6.2 } },
    { kind: 'plant', at: { tx: 7.6, ty: 2.4 } },
    // a short row of shelves standing out in the room
    ...[[2.2, 2.6], [2.4, 2.4], [2.6, 2.2]].map(([tx, ty]) => ({ kind: 'bookshelf' as const, at: { tx, ty } })),
    { kind: 'globe', at: { tx: 1.4, ty: 1.6 } },
    { kind: 'bookCart', at: { tx: 4.3, ty: 6.0 } },
    { kind: 'bookCart', at: { tx: 6.9, ty: 5.2 } },
    { kind: 'globe', at: { tx: 5.3, ty: 7.1 } },
    { kind: 'floorLamp', at: { tx: 0.4, ty: 3.95 } },
    { kind: 'floorLamp', at: { tx: 0.4, ty: 5.95 } },
    { kind: 'frame', at: { tx: 0.12, ty: 4.45 }, color: '#ffd38a' },
    { kind: 'frame', at: { tx: 2.55, ty: 0.12 }, color: '#a9cdfc' },
  ],
  recommendedOutfits: [
    { name: '📚 니트 + 안경', look: { top: 'stripe', topColor: '#cbb8ff', accessory: 'glasses', hat: 'none' } },
    { name: '☕ 포근한 후디', look: { top: 'hoodie', topColor: '#ffd38a', hat: 'beanie' } },
  ],
};
