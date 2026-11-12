import type { Background } from '../../art/ground';
import type { ArtKind } from '../../art/props';
import type { Tile } from '../../game/iso';
import type { ActionId } from '../actions';
import type { CharacterLook } from '../character';

export type ThemeId = 'plaza' | 'camping' | 'church' | 'pool' | 'tennis' | 'gym' | 'library' | 'mall' | 'restaurant';

/** Where everyone lands first; every other theme is a building in it. */
export const HUB: ThemeId = 'plaza';

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
  decorations: { kind: ArtKind; at: Tile }[];
  recommendedOutfits: { name: string; look: Partial<CharacterLook> }[];
}
