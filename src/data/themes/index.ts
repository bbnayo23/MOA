import { isWalkable, tileToWorld, type Tile } from '../../game/iso';
import { camping } from './camping';
import { church } from './church';
import { gym } from './gym';
import { library } from './library';
import { makePlaza } from './plaza';
import { pool } from './pool';
import { restaurant } from './restaurant';
import type { ThemeConfig, ThemeId, ThemeMeta } from './types';

export * from './types';

/** Themes you can enter from the plaza. The rest are preview-only until their config lands here. */
const PLAYABLE: Partial<Record<ThemeId, ThemeConfig>> = { camping, church, library, restaurant, gym, pool };

/** The eight theme buildings around the plaza, in this order. */
export const THEMES: ThemeMeta[] = [
  camping,
  church,
  pool,
  { themeId: 'tennis', name: '테니스장', emoji: '🎾', tagline: '랠리 한 판 어때?', activities: ['서브', '스윙', '랠리', '친구와 미니게임'], color: '#f2a37e' },
  gym,
  library,
  { themeId: 'mall', name: '쇼핑몰', emoji: '🛍️', tagline: '오늘의 코디 쇼핑', activities: ['옷 구경', '피팅룸', '의상 변경', '코디 공유'], color: '#ff9fc0' },
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
