import { KINDS } from '../../world/kinds';
import type { Tile } from '../../world/space';
import { isFree, walkRadius, type Footprint } from '../../world/path';
import { camping } from './camping';
import { church } from './church';
import { gym } from './gym';
import { library } from './library';
import { mall } from './mall';
import { makePlaza } from './plaza';
import { pool } from './pool';
import { restaurant } from './restaurant';
import { tennis } from './tennis';
import type { ThemeConfig, ThemeId, ThemeMeta } from './types';

export * from './types';

/** Themes you can enter from the plaza. The rest are preview-only until their config lands here. */
const PLAYABLE: Partial<Record<ThemeId, ThemeConfig>> = { camping, church, library, restaurant, gym, pool, tennis, mall };

/** The eight theme buildings around the plaza, in this order. */
export const THEMES: ThemeMeta[] = [
  camping,
  church,
  pool,
  tennis,
  gym,
  library,
  mall,
  restaurant,
];


/** How many tiles across every space is played on (the theme files draw them on 8). */
const SIZE = 16;
/** Outdoors the space isn't boxed in: you can walk this far past it, over a round stretch of land. */
const WILD = 6;

/** Trees, bushes and rocks over that land (seeded per space, so everyone sees the same ones). */
function scatter(seedText: string): ThemeConfig['decorations'] {
  let h = [...seedText].reduce((x, ch) => (x * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const mid = SIZE / 2, reach = walkRadius(SIZE, WILD) - 0.8;
  const out: ThemeConfig['decorations'] = [];
  for (let i = 0; i < 4000 && out.length < 46; i++) {
    const at = { tx: mid + (rnd() * 2 - 1) * reach, ty: mid + (rnd() * 2 - 1) * reach };
    const onMap = at.tx > -1 && at.ty > -1 && at.tx < SIZE + 1 && at.ty < SIZE + 1;
    if (onMap || Math.hypot(at.tx - mid, at.ty - mid) > reach) continue;
    if (out.some((d) => Math.hypot(d.at.tx - at.tx, d.at.ty - at.ty) < 1.8)) continue;
    const r = rnd();
    // on the camera's side of the space nothing tall, so it never hides anyone
    const front = at.tx + at.ty > SIZE;
    out.push({ kind: front ? (r < 0.7 ? 'bush' : 'rock') : r < 0.35 ? 'tree' : r < 0.55 ? 'pine' : r < 0.85 ? 'bush' : 'rock', at });
  }
  return out;
}

/**
 * Roomier spaces: stretch the middle of a theme drawn on its small grid out to
 * SIZE, leaving the strip along each edge (things against the walls, the
 * plaza's buildings) where it is. A spot right by its thing (a chair, a door
 * step) moves with it; spread-out ones (round the campfire, the tennis
 * baselines, in the pool) stretch with the floor, like the rugs and the water.
 */
function widen(t: ThemeConfig): ThemeConfig {
  const n = t.background.size, E = 1.2, k = (SIZE - 2 * E) / (n - 2 * E);
  const v = (x: number) => (x <= E ? x : x >= n - E ? x + SIZE - n : E + (x - E) * k);
  const m = (p: Tile): Tile => ({ tx: v(p.tx), ty: v(p.ty) });
  const strip = <R extends { from: Tile; to: Tile; width: number }>(r: R): R => ({ ...r, from: m(r.from), to: m(r.to), width: r.width * k });
  const bg = t.background;
  return {
    ...t,
    background: { ...bg, size: SIZE, rugs: bg.rugs?.map(strip), water: bg.water && strip(bg.water), wild: bg.walls ? 0 : WILD },
    spawnPosition: m(t.spawnPosition),
    decorations: [...t.decorations.map((d) => ({ ...d, at: m(d.at) })), ...(bg.walls ? [] : scatter(t.themeId))],
    interactionObjects: t.interactionObjects.map((o) => {
      const at = m(o.at);
      const close = o.spots.every((p) => Math.hypot(p.tx - o.at.tx, p.ty - o.at.ty) <= 0.9);
      return { ...o, at, spots: o.spots.map((p) => (close ? { tx: p.tx + at.tx - o.at.tx, ty: p.ty + at.ty - o.at.ty } : m(p))) };
    }),
  };
}

/** Every enterable world, the plaza included. */
export const THEME_CONFIGS: Partial<Record<ThemeId, ThemeConfig>> = Object.fromEntries(
  Object.entries({ plaza: makePlaza(THEMES, (id) => id in PLAYABLE), ...PLAYABLE }).map(([id, t]) => [id, widen(t)]),
);

/** Dev-time sanity check for hand-written theme data. */
/** Floor blocked by the theme's furniture and scenery (see `foot` in world/kinds.ts). */
export function footprintsOf(t: ThemeConfig): Footprint[] {
  return [...t.decorations, ...t.interactionObjects].flatMap(({ kind, at }) =>
    KINDS[kind].foot ? [{ ...at, r: KINDS[kind].foot! }] : [],
  );
}

export function checkThemes() {
  const errors: string[] = [];
  for (const t of Object.values(THEME_CONFIGS)) {
    const blocks = footprintsOf(t);
    const free = (p: Tile) => isFree(p, t.background.size, blocks, t.background.wild);
    if (!free(t.spawnPosition)) errors.push(`${t.themeId}: spawnPosition blocked or off the map`);
    for (const o of t.interactionObjects) {
      if (!o.spots.length || !o.spots.every(free)) errors.push(`${t.themeId}/${o.id}: spot blocked or off the map`);
      for (const a of o.actions)
        if (!t.availableActions.includes(a)) errors.push(`${t.themeId}/${o.id}: "${a}" not in availableActions`);
    }
  }
  if (errors.length) throw new Error('Theme data:\n' + errors.join('\n'));
}
