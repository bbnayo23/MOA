import { KINDS } from '../../world/kinds';
import type { Tile } from '../../world/space';
import { isFree, type Footprint } from '../../world/path';
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


/** Every enterable world, the plaza included. */
export const THEME_CONFIGS: Partial<Record<ThemeId, ThemeConfig>> = {
  plaza: makePlaza(THEMES, (id) => id in PLAYABLE),
  ...PLAYABLE,
};

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
    const free = (p: Tile) => isFree(p, t.background.size, blocks);
    if (!free(t.spawnPosition)) errors.push(`${t.themeId}: spawnPosition blocked or off the map`);
    for (const o of t.interactionObjects) {
      if (!o.spots.length || !o.spots.every(free)) errors.push(`${t.themeId}/${o.id}: spot blocked or off the map`);
      for (const a of o.actions)
        if (!t.availableActions.includes(a)) errors.push(`${t.themeId}/${o.id}: "${a}" not in availableActions`);
    }
  }
  if (errors.length) throw new Error('Theme data:\n' + errors.join('\n'));
}
