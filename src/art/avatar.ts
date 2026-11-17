import type { Pose } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { Pix, shade } from './pix.ts';

/**
 * The character as pixel art: an art-toy baby — a huge soft head (two thirds
 * of them), puffy cheeks, big glossy cat-like eyes with coloured irises, a
 * tiny pout, blush; often in an animal-costume hood. A small round body with
 * nub arms and stubby legs. Drawn from the look and an animation pose, seen
 * from the front (turned a little to the right) or from behind; facing left is
 * the mirror image.
 */
export const AV_W = 48;
export const AV_H = 60;
/** The row the soles stand on: sprites put this row on the ground. */
export const AV_FOOT = 57;
/** The top of the head (not counting ears / hats): name tags go just above it. */
export const AV_TOP = 14;

/** A passing feeling on the face (from an emoji in chat): it beats the animation's eyes / mouth. */
export type Mood = 'love' | 'wow' | 'laugh' | 'happy';

const MOODS: [Mood, RegExp][] = [
  ['love', /❤|💕|💖|💗|💓|😍|🥰|😘|♥/u],
  ['wow', /😮|😲|😯|😱|😳|🤩|‼|❗|헐|대박/u],
  ['laugh', /😆|😂|🤣|😄|😁|ㅋㅋ|ㅎㅎ/u],
  ['happy', /😊|🙂|😀|✨|🎉|👋|👏/u],
];
/** What a chat line does to the speaker's face, if anything. */
export const moodOf = (text: string): Mood | null => MOODS.find(([, re]) => re.test(text))?.[0] ?? null;

const EYE_DARK = '#2a1a26';
const WHITE = '#fffdf8';
const BLUSH = '#ff9fb4';
const BLUSH_LIGHT = '#ffc7d2';
const MOUTH = '#b9506c';
const TONGUE = '#ff95a6';
const GLASSES = '#4b3d5c';
const STAR = '#ffd166';
const SCARF = '#ff8080';
const RIBBON = '#ff7fa3';
const FLOWER = '#ff9ec0';
const RACKET = '#4c5a8a';
const BALL = '#e6f25a';
const WOOD = '#9a6440';
const METAL = '#c6ccd6';
const WATER = '#bfe6ff';

/** Hood colours: the animal's own. */
const HOOD: Record<string, { c: string; inner: string }> = {
  bunny: { c: '#fff4f4', inner: '#ffbfd0' },
  bear: { c: '#b47c5c', inner: '#e8bf98' },
  frog: { c: '#9dd46a', inner: '#fffdf8' },
  kitty: { c: '#f5c890', inner: '#ffc9c0' },
  puppy: { c: '#f7d36e', inner: '#e0a447' },
};

/** Head radii per face shape; the cheeks puff out below either way. */
const FACE: Record<CharacterLook['face'], { rx: number; ry: number }> = {
  round: { rx: 14.5, ry: 13 },
  oval: { rx: 13.5, ry: 13.5 },
  wide: { rx: 15.5, ry: 12.5 },
};

// Design grid: the body is drawn around x = 24 with the head's centre at HY; Y0 leaves room above for ears.
const CX = 24;
const Y0 = 10;
const HY = 20;
/** The face looks a little to the right: its middle is here. */
const FC = 25;

type ArmKind = NonNullable<Pose['arms']>;
type Rect = [x: number, y: number, w: number, h: number];
/** The right arm (screen right, the way they face) per pose: sleeve parts, the hand, and the hand's centre. */
const ARMS: Record<ArmKind, { sleeve: Rect[]; hand: Rect; at: [number, number] }> = {
  down: { sleeve: [[31, 34, 3, 3]], hand: [31, 37, 3, 3], at: [32, 38] },
  up: { sleeve: [[31, 31, 3, 3], [32, 28, 3, 3]], hand: [32, 24, 3, 4], at: [33, 25] },
  waveA: { sleeve: [[31, 31, 3, 3], [33, 28, 3, 3]], hand: [34, 24, 3, 4], at: [35, 25] },
  waveB: { sleeve: [[31, 32, 3, 3], [34, 30, 3, 3]], hand: [36, 27, 3, 4], at: [37, 28] },
  front: { sleeve: [[31, 35, 4, 3]], hand: [35, 35, 3, 3], at: [36, 36] },
  pray: { sleeve: [[30, 34, 3, 3], [26, 36, 4, 3]], hand: [23, 35, 3, 3], at: [24, 36] },
};
/** The same rectangle on the other side of the body. */
const mirror = ([x, y, w, h]: Rect): Rect => [2 * CX - x - w, y, w, h];

export interface AvatarOpts {
  /** Seen from behind. */
  back?: boolean;
  mood?: Mood | null;
}

/** Character look + animation pose → outlined pixel grid (facing right, or seen from behind with `back`). */
export function renderAvatar(look: CharacterLook, pose: Pose = {}, { back = false, mood = null }: AvatarOpts = {}): Pix {
  const pix = new Pix(AV_W, AV_H);
  const legs = pose.legs ?? 'stand';
  const sit = legs === 'sit';
  const swim = legs === 'swim';
  const u = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  // p: planted on the ground (legs, shoes); q: moves with the upper body
  const p = (x: number, y: number, w: number, h: number, c: string) => pix.put(x, y + Y0, w, h, c);
  const q: Q = (x, y, w, h, c) => pix.put(x + lean, y + u + Y0, w, h, c);
  const qr = (r: Rect, c: string) => q(r[0], r[1], r[2], r[3], c);
  const qo: QO = (cx, cy, rx, ry, c, only) => pix.oval(cx + lean, cy + u + Y0, rx, ry, c, only && ((x, y) => only(x - lean, y - u - Y0)));
  const qg: QG = (x, y, rows, colors, flip = false) => pix.glyph(x + lean, y + u + Y0, rows, colors, flip);
  /** A rounded stroke from one point to another (ears). */
  const qc = (x0: number, y0: number, x1: number, y1: number, r: number, c: string) => {
    for (let t = 0; t <= 1.001; t += 0.125) qo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
  };
  const d: Draw = { q, qo, qg, qc };

  const { skin } = look;
  const top = look.topColor;
  const bottom = look.bottomColor;
  const dress = look.top === 'dress';
  const hood = HOOD[look.hat];
  const { rx, ry } = FACE[look.face];
  const arms = pose.arms ?? 'down';
  const armC = shade(top, -0.1);
  const longSleeves = look.top === 'hoodie' || look.top === 'jacket';

  // ── behind the body: long hair ──
  if (look.hair === 'long' && !hood) qo(CX, HY + 8, rx - 1, 14, shade(look.hairColor, -0.12));

  // ── stubby legs and round shoes (none in the water) ──
  if (!swim) {
    const legC = dress || look.bottom !== 'pants' ? skin : bottom;
    // a step lifts one foot; seated, both dangle a little
    const liftL = sit ? 1 : legs === 'stepA' ? 1 : 0;
    const liftR = sit ? 1 : legs === 'stepB' ? 1 : 0;
    for (const [x, lift] of [[18, liftL], [26, liftR]] as const) {
      p(x, 42, 4, 3 - lift, legC);
      p(x + 3, 42, 1, 3 - lift, shade(legC, -0.12));
      p(x - 1, 45 - lift, 6, 2, look.shoes);
      p(x, 44 - lift, 4, 1, look.shoes);
      p(x, 45 - lift, 2, 1, shade(look.shoes, 0.4));
    }
  }

  // ── hips: pants / shorts / skirt (a dress flares in the top's colour) ──
  if (!swim) {
    if (dress || look.bottom === 'skirt') {
      const c = dress ? top : bottom;
      q(16, 39, 16, 2, c);
      q(15, 41, 18, 2, c);
      q(15, 42, 18, 1, shade(c, -0.15));
      q(18, 40, 1, 2, shade(c, -0.08));
      q(29, 40, 1, 2, shade(c, -0.08));
    } else {
      q(17, 39, 14, 3, bottom);
      q(24, 40, 1, 2, shade(bottom, -0.18));
      q(17, 41, 14, 1, shade(bottom, -0.1));
      if (look.bottom === 'shorts') q(17, 42, 14, 1, bottom);
    }
  }

  // ── a little round torso ──
  q(18, 32, 12, 1, top);
  q(17, 33, 14, 3, top);
  q(16, 36, 16, 3, top);
  q(30, 34, 1, 5, shade(top, -0.12));
  q(16, 38, 16, 1, shade(top, -0.12));
  if (!back) {
    if (look.top === 'tee') q(23, 32, 2, 1, skin);
    if (look.top === 'stripe') for (const y of [34, 37]) q(y === 34 ? 17 : 16, y, y === 34 ? 14 : 16, 1, WHITE);
    if (look.top === 'hoodie') {
      q(20, 36, 8, 2, shade(top, -0.08)); // pocket
      q(20, 36, 8, 1, shade(top, -0.18));
      q(22, 33, 1, 2, WHITE); // strings
      q(26, 33, 1, 2, WHITE);
    }
    if (look.top === 'jacket') {
      q(22, 32, 5, 7, WHITE);
      q(21, 32, 1, 7, shade(top, -0.22));
      q(27, 32, 1, 7, shade(top, -0.22));
      q(24, 34, 1, 1, shade(top, -0.3));
      q(24, 36, 1, 1, shade(top, -0.3));
    }
    if (dress) q(16, 38, 16, 1, shade(top, 0.3)); // a waist ribbon
  } else {
    if (look.top === 'stripe') for (const y of [34, 37]) q(y === 34 ? 17 : 16, y, y === 34 ? 14 : 16, 1, WHITE);
    if (look.top === 'hoodie') qo(CX, 33, 6, 2, shade(top, -0.15)); // the hood, down on the back
  }

  // ── arms that hang or reach out (raised ones go in front of the head, later) ──
  const raised = (k: ArmKind) => k === 'up' || k === 'waveA' || k === 'waveB';
  const drawArm = (k: ArmKind, left: boolean) => {
    const a = ARMS[k];
    const m = (r: Rect) => (left ? mirror(r) : r);
    a.sleeve.forEach((r, i) => qr(m(r), longSleeves || i === 0 ? armC : skin));
    qr(m(a.hand), skin);
  };
  // the left arm mirrors the right one, except a wave / reach / swing (that's the right hand's job)
  const leftKind: ArmKind = arms === 'up' || arms === 'pray' ? arms : 'down';
  if (!raised(leftKind)) drawArm(leftKind, true);
  if (!raised(arms)) drawArm(arms, false);

  // ── head ──
  if (hood) drawHood(look, hood, back, rx, ry, d);
  else {
    // a soft round head, the cheeks puffing out below; darker round the bottom-right like a lit vinyl toy
    const rim = shade(skin, -0.1);
    qo(CX, HY, rx, ry, rim);
    qo(CX - 8.5, HY + 6, 6.5, 6.5, rim);
    qo(CX + 8.5, HY + 6, 6.5, 6.5, rim);
    qo(CX - 0.6, HY - 0.7, rx - 0.6, ry - 0.6, skin);
    qo(CX - 9, HY + 5.4, 6, 6, skin);
    qo(CX + 8, HY + 5.4, 6, 6, skin);
    drawHair(look, back, rx, ry, d);
    drawHat(look, back, rx, ry, d);
  }

  // ── the face ──
  if (!back) drawFace(look, pose, mood, d);

  // ── accessories ──
  if (look.accessory === 'scarf') {
    q(17, 31, 14, 3, SCARF);
    q(17, 33, 14, 1, shade(SCARF, -0.15));
    if (!back) {
      q(26, 34, 3, 4, shade(SCARF, -0.05));
      q(26, 37, 3, 1, WHITE);
    }
  }
  if (look.accessory === 'glasses' && !back) {
    const ring = ['.ggggggg.', 'g.......g', 'g.......g', 'g.......g', 'g.......g', 'g.......g', 'g.......g', 'g.......g', '.ggggggg.'];
    qg(FC - 10, HY, ring, { g: GLASSES });
    qg(FC + 2, HY, ring, { g: GLASSES });
    q(FC - 1, HY + 3, 3, 1, GLASSES);
  }
  const pinAt: [number, number] = hood ? [CX - 10, HY - 13] : [CX - 11, HY - 9];
  if (look.accessory === 'star') qg(pinAt[0], pinAt[1], ['..y..', 'yyyyy', '.yYy.', '.y.y.'], { y: STAR, Y: shade(STAR, -0.15) });
  if (look.accessory === 'flower') qg(pinAt[0], pinAt[1], ['.p.p.', 'ppypp', '.ppp.', '..p..'], { p: FLOWER, y: STAR });

  // ── raised arms, in front of the head ──
  if (raised(leftKind)) drawArm(leftKind, true);
  if (raised(arms)) drawArm(arms, false);

  // ── props ──
  if (pose.prop) drawProp(pose.prop, arms, pix, d);

  return pix.outline(-0.45);
}

type Q = (x: number, y: number, w: number, h: number, c: string) => void;
type QO = (cx: number, cy: number, rx: number, ry: number, c: string, only?: (x: number, y: number) => boolean) => void;
type QG = (x: number, y: number, rows: string[], colors: Record<string, string>, flip?: boolean) => void;
interface Draw {
  q: Q;
  qo: QO;
  qg: QG;
  qc: (x0: number, y0: number, x1: number, y1: number, r: number, c: string) => void;
}

/** An animal-costume hood: a big padded dome round the head, ears, and the face in a round opening. */
function drawHood(look: CharacterLook, hood: { c: string; inner: string }, back: boolean, rx: number, ry: number, { q, qo, qg, qc }: Draw) {
  const c = hood.c, dark = shade(c, -0.13), inner = back ? c : hood.inner;
  const kind = look.hat;
  // ears behind the dome
  if (kind === 'bunny') {
    qc(CX - 5, 6, CX - 8, -2, 3.6, dark);
    qc(CX - 5.3, 5.6, CX - 8.3, -2.4, 3, c);
    qc(CX - 5.6, 5, CX - 8, -1, 1.3, inner);
    // the right one bends over at the tip
    qc(CX + 5, 6, CX + 7, -1, 3.6, dark);
    qc(CX + 4.7, 5.6, CX + 6.7, -1.4, 3, c);
    qc(CX + 5, 5, CX + 6.6, 0, 1.3, inner);
    qc(CX + 7, -1, CX + 11, 1, 3, dark);
    qc(CX + 7, -1.4, CX + 10.6, 0.6, 2.5, c);
  } else if (kind === 'bear') {
    for (const ex of [CX - 12, CX + 12]) {
      qo(ex, HY - 11, 5, 5, dark);
      qo(ex - 0.4, HY - 11.4, 4.4, 4.4, c);
      qo(ex, HY - 10.6, 2.4, 2.4, inner);
    }
  } else if (kind === 'kitty') {
    const ear = ['d......', 'cd.....', 'cid....', 'ciid...', 'ciiid..', 'ciiiid.', 'cccccdd'];
    qg(CX - 15, HY - 18, ear, { c, d: dark, i: inner });
    qg(CX + 9, HY - 18, ear, { c, d: dark, i: inner }, true);
  }
  // the dome: padded, lit from the top-left
  qo(CX, HY - 1, rx + 3, ry + 2.5, dark);
  qo(CX - 0.7, HY - 1.8, rx + 2.3, ry + 1.7, c);
  qo(CX - 6, HY - 10, 3.5, 1.6, shade(c, 0.55));
  q(CX - 11, HY - 6, 1, 2, shade(c, 0.45));
  if (kind === 'frog')
    for (const ex of [CX - 7, CX + 7]) {
      qo(ex, HY - 13, 4.8, 4.4, dark);
      qo(ex - 0.4, HY - 13.4, 4.3, 3.9, c);
      qo(ex + 0.3, HY - 13, 2.8, 2.6, WHITE);
      qo(ex + 0.8, HY - 12.6, 1.3, 1.6, EYE_DARK);
    }
  if (kind === 'kitty' && !back) qg(CX - 2, HY - 15, ['d.d.d', 'd.d.d'], { d: shade(c, -0.2) }); // tabby stripes
  if (!back) {
    // the face in the opening: a darker padded rim, the skin, a fringe of hair peeking out
    const fx = CX + 1, fy = HY + 2.5, frx = rx + 0.2, fry = ry - 1.2;
    qo(fx, fy, frx + 1.4, fry + 1.4, shade(c, -0.22));
    qo(fx, fy, frx, fry, shade(look.skin, -0.08));
    qo(fx - 0.5, fy - 0.4, frx - 0.4, fry - 0.4, look.skin);
    qo(fx, fy, frx, fry, look.hairColor, (_, y) => y <= HY - 5);
    qo(fx, fy, frx, fry, shade(look.hairColor, -0.15), (_, y) => y === HY - 5);
    q(fx - 9, HY - 4, 2, 1, look.hairColor); // the fringe's ends dip
    q(fx + 7, HY - 4, 2, 1, look.hairColor);
    q(fx - 4, HY - 6, 3, 1, shade(look.hairColor, 0.3));
  }
  // floppy puppy ears hang over the sides
  if (kind === 'puppy')
    for (const s of [-1, 1]) {
      qc(CX + s * 14, HY - 9, CX + s * 16, HY + 3, 3.8, shade(hood.inner, -0.12));
      qc(CX + s * 13.7, HY - 9.4, CX + s * 15.6, HY + 2.4, 3.2, hood.inner);
    }
}

function drawHair(look: CharacterLook, back: boolean, rx: number, ry: number, { q, qo, qg }: Draw) {
  const hair = look.hairColor;
  const light = shade(hair, 0.3);
  const dark = shade(hair, -0.15);
  if (look.hair === 'buns')
    for (const bx of [CX - 12, CX + 12]) {
      qo(bx, HY - 10, 5, 5, dark);
      qo(bx - 0.4, HY - 10.4, 4.4, 4.4, hair);
    }
  if (back) {
    // the back of the head: all hair, the nape showing under short styles
    const low = look.hair === 'bob' || look.hair === 'long' ? HY + ry : HY + 6;
    qo(CX, HY, rx + 1, ry + 1, dark, (_, y) => y <= low);
    qo(CX - 0.5, HY - 0.8, rx + 0.4, ry + 0.3, hair, (_, y) => y <= low - 1);
    qo(CX - 4, HY - 8, 4, 1.5, light);
  } else {
    // a smooth cap with a blunt fringe low over the eyes
    const fringe = HY - 3;
    qo(CX, HY - 1, rx + 1, ry + 1, dark, (_, y) => y <= fringe);
    qo(CX - 0.4, HY - 1.6, rx + 0.5, ry + 0.4, hair, (_, y) => y < fringe);
    q(CX - 11, fringe, 3, 1, hair); // the fringe's ends dip a little
    q(CX + 9, fringe, 3, 1, hair);
    qo(CX - 4, HY - 9, 4.5, 1.5, light);
    q(CX - 10, HY - 6, 2, 1, light);
    // side locks: short at the temples, to the jaw (bob), past the shoulders (long)
    const len = look.hair === 'bob' ? 12 : look.hair === 'long' ? 17 : 5;
    const w = look.hair === 'bob' || look.hair === 'long' ? 3 : 2;
    q(CX - rx - 1, fringe - 2, w, len, hair);
    q(CX - rx - 1, fringe - 2, 1, len, dark);
    q(CX + rx + 1 - w, fringe - 2, w, len, hair);
    q(CX + rx, fringe - 2, 1, len, dark);
  }
  // a little pointed tuft (or a crown of them), sticking up
  if (look.hair === 'spiky') qg(CX - 9, HY - ry - 4, ['....h......h.....', '...hh.....hh...h.', '..hhh....hhh..hh.', '.hhhh...hhhh.hhh.'], { h: hair });
  else if (!back && look.hair !== 'buns') qg(CX - 2, HY - ry - 3, ['..h', '.hh', 'hh.'], { h: hair });
}

function drawHat(look: CharacterLook, back: boolean, rx: number, ry: number, { q, qo, qg }: Draw) {
  const top = look.topColor;
  if (look.hat === 'cap') {
    const c = top, dark = shade(top, -0.2);
    qo(CX, HY - 3, rx + 1.5, ry - 1, dark, (_, y) => y <= HY - 6);
    qo(CX - 0.5, HY - 3.6, rx + 1, ry - 1.5, c, (_, y) => y <= HY - 7);
    qo(CX - 4, HY - 11, 3, 1.2, shade(c, 0.4));
    if (back) q(CX - rx, HY - 6, 2 * rx, 1, dark);
    else qo(CX + 7, HY - 5.5, 10, 2.2, dark, (_, y) => y >= HY - 6); // the brim, out front
    q(CX, HY - ry - 2, 1, 1, shade(c, -0.3)); // button
  } else if (look.hat === 'beanie') {
    const c = shade(top, -0.05), dark = shade(top, -0.2);
    qo(CX, HY - 2, rx + 1.5, ry + 0.5, c, (_, y) => y <= HY - 6);
    for (let x = CX - rx + 1; x < CX + rx; x += 3) q(x, HY - 13, 1, 6, shade(c, -0.08)); // knit
    q(CX - rx - 1, HY - 7, 2 * rx + 2, 3, dark);
    q(CX - rx - 1, HY - 7, 2 * rx + 2, 1, shade(dark, 0.15));
    qo(CX, HY - ry - 4, 3.5, 3.2, WHITE);
  } else if (look.hat === 'ribbon') {
    qg(CX + 4, HY - ry - 3, ['rr..rr', 'rrrrrr', 'rrkkrr', 'rrrrrr', 'rr..rr'], { r: RIBBON, k: shade(RIBBON, -0.25) });
  } else if (look.hat === 'sunhat') {
    const straw = '#f1d08a', dark = shade(straw, -0.18);
    qo(CX, HY - 6, rx + 7, 3.4, dark);
    qo(CX - 0.5, HY - 6.6, rx + 6.5, 2.8, straw);
    qo(CX, HY - 10, rx - 3, 6, straw, (_, y) => y <= HY - 7);
    q(CX - rx + 3, HY - 9, 2 * rx - 6, 2, RIBBON);
    qo(CX - 5, HY - 13, 2.5, 1, shade(straw, 0.4));
  }
}

/** Big glossy eyes (a coloured iris, a big highlight up top, a sparkle below), blush, a button nose, a tiny mouth. */
function drawFace(look: CharacterLook, pose: Pose, mood: Mood | null, { q, qg }: Draw) {
  const iris = look.eyeColor ?? '#6b4434';
  const ey = HY + 1;
  // a mood first; then the pose can close / squint the eyes; otherwise the look decides
  const eyes = mood === 'love' ? 'love' : mood === 'wow' ? 'wow' : mood ? 'happy' : (pose.eyes ?? look.eyes);
  const colors = { d: EYE_DARK, i: iris, I: shade(iris, 0.45), W: WHITE, r: '#ff4d73', R: '#ff8fa8' };
  const GLYPHS: Record<string, { rows: string[]; dy: number }> = {
    round: { rows: ['.ddddd.', 'dWWdddd', 'dWWWdid', 'ddWdiid', 'ddiiiid', 'diiIIWd', '.dIIId.', '..ddd..'], dy: 0 },
    dot: { rows: ['.ddd.', 'dWWdd', 'dWdid', 'diIId', '.ddd.'], dy: 2 },
    // sulky: the lid down over the top half
    sleepy: { rows: ['ddddddd', 'dWWdiid', 'ddiiIid', '.dIIId.', '..ddd..'], dy: 3 },
    happy: { rows: ['..ddd..', '.d...d.', 'd.....d'], dy: 3 },
    closed: { rows: ['d.....d', '.d...d.', '..ddd..'], dy: 4 },
    love: { rows: ['.rr.rr.', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], dy: 1 },
    wow: { rows: ['.ddddd.', 'dWWdddd', 'dWWdWdd', 'ddddiid', 'dWiiiid', 'diiIIWd', '.dIIId.', '..ddd..'], dy: -1 },
  };
  const g = GLYPHS[eyes] ?? GLYPHS.round;
  const w = g.rows[0].length;
  qg(FC - 6 - Math.floor(w / 2), ey + g.dy, g.rows, colors);
  qg(FC + 6 - Math.floor(w / 2), ey + g.dy, g.rows, colors);
  // round blush under the outer corners, with a glossy dot
  for (const bx of [FC - 12, FC + 7]) {
    q(bx, ey + 8, 5, 2, BLUSH);
    q(bx + 1, ey + 8, 1, 1, BLUSH_LIGHT);
  }
  // nose and mouth
  const sk = shade(look.skin, -0.2);
  if (look.nose === 'dot') q(FC, ey + 7, 1, 1, sk);
  if (look.nose === 'button') {
    q(FC - 1, ey + 7, 2, 1, '#f3a69a');
    q(FC - 1, ey + 6, 1, 1, shade(look.skin, 0.5));
  }
  const open = mood === 'wow' || mood === 'laugh' || pose.mouth === 'open' || (!mood && look.mouth === 'open');
  const mouth = open ? 'open' : mood ? 'smile' : look.mouth;
  const my = ey + 9;
  if (mouth === 'smile') qg(FC - 2, my, ['m..m', '.mm.'], { m: MOUTH });
  else if (mouth === 'cat') qg(FC - 2, my, ['m.m.m', '.m.m.'], { m: MOUTH });
  else if (mouth === 'open') qg(FC - 1, my, ['mmm', 'mtm', '.m.'], { m: MOUTH, t: TONGUE });
  else qg(FC - 1, my, ['mm', '..'], { m: MOUTH }); // flat: a little pout
}

function drawProp(prop: NonNullable<Pose['prop']>, arms: ArmKind, pix: Pix, { q, qo, qg }: Draw) {
  const [hx, hy] = ARMS[arms].at;
  const lx = 2 * CX - hx; // the left hand (mirrored)
  switch (prop) {
    case 'stick':
      for (let i = 0; i < 6; i++) q(hx + 1 + i, hy - 1 - i, 1, 2, WOOD);
      qo(hx + 8, hy - 8, 2, 2, WHITE);
      q(hx + 7, hy - 7, 2, 1, '#e7b47a');
      break;
    case 'spatula':
    case 'spatulaUp': {
      const o = prop === 'spatulaUp' ? -3 : 0;
      q(hx, hy - 5 + o, 1, 5, WOOD);
      q(hx - 1, hy - 9 + o, 3, 4, METAL);
      break;
    }
    case 'candle':
      q(hx - 1, hy - 5, 2, 5, '#fff3dc');
      q(hx - 1, hy - 8, 2, 3, '#ffb347');
      q(hx - 1, hy - 7, 1, 1, '#fff1a8');
      break;
    case 'pen':
      for (let i = 0; i < 4; i++) q(hx + i, hy - 1 - i, 1, 1, i === 3 ? '#2b2b3a' : '#5c7fd6');
      break;
    case 'book':
    case 'bookFlip':
      q(CX - 7, 33, 14, 6, '#e07a5f');
      q(CX - 6, 33, 6, 5, '#fffaf0');
      q(CX, 33, 6, 5, '#f3e8d4');
      for (const y of [34, 36]) {
        q(CX - 5, y, 4, 1, '#d7cbb6');
        q(CX + 1, y, 4, 1, '#d7cbb6');
      }
      if (prop === 'bookFlip') q(CX + 1, 30, 4, 3, '#fffaf0');
      break;
    case 'fork':
    case 'forkUp': {
      const o = prop === 'forkUp' ? -4 : 0;
      q(hx, hy - 4 + o, 1, 4, METAL);
      qg(hx - 1, hy - 7 + o, ['m.m', 'mmm'], { m: METAL });
      if (prop === 'forkUp') q(hx - 1, hy - 9 + o, 3, 2, '#f2cc8f');
      break;
    }
    case 'cup':
      q(hx - 2, hy - 3, 4, 4, WHITE);
      q(hx - 2, hy - 2, 4, 1, '#ff9fb2');
      q(hx + 2, hy - 2, 1, 2, WHITE);
      q(hx - 1, hy - 6, 1, 1, '#e8e4f0');
      q(hx, hy - 8, 1, 1, '#e8e4f0');
      break;
    case 'dumbbells': {
      const plate = '#5f5870';
      for (const x of [hx, lx]) {
        q(x - 3, hy, 7, 1, METAL);
        q(x - 4, hy - 1, 2, 3, plate);
        q(x + 3, hy - 1, 2, 3, plate);
      }
      break;
    }
    case 'sweat':
      qg(39, 10, ['.b', 'bb', 'bw'], { b: '#8fd0ff', w: WHITE });
      break;
    case 'tube': {
      // a float ring round the middle: the back half behind, the front half in front
      const ring = (front: boolean) =>
        qo(CX, 35, 13, 4.5, '#ff8fab', (x, y) => {
          const a = (x + 0.5 - CX) / 9, b = (y + 0.5 - 34.5) / 2;
          return a * a + b * b > 1 && y >= 35 === front && (front || !pix.get(x, y + Y0));
        });
      ring(false);
      ring(true);
      for (const x of [13, 22, 31]) q(x, 36, 3, 3, WHITE);
      break;
    }
    case 'splash':
    case 'splashB': {
      const s = prop === 'splash' ? [8, 30, 39, 28, 11, 22, 36, 20, 6, 36] : [10, 26, 37, 32, 7, 32, 40, 24, 12, 18];
      for (let i = 0; i < s.length; i += 2) qg(s[i], s[i + 1], ['.w', 'ww', 'w.'], { w: WATER });
      break;
    }
    case 'racketUp':
    case 'racketServe':
    case 'racketFwd':
    case 'racketBall': {
      const up = prop === 'racketUp' || prop === 'racketServe';
      const head = up ? [hx + 2, hy - 9] : [hx + 6, hy - 2];
      if (up) q(hx, hy - 4, 1, 4, '#5a4a6a');
      else q(hx + 1, hy, 4, 1, '#5a4a6a');
      qo(head[0], head[1], 3.5, 4.5, RACKET);
      qo(head[0], head[1], 2.4, 3.4, '#e8f0fb');
      for (let y = head[1] - 2; y <= head[1] + 2; y += 2) q(head[0] - 2, y, 4, 1, '#c3cde8');
      if (prop === 'racketServe') qo(lx, 2, 1.8, 1.8, BALL);
      if (prop === 'racketBall') qo(head[0], head[1] - 7, 1.8, 1.8, BALL);
      break;
    }
    case 'sparkle':
      for (const [x, y] of [[5, 12], [40, 8], [39, 26]] as const) qg(x, y, ['..w..', '..y..', 'wyWyw', '..y..', '..w..'], { w: '#fff3b0', y: STAR, W: WHITE });
      break;
  }
}

// ── painting ──────────────────────────────────────────────────

const canvases = new Map<string, HTMLCanvasElement>();

/** The character drawn into a little canvas (cached per look + pose + view), one canvas pixel per art pixel. */
export function avatarCanvas(look: CharacterLook, pose: Pose = {}, opts: AvatarOpts = {}) {
  const key = `${JSON.stringify(look)}|${JSON.stringify(pose)}|${opts.back ? 1 : 0}|${opts.mood ?? ''}`;
  let c = canvases.get(key);
  if (!c) {
    if (canvases.size > 800) canvases.delete(canvases.keys().next().value!); // the oldest
    canvases.set(key, (c = renderAvatar(look, pose, opts).canvas()));
  }
  return c;
}
