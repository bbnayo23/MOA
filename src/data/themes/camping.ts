import type { ThemeConfig } from './types';

export const camping: ThemeConfig = {
  themeId: 'camping',
  name: '캠핑장',
  emoji: '🏕️',
  tagline: '별 아래 모닥불 앞에서',
  activities: ['모닥불 피우기', '바비큐', '불멍', '텐트에서 쉬기', '호숫가 낚시 대결', '별자리 잇기'],
  color: '#86cfa0',
  background: {
    size: 8,
    sky: ['#6f6cc4', '#8a7fd3', '#a891dd', '#c4a3e0', '#e2b3d6', '#f7c7c4'],
    grass: '#8fcf86',
    floor: 'grass',
    ground: ['#9ad88e', '#8bcb80'],
    side: ['#c99b7a', '#b5876a'],
    night: true,
    flowers: ['#ffb3c6', '#fff1a8', '#c9b6ff', '#ffffff'],
    motes: 0xfff3a0,
    rugs: [
      // dirt paths trodden from the way in to the fire, and on to the tents and the grill
      { from: { tx: 5.5, ty: 5.5 }, to: { tx: 4.75, ty: 4.75 }, width: 0.42, color: '#d8bf8e', border: '#c4a576' },
      { from: { tx: 3.55, ty: 4.2 }, to: { tx: 1.9, ty: 4.2 }, width: 0.38, color: '#d8bf8e', border: '#c4a576' },
      { from: { tx: 4.2, ty: 3.55 }, to: { tx: 4.2, ty: 2.0 }, width: 0.38, color: '#d8bf8e', border: '#c4a576' },
      // a pond off to the right, a sandy bank round it
      { from: { tx: 6.0, ty: 3.4 }, to: { tx: 6.8, ty: 3.4 }, width: 1.7, color: '#e9d6a8', border: '#d9c08a' },
    ],
    water: { from: { tx: 6.0, ty: 3.4 }, to: { tx: 6.8, ty: 3.4 }, width: 1.45 },
  },
  spawnPosition: { tx: 5.15, ty: 5.15 }, // in sight of the fire
  availableActions: ['fireGaze', 'roast', 'bbq', 'rest', 'fishing', 'starGame', 'sit', 'wave', 'jump', 'dance'],
  interactionObjects: [
    {
      id: 'campfire', kind: 'campfire', label: '모닥불', icon: '🔥', at: { tx: 4.2, ty: 4.2 },
      actions: ['fireGaze', 'roast', 'starGame'],
      spots: [{ tx: 3.35, ty: 5.0 }, { tx: 5.0, ty: 3.35 }, { tx: 3.6, ty: 3.6 }],
    },
    {
      id: 'grill', kind: 'grill', label: '바비큐 그릴', icon: '🍖', at: { tx: 4.4, ty: 1.4 },
      actions: ['bbq'],
      spots: [{ tx: 3.9, ty: 1.9 }, { tx: 4.9, ty: 0.9 }],
    },
    {
      id: 'dock', kind: 'dock', label: '낚시터', icon: '🎣', at: { tx: 5.5, ty: 2.9 },
      actions: ['fishing'],
      spots: [{ tx: 5.95, ty: 3.35 }],
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
      [0.3, 7.2], [7.4, 1.1], [4.6, -0.2],
    ].map(([tx, ty]) => ({ kind: 'pine' as const, at: { tx, ty } })),
    ...[[0.4, 4.4], [2.2, 0.35], [5.3, 0.35], [0.35, 6.6]].map(([tx, ty]) => ({ kind: 'bush' as const, at: { tx, ty } })),
    { kind: 'tree', at: { tx: -0.4, ty: 3.6 } },
    { kind: 'tree', at: { tx: 5.4, ty: -0.5 } },
    // more tents along the back, firewood and an ice box between them
    { kind: 'tent', at: { tx: 1.36, ty: 2.55 }, color: '#9fd8b8' },
    { kind: 'tent', at: { tx: 2.55, ty: 1.45 }, color: '#ffd38a' },
    { kind: 'woodpile', at: { tx: 2.25, ty: 3.05 } },
    { kind: 'iceBox', at: { tx: 1.95, ty: 4.75 } },
    { kind: 'campChair', at: { tx: 2.3, ty: 5.0 }, color: '#ffb3c6' },
    { kind: 'lantern', at: { tx: 1.9, ty: 3.35 } },
    // round the fire: logs either side, camp chairs on the near side
    { kind: 'log', at: { tx: 3.3, ty: 4.9 } },
    { kind: 'log', at: { tx: 4.9, ty: 3.3 } },
    { kind: 'campChair', at: { tx: 5.0, ty: 4.55 }, yaw: -1.98, color: '#7fb7e8' },
    { kind: 'campChair', at: { tx: 4.55, ty: 5.0 }, yaw: -2.73, color: '#b5e8c9' },
    { kind: 'stump', at: { tx: 3.05, ty: 3.2 } },
    // the cookout: a picnic table by the grill, an ice box
    { kind: 'picnicTable', at: { tx: 3.3, ty: 1.75 } },
    { kind: 'iceBox', at: { tx: 5.05, ty: 1.5 }, color: '#7fb7e8' },
    // the pond: a canoe pulled up on the sand, reeds round the water
    { kind: 'canoe', at: { tx: 5.85, ty: 4.6 } },
    { kind: 'reeds', at: { tx: 7.55, ty: 2.55 } },
    { kind: 'reeds', at: { tx: 7.25, ty: 4.45 } },
    { kind: 'reeds', at: { tx: 5.15, ty: 3.75 } },
    { kind: 'signpost', at: { tx: 6.2, ty: 5.25 } },
    // the meadow in front: low things only (they never hide anyone)
    ...([
      [5.2, 6.3, '#ffb3c6'], [6.6, 6.0, '#fff1a8'], [3.4, 6.7, '#c9b6ff'], [6.3, 7.2, '#ffffff'], [2.6, 5.8, '#ffd38a'],
      [7.3, 5.4, '#ffb3c6'], [4.4, 7.3, '#a9cdfc'], [5.9, 6.9, '#c9b6ff'],
    ] as const).map(([tx, ty, color]) => ({ kind: 'flowers' as const, at: { tx, ty }, color })),
    { kind: 'mushrooms', at: { tx: 3.9, ty: 6.1 } },
    { kind: 'mushrooms', at: { tx: 1.0, ty: 5.9 }, color: '#ffa860' },
    { kind: 'mushrooms', at: { tx: 6.9, ty: 6.6 } },
    { kind: 'stump', at: { tx: 4.9, ty: 6.9 } },
    { kind: 'stump', at: { tx: 0.9, ty: 6.3 } },
    { kind: 'lantern', at: { tx: 2.2, ty: 6.4 } },
    { kind: 'lantern', at: { tx: 6.6, ty: 1.9 } },
    { kind: 'bush', at: { tx: 7.6, ty: 4.6 } },
    { kind: 'rock', at: { tx: 5.6, ty: 4.2 } },
    { kind: 'bush', at: { tx: 1.6, ty: 7.4 } },
    { kind: 'rock', at: { tx: 7.0, ty: 7.0 } },
    { kind: 'rock', at: { tx: 0.8, ty: 6.8 } },
  ],
  recommendedOutfits: [
    { name: '🌲 캠핑 후디', look: { top: 'hoodie', topColor: '#b5e8c9', bottom: 'pants', bottomColor: '#5c6185', hat: 'beanie' } },
    { name: '🔥 불멍 니트', look: { top: 'stripe', topColor: '#ff9a7a', accessory: 'scarf', hat: 'none' } },
  ],
};
