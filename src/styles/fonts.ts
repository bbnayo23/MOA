import galmuri11 from 'galmuri/dist/Galmuri11.woff2';

export const PIXEL_FONT = 'Galmuri11';

// Only the one pixel face we use (the package CSS pulls in ~50MB of variants).
document.fonts.add(new FontFace(PIXEL_FONT, `url(${galmuri11})`));

/** Phaser draws text onto canvas, so the game waits for this before starting. */
export const pixelFontReady = () => document.fonts.load(`12px ${PIXEL_FONT}`);
