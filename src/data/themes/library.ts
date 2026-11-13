import type { Tile } from '../../world/space';
import { behind } from './seats';
import type { InteractionObject, ThemeConfig } from './types';

const table = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'table', label: '열람 테이블', icon: '📖', at,
  actions: ['read', 'study'],
  spots: [behind(at, 0.3), behind(at, -0.3)],
});

const desk = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'desk', label: '스터디 데스크', icon: '✏️', at,
  actions: ['focus', 'study'],
  spots: [behind(at, 0.15)],
});

export const library: ThemeConfig = {
  themeId: 'library',
  name: '도서관',
  emoji: '📚',
  tagline: '사각사각 집중 모드',
  activities: ['책 읽기', '공부하기', '집중 타이머'],
  color: '#c9a27e',
  background: {
    size: 8,
    sky: ['#e4efe6', '#e8f0e4', '#edf1e2', '#f1f2e0'],
    ground: ['#d9b48a', '#cfa87e'],
    side: ['#a8825f', '#94704f'],
    walls: { left: '#f4ead8', right: '#e8dcc6', trim: '#9c7a5a', glass: ['#cfe8ff', '#e3f2ff'] },
    rugs: [{ from: { tx: 2.2, ty: 4.2 }, to: { tx: 6.4, ty: 4.2 }, width: 3.2, color: '#a9d6b0', border: '#86c093' }],
    motes: 0xfff8e1,
  },
  spawnPosition: { tx: 6.0, ty: 6.0 },
  availableActions: ['read', 'study', 'focus', 'sit', 'wave'],
  interactionObjects: [
    table('table-l', { tx: 3.4, ty: 4.6 }),
    table('table-r', { tx: 4.9, ty: 3.1 }),
    desk('desk-1', { tx: 5.2, ty: 0.95 }),
    desk('desk-2', { tx: 7.2, ty: 0.95 }),
  ],
  decorations: [
    ...[[0.45, 1.6], [0.45, 3.5], [0.45, 5.4], [1.6, 0.45], [3.5, 0.45]].map(([tx, ty]) => ({
      kind: 'bookshelf' as const,
      at: { tx, ty },
    })),
    { kind: 'plant', at: { tx: 0.5, ty: 7.3 } },
    { kind: 'plant', at: { tx: 7.6, ty: 2.4 } },
  ],
  recommendedOutfits: [
    { name: '📚 니트 + 안경', look: { top: 'stripe', topColor: '#cbb8ff', accessory: 'glasses', hat: 'none' } },
    { name: '☕ 포근한 후디', look: { top: 'hoodie', topColor: '#ffd38a', hat: 'beanie' } },
  ],
};
