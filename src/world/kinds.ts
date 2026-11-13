/** Every kind of object a theme can place. Each has a 3D model in models/. */
export type ArtKind =
  | 'pine' | 'bush' | 'rock' | 'log' | 'tent' | 'campfire' | 'grill' | 'lantern'
  | 'pew' | 'altar' | 'candles' | 'board' | 'plant'
  | 'building' | 'fountain'
  | 'bookshelf' | 'table' | 'desk'
  | 'diningTable' | 'counter' | 'menuboard'
  | 'treadmill' | 'rack' | 'mat'
  | 'ladder' | 'lounger' | 'parasol' | 'ring'
  | 'net' | 'balls'
  | 'clothesRack' | 'fittingRoom' | 'mirror';

/**
 * Physical facts about a kind, used by the simulation (not the renderer):
 * `foot` = radius (tiles) of floor it blocks — left out for things you stand or sit on;
 * `light` = colour of the warm light it gives off;
 * `face` = how someone using it from right on top turns, relative to the object (treadmill: along the belt).
 */
export const KINDS: Record<ArtKind, { foot?: number; light?: string; face?: number }> = {
  pine: { foot: 0.3 },
  bush: { foot: 0.3 },
  rock: { foot: 0.25 },
  log: {},
  tent: { foot: 0.65 },
  campfire: { foot: 0.5, light: '#ffa860' },
  grill: { foot: 0.4 },
  lantern: { foot: 0.15, light: '#ffe7a0' },
  pew: {},
  altar: { foot: 0.8, light: '#ffe2a8' },
  candles: { foot: 0.4, light: '#ffc870' },
  board: { foot: 0.4 },
  plant: { foot: 0.25 },
  building: { foot: 0.6 },
  fountain: { foot: 0.7 },
  bookshelf: { foot: 0.4 },
  table: { foot: 0.45 },
  desk: { foot: 0.35, light: '#fff1b0' },
  diningTable: { foot: 0.45 },
  counter: { foot: 0.5 },
  menuboard: { foot: 0.25 },
  treadmill: { face: -Math.PI / 2 },
  rack: { foot: 0.4 },
  mat: {},
  ladder: {},
  lounger: {},
  parasol: { foot: 0.15 },
  ring: {},
  net: {},
  balls: {},
  clothesRack: { foot: 0.45 },
  fittingRoom: { foot: 0.5 },
  mirror: { foot: 0.3 },
};
