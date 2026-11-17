/** Every kind of object a theme can place. Each has a 3D model in models/. */
export type ArtKind =
  | 'pine' | 'tree' | 'lamp' | 'bush' | 'rock' | 'log' | 'dock' | 'tent' | 'campfire' | 'grill' | 'lantern'
  | 'pew' | 'altar' | 'candles' | 'board' | 'plant'
  | 'building' | 'fountain'
  | 'bookshelf' | 'table' | 'desk'
  | 'diningTable' | 'counter' | 'menuboard'
  | 'treadmill' | 'rack' | 'mat'
  | 'ladder' | 'lounger' | 'parasol' | 'ring'
  | 'net' | 'balls'
  | 'clothesRack' | 'fittingRoom' | 'mirror'
  | 'sofa' | 'armchair' | 'floorLamp' | 'pastryCase' | 'frame'
  | 'bike' | 'weightBench' | 'gymBalls' | 'cooler'
  | 'globe' | 'bookCart' | 'dressForm' | 'displayTable' | 'pillar' | 'bouquet'
  // the village (plaza)
  | 'shop' | 'house' | 'station' | 'railway' | 'crossing' | 'pole' | 'vending' | 'mailbox' | 'busStop'
  | 'planterTree' | 'flowerbed' | 'hedge' | 'bicycle' | 'kiosk' | 'fence'
  // small outdoor things between the big pieces (props.tsx)
  | 'campChair' | 'picnicTable' | 'woodpile' | 'canoe' | 'reeds' | 'signpost' | 'stump' | 'mushrooms' | 'flowers' | 'iceBox'
  | 'highChair' | 'scoreboard' | 'windscreen' | 'ballMachine' | 'palm' | 'towel' | 'beachBall' | 'rubberDuck' | 'shower'
  | 'punchBag' | 'kettlebells' | 'lockers' | 'plyoBoxes' | 'powerRack' | 'piano' | 'lectern' | 'candelabra';

/**
 * Physical facts about a kind, used by the simulation (not the renderer):
 * `foot` = radius (tiles) of floor it blocks — left out for things you stand or sit on;
 * `light` = colour of the warm light it gives off;
 * `face` = how someone using it from right on top turns, relative to the object (treadmill: along the belt).
 */
export const KINDS: Record<ArtKind, { foot?: number; light?: string; face?: number }> = {
  pine: { foot: 0.3 },
  tree: { foot: 0.35 },
  lamp: { foot: 0.15 },
  bush: { foot: 0.3 },
  rock: { foot: 0.25 },
  log: {},
  dock: {},
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
  sofa: {},
  armchair: {},
  floorLamp: { foot: 0.15, light: '#ffe2a8' },
  pastryCase: { foot: 0.45 },
  frame: {},
  bike: { foot: 0.35 },
  weightBench: { foot: 0.4 },
  gymBalls: { foot: 0.4 },
  cooler: { foot: 0.2 },
  globe: { foot: 0.2 },
  bookCart: { foot: 0.35 },
  dressForm: { foot: 0.25 },
  displayTable: { foot: 0.45 },
  pillar: { foot: 0.3 },
  campChair: { foot: 0.15 },
  picnicTable: { foot: 0.45 },
  woodpile: { foot: 0.3 },
  canoe: { foot: 0.35 },
  reeds: {},
  signpost: { foot: 0.1 },
  stump: { foot: 0.15 },
  mushrooms: {},
  flowers: {},
  iceBox: { foot: 0.15 },
  highChair: { foot: 0.25 },
  scoreboard: { foot: 0.3 },
  windscreen: {},
  ballMachine: { foot: 0.2 },
  palm: { foot: 0.25 },
  towel: {},
  beachBall: {},
  rubberDuck: {},
  shower: { foot: 0.1 },
  punchBag: { foot: 0.25 },
  kettlebells: { foot: 0.2 },
  lockers: { foot: 0.4 },
  plyoBoxes: { foot: 0.3 },
  powerRack: { foot: 0.45 },
  piano: { foot: 0.45 },
  lectern: { foot: 0.2 },
  candelabra: { foot: 0.15, light: '#ffc870' },
  bouquet: { foot: 0.2 },
  // a shop stands on the map's back edge: its footprint reaches from the wall to its front
  shop: { foot: 0.95 },
  // past the map's edge (scenery): no footprint
  house: {},
  station: {},
  railway: {},
  crossing: {},
  pole: { foot: 0.12 },
  vending: { foot: 0.3 },
  mailbox: { foot: 0.15 },
  busStop: { foot: 0.1 },
  planterTree: { foot: 0.45 },
  flowerbed: { foot: 0.42 },
  hedge: { foot: 0.45 },
  bicycle: { foot: 0.3 },
  kiosk: { foot: 0.45 },
  fence: {},
};
