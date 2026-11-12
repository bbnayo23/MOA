import type { Tile } from '../../game/iso';
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
      hills: ['#c4d9f5', '#b3e0c8'],
      ground: ['#f6efe7', '#ece4f4'],
      side: ['#d8c9e6', '#c4b4d8'],
      flowers: ['#ffb3c6', '#fff1a8', '#c9b6ff'],
      rugs: [
        { from: { tx: 0, ty: 4 }, to: { tx: 8, ty: 4 }, width: 1.1, color: '#f8dcc8', border: '#efc6a8' },
        { from: { tx: 4, ty: 0 }, to: { tx: 4, ty: 8 }, width: 1.1, color: '#f8dcc8', border: '#efc6a8' },
      ],
      motes: 0xffd6e0,
    },
    spawnPosition: { tx: 5.4, ty: 5.4 },
    availableActions: ['sit', 'wave', 'dance'],
    interactionObjects: [...buildings, bench('bench-l', { tx: 2.7, ty: 5.1 }), bench('bench-r', { tx: 5.1, ty: 2.7 })],
    decorations: [
      { kind: 'fountain', at: { tx: 4, ty: 4 } },
      { kind: 'bush', at: { tx: 1.8, ty: 7.5 } }, // beside the end doors, not on their step
      { kind: 'bush', at: { tx: 7.5, ty: 1.8 } },
      { kind: 'plant', at: { tx: 3.6, ty: 7.5 } },
      { kind: 'plant', at: { tx: 7.5, ty: 3.6 } },
      { kind: 'rock', at: { tx: 2.6, ty: 7.3 } },
      { kind: 'rock', at: { tx: 7.3, ty: 2.6 } },
    ],
    recommendedOutfits: [],
  };
}
