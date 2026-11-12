import type { ThemeConfig } from './types';

export const camping: ThemeConfig = {
  themeId: 'camping',
  name: '캠핑장',
  emoji: '🏕️',
  tagline: '별 아래 모닥불 앞에서',
  activities: ['모닥불 피우기', '바비큐', '불멍', '텐트에서 쉬기'],
  color: '#86cfa0',
  background: {
    size: 8,
    sky: ['#6f6cc4', '#8a7fd3', '#a891dd', '#c4a3e0', '#e2b3d6', '#f7c7c4'],
    hills: ['#a596d8', '#8379c4'],
    ground: ['#b8e6b0', '#a9dca3'],
    side: ['#c99b7a', '#b5876a'],
    night: true,
    flowers: ['#ffb3c6', '#fff1a8', '#c9b6ff', '#ffffff'],
    motes: 0xfff3a0,
  },
  spawnPosition: { tx: 5.6, ty: 5.6 },
  availableActions: ['fireGaze', 'roast', 'bbq', 'rest', 'sit', 'wave', 'dance'],
  interactionObjects: [
    {
      id: 'campfire', kind: 'campfire', label: '모닥불', icon: '🔥', at: { tx: 4.2, ty: 4.2 },
      actions: ['fireGaze', 'roast'],
      spots: [{ tx: 3.35, ty: 5.0 }, { tx: 5.0, ty: 3.35 }, { tx: 3.6, ty: 3.6 }],
    },
    {
      id: 'grill', kind: 'grill', label: '바비큐 그릴', icon: '🍖', at: { tx: 4.4, ty: 1.4 },
      actions: ['bbq'],
      spots: [{ tx: 3.9, ty: 1.9 }, { tx: 4.9, ty: 0.9 }],
    },
    {
      id: 'tent', kind: 'tent', label: '텐트', icon: '⛺', at: { tx: 1.3, ty: 4.0 },
      actions: ['rest'],
      spots: [{ tx: 1.9, ty: 4.5 }],
    },
  ],
  decorations: [
    // forest behind and along the back edges
    ...[
      [-0.8, 1], [1, -0.8], [-0.6, 2.5], [2.5, -0.6], [-0.5, 4.5], [4.5, -0.5],
      [0.2, 1.2], [1.3, 0.2], [0.3, 3.2], [3.4, 0.3], [0.2, 5.6], [6.0, 0.2], [7.5, 0.4],
    ].map(([tx, ty]) => ({ kind: 'pine' as const, at: { tx, ty } })),
    { kind: 'log', at: { tx: 3.3, ty: 4.9 } },
    { kind: 'log', at: { tx: 4.9, ty: 3.3 } },
    { kind: 'lantern', at: { tx: 2.2, ty: 6.4 } },
    { kind: 'lantern', at: { tx: 6.6, ty: 2.0 } },
    { kind: 'bush', at: { tx: 7.4, ty: 4.6 } },
    { kind: 'bush', at: { tx: 1.6, ty: 7.4 } },
    { kind: 'rock', at: { tx: 7.0, ty: 7.0 } },
    { kind: 'rock', at: { tx: 0.8, ty: 6.8 } },
  ],
  recommendedOutfits: [
    { name: '🌲 캠핑 후디', look: { top: 'hoodie', topColor: '#b5e8c9', bottom: 'pants', bottomColor: '#5c6185', hat: 'beanie' } },
    { name: '🔥 불멍 니트', look: { top: 'stripe', topColor: '#ff9a7a', accessory: 'scarf', hat: 'none' } },
  ],
};
