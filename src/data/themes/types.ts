import type { ArtKind } from '../../world/kinds';
import type { Tile } from '../../world/space';
import type { ActionId } from '../actions';
import type { CharacterLook } from '../character';

export type ThemeId = 'plaza' | 'camping' | 'church' | 'pool' | 'tennis' | 'gym' | 'library' | 'mall' | 'restaurant';

/** Where everyone lands first; every other theme is a building in it. */
export const HUB: ThemeId = 'plaza';

/** How a theme's space looks: map size, colours, and outdoor / indoor dressing. */
export interface Background {
  /** Map is size × size tiles. */
  size: number;
  /** Sky / backdrop colours, top → horizon. */
  sky: string[];
  /** Floor colours: checker tiles, or soft patches on a `grass` floor. */
  ground: [string, string];
  /** Paved / tiled (default), a grassy field, or wooden planks. */
  floor?: 'tiles' | 'grass' | 'wood';
  /** Platform side colours under an indoor floor. */
  side: [left: string, right: string];
  // outdoor
  /** Night: moonlight, darker sky. */
  night?: boolean;
  /** Grass of the open land around the map (outdoor themes have one; indoor ones have walls). */
  grass?: string;
  /** Outdoors you can walk out onto that land: this many tiles past the map, a round area (set in themes/index). */
  wild?: number;
  /** Flower colours sprinkled on the grass. */
  flowers?: string[];
  // indoor
  /** Back walls (along tx = 0 and ty = 0) with arched windows. */
  walls?: { left: string; right: string; trim: string; glass: string[] };
  /** Floor runners between two map points (paths, court lines, pool water…); `stone`: cobbles in that colour. */
  rugs?: { from: Tile; to: Tile; width: number; color: string; border: string; stone?: boolean }[];
  /** A pool: a rippling water surface over this stretch (same shape as a rug). */
  water?: { from: Tile; to: Tile; width: number };
  /** Floating light particles (fireflies, dust). */
  motes?: number;
}

/** Enough to show a theme as a building / preview. */
export interface ThemeMeta {
  themeId: ThemeId;
  name: string;
  emoji: string;
  tagline: string;
  activities: string[];
  /** Accent colour (its building's roof and awning in the plaza). */
  color: string;
}

export interface InteractionObject {
  id: string;
  kind: ArtKind;
  label: string;
  icon: string;
  at: Tile;
  actions: ActionId[];
  /** Where characters stand/sit to use it; first free one wins. */
  spots: Tile[];
  /** Tint passed to the art (e.g. a building's colour). */
  color?: string;
  /** A door: clicking walks to spots[0] and enters this theme. */
  enter?: ThemeId;
  /** Shown greyed out with a 🔒 (theme not built yet). */
  locked?: boolean;
}

/** Everything the world scene needs to build a playable theme. */
export interface ThemeConfig extends ThemeMeta {
  background: Background;
  spawnPosition: Tile;
  availableActions: ActionId[];
  interactionObjects: InteractionObject[];
  /** Scenery (`color`: a tint for the art — a sofa's fabric, a dress, a painting's sun). */
  decorations: { kind: ArtKind; at: Tile; color?: string }[];
  recommendedOutfits: { name: string; look: Partial<CharacterLook> }[];
}
