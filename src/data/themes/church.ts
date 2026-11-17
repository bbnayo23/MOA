import { fine } from './grid';
import type { InteractionObject, ThemeConfig } from './types';

// Pews in four rows either side of the aisle (which runs up the screen's centre line).
const pews: InteractionObject[] = [6, 8, 10, 12].flatMap((sum, row) =>
  [-1.7, 1.7].map((d, side) => {
    const at = { tx: (sum - d) / 2, ty: (sum + d) / 2 };
    return {
      id: `pew-${row}-${side}`, kind: 'pew' as const, label: '긴 의자', icon: '🪑', at,
      actions: ['sit' as const, 'breathe' as const, 'glassGame' as const],
      spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + o + 0.08, ty: at.ty - o + 0.08 })),
    };
  }),
);

export const church: ThemeConfig = {
  themeId: 'church',
  name: '교회',
  emoji: '⛪',
  tagline: '조용히 마음을 모으는 곳',
  activities: ['기도하기', '앉기', '촛불 켜기', '응원 메시지 남기기', '함께 호흡하기 (점수 없음)', '스테인드글라스 함께 맞추기 (점수 없음)'],
  color: '#d6b48c',
  background: {
    size: 8,
    sky: ['#f4e4f2', '#f6e6ec', '#f8e9e6', '#faece0'],
    ground: ['#efd8b6', '#e0c39b'],
    side: ['#c99b7a', '#b5876a'],
    walls: { left: '#f8eee0', right: '#ecdcc6', trim: '#c49a68', glass: ['#ffb3c6', '#a9cdfc', '#ffe08a', '#b5e8c9', '#cbb8ff'] },
    rugs: [
      { from: { tx: 2.4, ty: 2.4 }, to: { tx: 8, ty: 8 }, width: 1.1, color: '#e98aa2', border: '#f6c76b' },
      // the chancel: a pale rug across the front of the altar
      { from: { tx: 0.9, ty: 3.0 }, to: { tx: 3.0, ty: 0.9 }, width: 0.75, color: '#f6e6cc', border: '#e2c47d' },
    ],
    motes: 0xfff8e1,
  },
  spawnPosition: { tx: 6.6, ty: 6.6 },
  availableActions: ['pray', 'sit', 'breathe', 'glassGame', 'lightCandle', 'cheer', 'wave'],
  interactionObjects: [
    {
      id: 'altar', kind: 'altar', label: '제단', icon: '✝️', at: { tx: 1.4, ty: 1.4 },
      actions: ['pray'],
      spots: [{ tx: 2.3, ty: 2.3 }, { tx: 1.7, ty: 2.9 }, { tx: 2.9, ty: 1.7 }],
    },
    {
      id: 'candles', kind: 'candles', label: '촛불', icon: '🕯️', at: { tx: 0.7, ty: 3.6 },
      actions: ['lightCandle'],
      spots: [{ tx: 1.5, ty: 3.9 }, { tx: 0.9, ty: 4.5 }],
    },
    {
      id: 'board', kind: 'board', label: '응원 보드', icon: '💌', at: { tx: 3.6, ty: 0.7 },
      actions: ['cheer'],
      spots: [{ tx: 3.9, ty: 1.5 }, { tx: 4.5, ty: 0.9 }],
    },
    ...pews,
  ],
  decorations: [
    { kind: 'plant', at: { tx: 0.5, ty: 2.2 } },
    { kind: 'plant', at: { tx: 2.2, ty: 0.5 } },
    { kind: 'plant', at: { tx: 0.6, ty: 7.0 } },
    { kind: 'plant', at: { tx: 7.0, ty: 0.6 } },
    { kind: 'plant', at: { tx: 0.5, ty: 5.2 } },
    { kind: 'plant', at: { tx: 5.2, ty: 0.5 } },
    { kind: 'plant', at: { tx: 7.4, ty: 3.4 } },
    { kind: 'plant', at: { tx: 3.4, ty: 7.4 } },
    // columns either side of the front pews, flowers by the altar
    ...[[1.6, 4.4], [4.4, 1.6], [2.6, 5.4], [5.4, 2.6]].map(([tx, ty]) => ({ kind: 'pillar' as const, at: { tx, ty } })),
    // pews in the rows between (only the ones above are for sitting)
    ...[7, 9, 11].flatMap((sum) => [-1.7, 1.7].map((d) => ({ kind: 'pew' as const, at: { tx: (sum - d) / 2, ty: (sum + d) / 2 } }))),
    // and further out, behind the pillars
    ...[9, 10, 11, 12].flatMap((sum) => [-2.8, 2.8].map((d) => ({ kind: 'pew' as const, at: { tx: (sum - d) / 2, ty: (sum + d) / 2 } }))),
    // by the altar: a reading stand, candle stands either side of the aisle; a piano by the left wall
    { kind: 'lectern', at: { tx: fine(4.6), ty: fine(1.6) } },
    { kind: 'candelabra', at: { tx: fine(3.2), ty: fine(6.0) } },
    { kind: 'candelabra', at: { tx: fine(6.0), ty: fine(3.2) } },
    { kind: 'piano', at: { tx: 0.5, ty: fine(12.6) } },
    { kind: 'bouquet', at: { tx: 1.1, ty: 2.6 }, color: '#fffaf2' },
    { kind: 'bouquet', at: { tx: 2.6, ty: 1.1 }, color: '#ffb3c6' },
    // and at the door, either side of the aisle
    { kind: 'bouquet', at: { tx: 6.1, ty: 7.5 }, color: '#fffaf2' },
    { kind: 'bouquet', at: { tx: 7.5, ty: 6.1 }, color: '#fffaf2' },
  ],
  recommendedOutfits: [
    { name: '👔 단정한 재킷', look: { top: 'jacket', topColor: '#5c6185', bottom: 'pants', bottomColor: '#5c6185', hat: 'none' } },
    { name: '🎀 주일 원피스룩', look: { top: 'tee', topColor: '#fffaf2', bottom: 'skirt', bottomColor: '#cbb8ff', hat: 'ribbon' } },
  ],
};
