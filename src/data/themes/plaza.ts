import type { Tile } from '../../world/space';
import type { InteractionObject, ThemeConfig, ThemeId, ThemeMeta } from './types';

const bench = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'pew', label: '벤치', icon: '🪑', at,
  actions: ['sit'],
  spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + o + 0.08, ty: at.ty - o + 0.08 })),
});

/** The hub: one building per theme along the back edges; open ones in colour. */
export function makePlaza(themes: ThemeMeta[], isOpen: (id: ThemeId) => boolean): ThemeConfig {
  // alternating left / right edge, starting from the top corner
  const buildings: InteractionObject[] = themes.map((t, i) => {
    const along = 1.5 + 1.8 * Math.floor(i / 2);
    const at = i % 2 ? { tx: along, ty: 0.55 } : { tx: 0.55, ty: along };
    return {
      id: `door-${t.themeId}`, kind: 'building', label: t.name, icon: t.emoji, at,
      actions: [],
      spots: [{ tx: at.tx + 0.55, ty: at.ty + 0.55 }],
      color: t.color,
      enter: t.themeId,
      locked: !isOpen(t.themeId),
    };
  });

  return {
    themeId: 'plaza',
    name: '모아 광장',
    emoji: '⛲',
    tagline: '우리 모두 모이는 곳',
    activities: ['친구 만나기', '테마 공간 들어가기'],
    color: '#c9b6ff',
    background: {
      size: 8,
      sky: ['#a9c8ff', '#bcd2ff', '#cfdcff', '#e2e3ff', '#f3e6fb', '#ffe9f0'],
      grass: '#92cf71',
      floor: 'grass',
      ground: ['#92cf71', '#84c465'],
      side: ['#d8c9e6', '#c4b4d8'],
      flowers: ['#ffb3c6', '#fff1a8', '#ffffff', '#ff9a7a'],
      // a lawn with cobbled streets: along the shop fronts, across the middle, round the fountain
      rugs: [
        { from: { tx: 0, ty: 1.25 }, to: { tx: 8, ty: 1.25 }, width: 0.75, color: '#e2cfb6', border: '#b49c80', stone: true },
        { from: { tx: 1.25, ty: 0 }, to: { tx: 1.25, ty: 8 }, width: 0.75, color: '#e2cfb6', border: '#b49c80', stone: true },
        { from: { tx: 0, ty: 4 }, to: { tx: 8, ty: 4 }, width: 0.9, color: '#e2cfb6', border: '#b49c80', stone: true },
        { from: { tx: 4, ty: 0 }, to: { tx: 4, ty: 8 }, width: 0.9, color: '#e2cfb6', border: '#b49c80', stone: true },
        { from: { tx: 4, ty: 4 }, to: { tx: 4, ty: 4 }, width: 2.3, color: '#ead9c2', border: '#b49c80', stone: true },
      ],
      motes: 0xffd6e0,
    },
    spawnPosition: { tx: 4.75, ty: 4.75 }, // just in front of the fountain, buildings in view
    availableActions: ['sit', 'wave', 'jump', 'dance'],
    interactionObjects: [
      ...buildings,
      bench('bench-l', { tx: 2.7, ty: 5.1 }),
      bench('bench-r', { tx: 5.1, ty: 2.7 }),
      bench('bench-3', { tx: 6.2, ty: 5.3 }),
      bench('bench-4', { tx: 5.3, ty: 6.2 }),
    ],
    decorations: [
      { kind: 'fountain', at: { tx: 4, ty: 4 } },
      { kind: 'bush', at: { tx: 1.8, ty: 7.5 } }, // beside the end doors, not on their step
      { kind: 'bush', at: { tx: 7.5, ty: 1.8 } },
      { kind: 'plant', at: { tx: 3.6, ty: 7.5 } },
      { kind: 'plant', at: { tx: 7.5, ty: 3.6 } },
      { kind: 'rock', at: { tx: 2.6, ty: 7.3 } },
      { kind: 'rock', at: { tx: 7.3, ty: 2.6 } },
      { kind: 'tree', at: { tx: 2.45, ty: 2.5 } },
      { kind: 'tree', at: { tx: 2.1, ty: 6.3 } },
      { kind: 'tree', at: { tx: 6.3, ty: 2.1 } },
      { kind: 'lamp', at: { tx: 3.35, ty: 4.7 } },
      { kind: 'lamp', at: { tx: 4.7, ty: 3.35 } },
      { kind: 'lamp', at: { tx: 6.9, ty: 4.7 } },
      { kind: 'lamp', at: { tx: 4.7, ty: 6.9 } },
    ],
    recommendedOutfits: [],
  };
}
