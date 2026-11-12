import { isWalkable, tileToWorld, type Tile } from '../../game/iso';
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
export function checkThemes() {
  const errors: string[] = [];
  for (const t of Object.values(THEME_CONFIGS)) {
    const walkable = (p: Tile) => {
      const w = tileToWorld(p);
      return isWalkable(w.x, w.y, t.background.size);
    };
    if (!walkable(t.spawnPosition)) errors.push(`${t.themeId}: spawnPosition off the map`);
    for (const o of t.interactionObjects) {
      if (!o.spots.length || !o.spots.every(walkable)) errors.push(`${t.themeId}/${o.id}: bad spots`);
      for (const a of o.actions)
        if (!t.availableActions.includes(a)) errors.push(`${t.themeId}/${o.id}: "${a}" not in availableActions`);
    }
  }
  if (errors.length) throw new Error('Theme data:\n' + errors.join('\n'));
}
