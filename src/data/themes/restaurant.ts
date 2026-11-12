import type { Tile } from '../../game/iso';
import { behind } from './seats';
import type { InteractionObject, ThemeConfig } from './types';

export interface MenuItem {
  emoji: string;
  name: string;
  desc: string;
}

export const MENU: MenuItem[] = [
  { emoji: '🍝', name: '크림 파스타', desc: '오늘의 시그니처' },
  { emoji: '🍕', name: '마르게리타 피자', desc: '둘이 나눠 먹기 좋아요' },
  { emoji: '🍔', name: '수제 버거', desc: '감자튀김 포함' },
  { emoji: '🥗', name: '리코타 샐러드', desc: '가볍게 한 접시' },
  { emoji: '🍰', name: '딸기 케이크', desc: '디저트는 별도 배' },
  { emoji: '🧋', name: '흑당 버블티', desc: '달달한 마무리' },
];

const table = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'diningTable', label: '테이블', icon: '🍽️', at,
  actions: ['eat', 'drink', 'talk'],
  spots: [behind(at, 0.3, 0.45), behind(at, -0.3, 0.45)],
});

export const restaurant: ThemeConfig = {
  themeId: 'restaurant',
  name: '레스토랑',
  emoji: '🍝',
  tagline: '맛있는 수다 타임',
  activities: ['음식 주문', '식사하기', '음료 마시기', '대화하기'],
  color: '#ff9a8a',
  background: {
    size: 8,
    sky: ['#ffe9e4', '#fff0e6', '#fff5e8', '#fffaeb'],
    ground: ['#fffaf5', '#ffd9d0'],
    side: ['#e3b7a8', '#d5a596'],
    walls: { left: '#fff6f0', right: '#ffe9e1', trim: '#e98a7a', glass: ['#ffe8b8', '#ffd6e0'] },
  },
  spawnPosition: { tx: 6.4, ty: 6.4 },
  availableActions: ['order', 'eat', 'drink', 'talk', 'wave'],
  interactionObjects: [
    {
      id: 'counter', kind: 'counter', label: '주문 카운터', icon: '🧾', at: { tx: 3.0, ty: 0.75 },
      actions: ['order'],
      spots: [{ tx: 3.55, ty: 1.3 }, { tx: 4.05, ty: 0.8 }],
    },
    table('table-1', { tx: 2.2, ty: 3.8 }),
    table('table-2', { tx: 3.8, ty: 2.2 }),
    table('table-3', { tx: 3.7, ty: 5.3 }),
    table('table-4', { tx: 5.3, ty: 3.7 }),
  ],
  decorations: [
    { kind: 'menuboard', at: { tx: 5.2, ty: 0.5 } },
    { kind: 'plant', at: { tx: 0.5, ty: 1.4 } },
    { kind: 'plant', at: { tx: 0.5, ty: 7.2 } },
    { kind: 'plant', at: { tx: 7.4, ty: 0.6 } },
  ],
  recommendedOutfits: [
    { name: '🍷 디너 재킷', look: { top: 'jacket', topColor: '#5c6185', bottom: 'pants', bottomColor: '#5c6185', hat: 'none' } },
    { name: '🌸 브런치 룩', look: { top: 'tee', topColor: '#ffb3c6', bottom: 'skirt', bottomColor: '#fffaf2', hat: 'ribbon' } },
  ],
};
