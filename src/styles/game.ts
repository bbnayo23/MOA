import type Phaser from 'phaser';
import { PIXEL_FONT } from './fonts';

/**
 * How the game *looks*: text styles, speech bubbles, lights, particles.
 * Colours come from the design tokens in global.scss, so UI and game share one palette.
 * Game logic (src/game) imports these instead of hard-coding visual values.
 */

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const tokenHex = (name: string) => parseInt(token(name).slice(1), 16);

export const nameTagStyle = (isMe: boolean): TextStyle => ({
  fontFamily: PIXEL_FONT,
  fontSize: '12px',
  color: token(isMe ? '--c-on-primary' : '--c-ink'),
  backgroundColor: token(isMe ? '--c-primary-deep' : '--c-tag'),
  padding: { x: 5, y: 2 },
});

export const bubbleTextStyle = (emoji: boolean): TextStyle => ({
  fontFamily: emoji ? 'sans-serif' : PIXEL_FONT,
  fontSize: emoji ? '26px' : '12px',
  color: token('--c-ink'),
  align: 'center',
  wordWrap: { width: 150, useAdvancedWrap: true },
});

export const bubbleBox = () => ({
  fill: tokenHex('--c-surface'),
  stroke: tokenHex('--c-lavender'),
  line: 2,
  radius: 8,
  padX: 9,
  padY: 5,
  /** Height of the little tail under the bubble. */
  tail: 7,
  popFrom: 0.6,
  popMs: 180,
  fadeMs: 300,
});

export const objectLabelStyle = (): TextStyle => ({
  fontFamily: PIXEL_FONT,
  fontSize: '12px',
  color: token('--c-ink'),
  backgroundColor: token('--c-surface'),
  padding: { x: 6, y: 3 },
});

/** Greyed-out tint for buildings that aren't open yet. */
export const lockedTint = () => tokenHex('--c-locked');

/** Soft floor light around glowing objects (campfire, candles, lanterns). */
export const LIGHT = { radius: 90, core: 0.45, alpha: { from: 0.55, to: 0.85 }, pulseMs: 800 };

/** Drifting fireflies / dust motes. */
export const MOTES = { count: 12, alpha: 0.9 };

export const FADE_IN_MS = 350;
