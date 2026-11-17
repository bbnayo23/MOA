import { FACE_CAMERA, type Tile } from '../../world/space';
import type { InteractionObject, ThemeConfig, ThemeId, ThemeMeta } from './types';

/**
 * The hub: a little town. Along the left (back) edge a high street of shops —
 * one per theme, their doors are the way in — with a pavement, a road with a
 * zebra crossing and power poles; along the right (back) edge the station,
 * where a train pulls in now and then past a level crossing; in the middle a
 * square with a fountain, benches and trees; lawns with flower beds in front.
 * Houses and trees fill the streets behind. Laid out on the full 16 × 16 map
 * (no stretching), and you walk on the map only, like a real square.
 */

const RIGHT = Math.PI / 2; // facing +x: the shops along the left edge, facing the road
const DOWN = 0; // facing +z: things along the right edge, facing the town

/** A bench facing `yaw`, two seats along it. */
const bench = (id: string, at: Tile, yaw = FACE_CAMERA): InteractionObject => {
  const along = { tx: Math.cos(yaw), ty: -Math.sin(yaw) }, front = { tx: Math.sin(yaw) * 0.08, ty: Math.cos(yaw) * 0.08 };
  return {
    id, kind: 'pew', label: '벤치', icon: '🪑', at, yaw,
    actions: ['sit'],
    spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + along.tx * o + front.tx, ty: at.ty + along.ty * o + front.ty })),
  };
};

const PAVERS = { color: '#e3d6c3', border: '#b8a993', pattern: 'pavers' } as const;
const COBBLES = { color: '#e2cfb6', border: '#b49c80', pattern: 'stone' } as const;
const SHOP_TY = (i: number) => 1.7 + 2.0 * i;

export function makePlaza(themes: ThemeMeta[], isOpen: (id: ThemeId) => boolean): ThemeConfig {
  // the high street: a shop per theme, straddling the left edge, facing the road
  const shops: InteractionObject[] = themes.map((t, i) => {
    const at = { tx: 0.1, ty: SHOP_TY(i) };
    return {
      id: `door-${t.themeId}`, kind: 'shop', label: t.name, icon: t.emoji, at, yaw: RIGHT,
      actions: [],
      spots: [{ tx: 1.55, ty: at.ty - 0.5 }], // on the pavement, at the door
      color: t.color,
      enter: t.themeId,
      locked: !isOpen(t.themeId),
    };
  });
  const SQUARE = { tx: 10, ty: 9 };

  return {
    themeId: 'plaza',
    name: '모아 마을',
    emoji: '🏘️',
    tagline: '우리 모두 모이는 곳',
    activities: ['친구 만나기', '테마 공간 들어가기'],
    color: '#c9b6ff',
    background: {
      size: 16,
      wild: 0,
      sky: ['#a9c8ff', '#bcd2ff', '#cfdcff', '#e2e3ff', '#f3e6fb', '#ffe9f0'],
      grass: '#92cf71',
      floor: 'grass',
      ground: ['#92cf71', '#84c465'],
      side: ['#d8c9e6', '#c4b4d8'],
      flowers: ['#ffb3c6', '#fff1a8', '#ffffff', '#ff9a7a'],
      rugs: [
        // the high street: pavement by the shops, the road, the far pavement, a zebra crossing
        { from: { tx: 1.4, ty: -1 }, to: { tx: 1.4, ty: 17 }, width: 1.2, ...PAVERS },
        { from: { tx: 2.8, ty: -1 }, to: { tx: 2.8, ty: 17 }, width: 1.6, color: '#6e6878', border: '#d6d0c8', pattern: 'road' },
        { from: { tx: 4.0, ty: -1 }, to: { tx: 4.0, ty: 17 }, width: 0.8, ...PAVERS },
        { from: { tx: 2.05, ty: SQUARE.ty }, to: { tx: 3.55, ty: SQUARE.ty }, width: 1.0, color: '#f4f1ea', border: '#f4f1ea', pattern: 'crosswalk' },
        // the station's forecourt along the right edge, its yellow tactile line
        { from: { tx: 4.4, ty: 0.5 }, to: { tx: 17, ty: 0.5 }, width: 1.0, color: '#dddad5', border: '#bdb9b2', pattern: 'pavers' },
        { from: { tx: 4.4, ty: 0.2 }, to: { tx: 17, ty: 0.2 }, width: 0.16, color: '#f2c94c', border: '#f2c94c', pattern: 'tactile' },
        // cobbled paths to the square, and the square round the fountain
        { from: { tx: SQUARE.tx, ty: 1 }, to: SQUARE, width: 1.1, ...COBBLES },
        { from: { tx: 4.4, ty: SQUARE.ty }, to: SQUARE, width: 1.1, ...COBBLES },
        { from: SQUARE, to: { tx: SQUARE.tx, ty: 17 }, width: 1.1, ...COBBLES },
        { from: SQUARE, to: { tx: 17, ty: SQUARE.ty }, width: 1.1, ...COBBLES },
        { from: SQUARE, to: SQUARE, width: 5.6, ...COBBLES },
      ],
      motes: 0xffd6e0,
    },
    spawnPosition: { tx: 11.3, ty: 10.6 }, // by the fountain, the high street and the station in view
    availableActions: ['sit', 'wave', 'jump', 'dance'],
    interactionObjects: [
      ...shops,
      bench('bench-a', { tx: 7.9, ty: 6.9 }),
      bench('bench-b', { tx: 12.4, ty: 6.6 }, -Math.PI / 4),
      bench('bench-station-1', { tx: 7.2, ty: 0.6 }, DOWN),
      bench('bench-station-2', { tx: 11.2, ty: 0.6 }, DOWN),
      bench('bench-park', { tx: 6.6, ty: 13.6 }),
    ],
    decorations: [
      // the station and its railway (past the right edge), the level crossing on the high street
      { kind: 'railway', at: { tx: 8, ty: -1.65 } },
      { kind: 'station', at: { tx: 9.2, ty: -0.5 } },
      { kind: 'crossing', at: { tx: 2.8, ty: -1.65 } },
      { kind: 'vending', at: { tx: 13.7, ty: 0.45 }, yaw: DOWN },
      { kind: 'vending', at: { tx: 14.2, ty: 0.45 }, yaw: DOWN, color: '#ffd6e0' },
      { kind: 'bicycle', at: { tx: 15.2, ty: 1.5 }, yaw: DOWN },
      { kind: 'bicycle', at: { tx: 15.2, ty: 2.1 }, yaw: DOWN, color: '#ff9a7a' },
      // the high street: poles carrying the wires, street trees, lamps, a post box, the bus stop
      ...[2.6, 6.6, 10.6, 14.6].map((ty) => ({ kind: 'pole' as const, at: { tx: 4.25, ty } })),
      { kind: 'planterTree', at: { tx: 4.15, ty: 4.6 } },
      { kind: 'planterTree', at: { tx: 4.15, ty: 12.6 } },
      { kind: 'lamp', at: { tx: 1.95, ty: 5.6 } },
      { kind: 'lamp', at: { tx: 1.95, ty: 11.6 } },
      { kind: 'vending', at: { tx: 0.95, ty: SHOP_TY(2) + 1.0 }, yaw: RIGHT },
      { kind: 'mailbox', at: { tx: 4.7, ty: 10.4 } },
      { kind: 'busStop', at: { tx: 4.6, ty: 7.8 } },
      { kind: 'plant', at: { tx: 1.05, ty: SHOP_TY(1) + 0.5 } },
      { kind: 'plant', at: { tx: 1.05, ty: SHOP_TY(4) + 0.5 } },
      { kind: 'plant', at: { tx: 1.05, ty: SHOP_TY(6) + 0.5 } },
      { kind: 'bicycle', at: { tx: 1.0, ty: SHOP_TY(5) + 1.0 }, yaw: RIGHT, color: '#9fe0b8' },
      // the square
      { kind: 'fountain', at: SQUARE },
      { kind: 'planterTree', at: { tx: 6.9, ty: 5.7 } },
      { kind: 'planterTree', at: { tx: 13.3, ty: 5.6 } },
      { kind: 'lamp', at: { tx: 7.5, ty: 11.6 } },
      { kind: 'lamp', at: { tx: 12.5, ty: 11.5 } },
      { kind: 'lamp', at: { tx: 11.4, ty: 5.4 } },
      { kind: 'flowerbed', at: { tx: 8.0, ty: 12.4 }, color: '#ff8fab' },
      { kind: 'flowerbed', at: { tx: 12.4, ty: 12.1 }, color: '#ffd166' },
      { kind: 'kiosk', at: { tx: 13.9, ty: 7.6 }, color: '#7cc4f0' },
      { kind: 'planterTree', at: { tx: 8.6, ty: 4.0 } },
      // lawns: flower beds, hedges, bushes (nothing tall at the front, so no one is hidden)
      { kind: 'flowerbed', at: { tx: 7.6, ty: 3.4 }, color: '#cbb8ff' },
      { kind: 'flowerbed', at: { tx: 13.9, ty: 13.9 }, color: '#ff9a7a' },
      { kind: 'flowerbed', at: { tx: 6.4, ty: 15.2 }, color: '#ffb3c6' },
      { kind: 'hedge', at: { tx: 5.0, ty: 12.4 }, yaw: RIGHT },
      { kind: 'hedge', at: { tx: 5.0, ty: 13.4 }, yaw: RIGHT },
      { kind: 'hedge', at: { tx: 5.0, ty: 14.4 }, yaw: RIGHT },
      { kind: 'bush', at: { tx: 8.5, ty: 14.6 } },
      { kind: 'bush', at: { tx: 15.2, ty: 11.6 } },
      { kind: 'bush', at: { tx: 12.0, ty: 15.3 } },
      { kind: 'bush', at: { tx: 6.0, ty: 2.4 } },
      { kind: 'tree', at: { tx: 15.2, ty: 4.4 } },
      { kind: 'tree', at: { tx: 5.6, ty: 4.7 } },
      { kind: 'rock', at: { tx: 15.0, ty: 14.8 } },
      { kind: 'flowerbed', at: { tx: 12.7, ty: 3.1 }, color: '#ff9ec0' },
      { kind: 'bush', at: { tx: 11.6, ty: 2.3 } },
      { kind: 'bush', at: { tx: 15.4, ty: 6.6 } },
      { kind: 'bush', at: { tx: 14.6, ty: 12.8 } },
      { kind: 'bush', at: { tx: 6.3, ty: 11.5 } },
      { kind: 'bush', at: { tx: 9.0, ty: 15.6 } },
      { kind: 'rock', at: { tx: 7.4, ty: 14.9 } },
      { kind: 'flowerbed', at: { tx: 15.0, ty: 10.4 }, color: '#cbb8ff' },
      // the streets behind: houses past the high street and across the tracks, hedges along the front
      ...[0.4, 3.9, 7.4, 10.9, 14.4].map((ty, i) => ({ kind: 'house' as const, at: { tx: -3.4, ty }, yaw: RIGHT, color: ['#e98a7a', '#7d8aa8', '#c58f63', '#8fb87a', '#d98aa8'][i] })),
      ...[0.6, 4.4, 8.2, 12.0, 15.8, 19.6].map((tx, i) => ({ kind: 'house' as const, at: { tx, ty: -4.6 }, yaw: DOWN, color: ['#7d8aa8', '#e98a7a', '#d98aa8', '#c58f63', '#8fb87a', '#e9a35a'][i] })),
      { kind: 'tree', at: { tx: 2.5, ty: -3.4 } },
      { kind: 'tree', at: { tx: 10.1, ty: -3.3 } },
      { kind: 'pine', at: { tx: 17.7, ty: -3.2 } },
      { kind: 'tree', at: { tx: -2.0, ty: 18.0 } },
      // a picket fence round the front lawns (open where the paths go out), bushes along it
      ...[5.0, 6.0, 7.0, 8.0, 9.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0].map((tx) => ({ kind: 'fence' as const, at: { tx, ty: 16.3 }, yaw: DOWN })),
      ...[1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5].map((ty) => ({ kind: 'fence' as const, at: { tx: 16.3, ty }, yaw: RIGHT })),
      ...[6.5, 13.5].map((tx) => ({ kind: 'bush' as const, at: { tx, ty: 17.0 } })),
      ...[4.0, 13.0].map((ty) => ({ kind: 'bush' as const, at: { tx: 17.0, ty } })),
    ],
    recommendedOutfits: [],
  };
}
