import type { InteractionObject, ThemeConfig } from './types';

// Pews in three rows either side of the aisle (which runs up the screen's centre line).
const pews: InteractionObject[] = [6, 8, 10].flatMap((sum, row) =>
  [-1.7, 1.7].map((d, side) => {
    const at = { tx: (sum - d) / 2, ty: (sum + d) / 2 };
    return {
      id: `pew-${row}-${side}`, kind: 'pew' as const, label: '긴 의자', icon: '🪑', at,
      actions: ['sit' as const],
      spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + o + 0.08, ty: at.ty - o + 0.08 })),
    };
  }),
);

export const church: ThemeConfig = {
  themeId: 'church',
  name: '교회',
  emoji: '⛪',
  tagline: '조용히 마음을 모으는 곳',
  activities: ['기도하기', '앉기', '촛불 켜기', '응원 메시지 남기기'],
  color: '#d6b48c',
  background: {
    size: 8,
    sky: ['#f4e4f2', '#f6e6ec', '#f8e9e6', '#faece0'],
    ground: ['#f0dcc0', '#e8d0b0'],
    side: ['#c99b7a', '#b5876a'],
    walls: { left: '#fbf3e8', right: '#f1e3d2', trim: '#d6b48c', glass: ['#ffb3c6', '#a9cdfc', '#ffe08a', '#b5e8c9', '#cbb8ff'] },
    rugs: [{ from: { tx: 2.4, ty: 2.4 }, to: { tx: 8, ty: 8 }, width: 1.1, color: '#e98aa2', border: '#f6c76b' }],
    motes: 0xfff8e1,
  },
  spawnPosition: { tx: 6.6, ty: 6.6 },
  availableActions: ['pray', 'sit', 'lightCandle', 'cheer', 'wave'],
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
  ],
  recommendedOutfits: [
    { name: '👔 단정한 재킷', look: { top: 'jacket', topColor: '#5c6185', bottom: 'pants', bottomColor: '#5c6185', hat: 'none' } },
    { name: '🎀 주일 원피스룩', look: { top: 'tee', topColor: '#fffaf2', bottom: 'skirt', bottomColor: '#cbb8ff', hat: 'ribbon' } },
  ],
};
