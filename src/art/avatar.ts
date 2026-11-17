import type { Pose } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { Pix, shade } from './pix.ts';

/**
 * The character as pixel art: an art-toy chibi — a big round head (or an
 * animal hood) with huge glossy eyes, a small soft body. Drawn from the look
 * and an animation pose, seen from the front (turned a little to the right)
 * or from behind; facing left is the mirror image.
 */
export const AV_W = 48;
export const AV_H = 62;
/** The row the soles stand on: sprites put this row on the ground. */
export const AV_FOOT = 60;

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
const BLUSH = '#ffa8b8';
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
};

const FACE: Record<CharacterLook['face'], { rx: number; ry: number }> = {
  round: { rx: 13, ry: 12 },
  oval: { rx: 12, ry: 12.5 },
  wide: { rx: 14, ry: 11.5 },
};

// Design grid: the body is drawn around x = 24 with the head's centre at HY; Y0 leaves room above for ears.
const CX = 24;
const Y0 = 6;
const HY = 24;

type ArmKind = NonNullable<Pose['arms']>;
type Rect = [x: number, y: number, w: number, h: number];
/** The right arm (screen right, the way they face) per pose: sleeve parts, the hand, and the hand's centre. */
const ARMS: Record<ArmKind, { sleeve: Rect[]; hand: Rect; at: [number, number] }> = {
  down: { sleeve: [[31, 37, 3, 4]], hand: [31, 41, 3, 3], at: [32, 42] },
  up: { sleeve: [[31, 34, 3, 3], [32, 31, 3, 3]], hand: [32, 27, 3, 4], at: [33, 28] },
  waveA: { sleeve: [[31, 34, 3, 3], [33, 31, 3, 3]], hand: [34, 27, 3, 4], at: [35, 28] },
  waveB: { sleeve: [[31, 35, 3, 3], [34, 33, 3, 3]], hand: [36, 30, 3, 4], at: [37, 31] },
  front: { sleeve: [[31, 38, 4, 3]], hand: [35, 38, 3, 3], at: [36, 39] },
  pray: { sleeve: [[30, 37, 3, 3], [26, 39, 4, 3]], hand: [23, 38, 3, 3], at: [24, 39] },
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
  const q = (x: number, y: number, w: number, h: number, c: string) => pix.put(x + lean, y + u + Y0, w, h, c);
  const qr = (r: Rect, c: string) => q(r[0], r[1], r[2], r[3], c);
  const qo = (cx: number, cy: number, rx: number, ry: number, c: string, only?: (x: number, y: number) => boolean) =>
    pix.oval(cx + lean, cy + u + Y0, rx, ry, c, only && ((x, y) => only(x - lean, y - u - Y0)));
  const qg = (x: number, y: number, rows: string[], colors: Record<string, string>, flip = false) => pix.glyph(x + lean, y + u + Y0, rows, colors, flip);

  const { skin } = look;
  const hair = look.hairColor;
  const top = look.topColor;
  const bottom = look.bottomColor;
  const dress = look.top === 'dress';
  const hood = HOOD[look.hat];
  const { rx, ry } = FACE[look.face];
  const arms = pose.arms ?? 'down';
  const armC = shade(top, -0.1);
  const longSleeves = look.top === 'hoodie' || look.top === 'jacket';

  // ── behind the body: long hair ──
  if (look.hair === 'long' && !hood) qo(CX, HY + 8, rx - 1, 15, shade(hair, -0.12));

  // ── legs and shoes (none in the water) ──
  if (!swim) {
    const bare = dress || look.bottom !== 'pants';
    const legC = bare ? skin : bottom;
    const legDark = shade(legC, -0.12);
    // a step lifts one foot; seated, both hang a little off the ground
    const liftL = sit ? 2 : legs === 'stepA' ? 1 : 0;
    const liftR = sit ? 2 : legs === 'stepB' ? 1 : 0;
    const leg = (x: number, lift: number) => {
      p(x, 47, 4, 5 - lift, legC);
      p(x + 3, 47, 1, 5 - lift, legDark);
      if (look.bottom === 'shorts' && !dress) p(x, 47, 4, 1, bottom);
    };
    leg(19, liftL);
    leg(25, liftR);
    const shoe = (x: number, lift: number) => {
      p(x, 52 - lift, 5, 2, look.shoes);
      p(x + 1, 52 - lift, 2, 1, shade(look.shoes, 0.35));
    };
    shoe(19, liftL);
    shoe(25, liftR);
  }

  // ── hips: pants / shorts / skirt (a dress flares in the top's colour) ──
  if (!swim) {
    if (dress || look.bottom === 'skirt') {
      const c = dress ? top : bottom;
      q(17, 43, 14, 2, c);
      q(16, 45, 16, 2, c);
      q(15, 47, 18, 2, c);
      q(15, 48, 18, 1, shade(c, -0.15));
      q(18, 45, 1, 3, shade(c, -0.08));
      q(29, 45, 1, 3, shade(c, -0.08));
    } else {
      q(17, 43, 14, 4, bottom);
      if (sit) q(17, 46, 14, 1, bottom);
      q(24, 44, 1, 3, shade(bottom, -0.18));
      q(17, 46, 14, 1, shade(bottom, -0.1));
    }
  }

  // ── torso ──
  q(18, 35, 12, 1, top);
  q(17, 36, 14, 7, top);
  q(30, 37, 1, 6, shade(top, -0.12));
  q(17, 42, 14, 1, shade(top, -0.12));
  if (!back) {
    if (look.top === 'tee') q(23, 35, 2, 1, skin);
    if (look.top === 'stripe') for (const y of [37, 40]) q(17, y, 14, 1, WHITE);
    if (look.top === 'hoodie') {
      q(20, 39, 8, 3, shade(top, -0.08)); // pocket
      q(20, 39, 8, 1, shade(top, -0.18));
      q(22, 36, 1, 2, WHITE); // strings
      q(25, 36, 1, 2, WHITE);
    }
    if (look.top === 'jacket') {
      q(22, 35, 4, 8, WHITE);
      q(21, 35, 1, 8, shade(top, -0.22));
      q(26, 35, 1, 8, shade(top, -0.22));
      q(24, 38, 1, 1, shade(top, -0.3));
      q(24, 40, 1, 1, shade(top, -0.3));
    }
    if (dress) q(17, 41, 14, 1, shade(top, 0.3)); // a waist ribbon
  } else {
    if (look.top === 'stripe') for (const y of [37, 40]) q(17, y, 14, 1, WHITE);
    if (look.top === 'hoodie') qo(CX, 36, 6, 2.5, shade(top, -0.15)); // the hood, down on the back
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
  const hx = CX, hy = HY;
  if (hood) {
    drawHoodEars(look.hat, hood, back, qo, qg);
    qo(hx, hy - 1, rx + 2.5, ry + 2, shade(hood.c, -0.12));
    qo(hx - 0.6, hy - 1.8, rx + 1.8, ry + 1.3, hood.c);
    qo(hx - 5, hy - 9, 3, 1.5, shade(hood.c, 0.5)); // vinyl shine
    if (look.hat === 'frog') drawFrogEyes(hood, qo);
    if (!back) {
      // the face, in the hood's opening (a darker rim round it), with a fringe of hair
      const fx = hx + 1, fy = hy + 2, frx = rx - 1.5, fry = ry - 2.5;
      qo(fx, fy, frx + 1, fry + 1, shade(hood.c, -0.2));
      qo(fx, fy, frx, fry, skin);
      qo(fx - 0.5, fy + 0.5, frx - 0.5, fry - 0.5, skin);
      qo(fx, fy, frx, fry, hair, (_, y) => y <= hy - 4);
      qo(fx, fy, frx, fry, shade(hair, -0.15), (_, y) => y === hy - 4);
      if (look.hat === 'kitty') qg(hx - 1, hy - 13, ['c.c.c', '.c.c.'], { c: shade(hood.c, -0.18) });
    }
  } else {
    // skin, darker round the bottom-right like a lit vinyl head
    qo(hx, hy, rx, ry, shade(skin, -0.1));
    qo(hx - 0.6, hy - 0.7, rx - 0.6, ry - 0.6, skin);
    drawHair(look, back, hx, hy, rx, ry, qo, qg, q);
    drawHat(look, back, hx, hy, rx, ry, qo, qg, q);
  }

  // ── the face ──
  if (!back) drawFace(look, pose, mood, qg, q, !!hood);

  // ── accessories ──
  if (look.accessory === 'scarf') {
    q(17, 34, 14, 3, SCARF);
    q(17, 36, 14, 1, shade(SCARF, -0.15));
    if (!back) q(26, 37, 3, 5, shade(SCARF, -0.05));
    if (!back) q(26, 41, 3, 1, WHITE);
  }
  if (look.accessory === 'glasses' && !back) {
    const ring = ['.gggggg.', 'g......g', 'g......g', 'g......g', 'g......g', 'g......g', '.gggggg.'];
    qg(15, 23, ring, { g: GLASSES });
    qg(27, 23, ring, { g: GLASSES });
    q(23, 25, 4, 1, GLASSES);
  }
  const pinAt: [number, number] = hood ? [hx - 9, hy - 12] : [hx - 10, hy - 9];
  if (look.accessory === 'star') qg(pinAt[0], pinAt[1], ['..y..', 'yyyyy', '.yYy.', '.y.y.'], { y: STAR, Y: shade(STAR, -0.15) });
  if (look.accessory === 'flower') qg(pinAt[0], pinAt[1], ['.p.p.', 'ppypp', '.ppp.', '..p..'], { p: FLOWER, y: STAR });

  // ── raised arms, in front of the head ──
  if (raised(leftKind)) drawArm(leftKind, true);
  if (raised(arms)) drawArm(arms, false);

  // ── props ──
  if (pose.prop) drawProp(pose.prop, arms, pix, q, qo, qg, p);

  return pix.outline();
}

type Q = (x: number, y: number, w: number, h: number, c: string) => void;
type QO = (cx: number, cy: number, rx: number, ry: number, c: string, only?: (x: number, y: number) => boolean) => void;
type QG = (x: number, y: number, rows: string[], colors: Record<string, string>, flip?: boolean) => void;

function drawHoodEars(kind: string, hood: { c: string; inner: string }, back: boolean, qo: QO, qg: QG) {
  const c = hood.c, dark = shade(c, -0.12);
  if (kind === 'bunny') {
    // two tall ears, the right one flopping a little
    qo(18, 6, 3, 8, dark);
    qo(17.6, 5.6, 2.5, 7.5, c);
    if (!back) qo(17.8, 7, 1.2, 5.5, hood.inner);
    qg(27, 0, ['..ddd.', '.dcccd', 'dccccd', 'dcicd.', 'dcicd.', 'dcicd.', 'dcicd.', 'dccd..', 'dccd..', 'dccd..', '.dcd..'], { c, d: dark, i: back ? c : hood.inner });
  } else if (kind === 'bear') {
    for (const ex of [13, 35]) {
      qo(ex, 13, 4.5, 4.5, dark);
      qo(ex - 0.3, 12.7, 4, 4, c);
      if (!back) qo(ex, 13.3, 2, 2, hood.inner);
    }
  } else if (kind === 'kitty') {
    const ear = ['d.....', 'cd....', 'cid...', 'ciid..', 'ciiid.', 'cccccd'];
    qg(11, 5, ear, { c, d: dark, i: back ? c : hood.inner });
    qg(31, 5, ear, { c, d: dark, i: back ? c : hood.inner }, true);
  }
}

function drawFrogEyes(hood: { c: string; inner: string }, qo: QO) {
  for (const ex of [17, 31]) {
    qo(ex, 11, 4.5, 4, shade(hood.c, -0.12));
    qo(ex - 0.3, 10.7, 4, 3.6, hood.c);
    qo(ex, 11, 2.6, 2.4, WHITE);
    qo(ex + 0.5, 11.3, 1.2, 1.4, EYE_DARK);
  }
}

function drawHair(look: CharacterLook, back: boolean, hx: number, hy: number, rx: number, ry: number, qo: QO, qg: QG, q: Q) {
  const hair = look.hairColor;
  const light = shade(hair, 0.3);
  const dark = shade(hair, -0.15);
  if (look.hair === 'buns')
    for (const bx of [hx - 11, hx + 11]) {
      qo(bx, hy - 10, 4.5, 4.5, dark);
      qo(bx - 0.4, hy - 10.4, 4, 4, hair);
    }
  if (back) {
    // the back of the head: all hair, the nape showing under short styles
    const low = look.hair === 'bob' || look.hair === 'long' ? hy + ry : hy + 6;
    qo(hx, hy, rx + 1, ry + 1, dark, (_, y) => y <= low);
    qo(hx - 0.5, hy - 0.8, rx + 0.4, ry + 0.3, hair, (_, y) => y <= low - 1);
    qo(hx - 4, hy - 8, 4, 1.5, light);
  } else {
    // a smooth cap with a blunt fringe low over the eyes
    const fringe = hy - 3;
    qo(hx, hy - 1, rx + 1, ry + 1, dark, (_, y) => y <= fringe);
    qo(hx - 0.4, hy - 1.6, rx + 0.5, ry + 0.4, hair, (_, y) => y < fringe);
    q(hx - 10, fringe, 2, 1, hair); // the fringe's ends dip a little
    q(hx + 9, fringe, 2, 1, hair);
    qo(hx - 4, hy - 9, 4.5, 1.5, light);
    q(hx - 9, hy - 7, 2, 1, light);
    // side locks: short at the temples, to the jaw (bob), past the shoulders (long)
    const len = look.hair === 'bob' ? 12 : look.hair === 'long' ? 18 : 5;
    const w = look.hair === 'bob' || look.hair === 'long' ? 3 : 2;
    q(hx - rx - 1, fringe - 2, w, len, hair);
    q(hx - rx - 1, fringe - 2, 1, len, dark);
    q(hx + rx + 1 - w, fringe - 2, w, len, hair);
    q(hx + rx, fringe - 2, 1, len, dark);
  }
  if (look.hair === 'spiky') qg(hx - 9, hy - ry - 4, ['....h......h.....', '...hh.....hh...h.', '..hhh....hhh..hh.', '.hhhh...hhhh.hhh.'], { h: hair });
}

function drawHat(look: CharacterLook, back: boolean, hx: number, hy: number, rx: number, ry: number, qo: QO, qg: QG, q: Q) {
  const top = look.topColor;
  if (look.hat === 'cap') {
    const c = top, dark = shade(top, -0.2);
    qo(hx, hy - 3, rx + 1.5, ry - 1, dark, (_, y) => y <= hy - 6);
    qo(hx - 0.5, hy - 3.6, rx + 1, ry - 1.5, c, (_, y) => y <= hy - 7);
    qo(hx - 4, hy - 11, 3, 1.2, shade(c, 0.4));
    if (back) q(hx - rx, hy - 6, 2 * rx, 1, dark);
    else qo(hx + 7, hy - 5.5, 10, 2.2, dark, (_, y) => y >= hy - 6); // the brim, out front
    q(hx, hy - ry - 2, 1, 1, shade(c, -0.3)); // button
  } else if (look.hat === 'beanie') {
    const c = shade(top, -0.05), dark = shade(top, -0.2);
    qo(hx, hy - 2, rx + 1.5, ry + 0.5, c, (_, y) => y <= hy - 6);
    for (let x = hx - rx + 1; x < hx + rx; x += 3) q(x, hy - 13, 1, 6, shade(c, -0.08)); // knit
    q(hx - rx - 1, hy - 7, 2 * rx + 2, 3, dark);
    q(hx - rx - 1, hy - 7, 2 * rx + 2, 1, shade(dark, 0.15));
    qo(hx, hy - ry - 4, 3.5, 3.2, WHITE);
  } else if (look.hat === 'ribbon') {
    qg(hx + 3, hy - ry - 3, ['rr..rr', 'rrrrrr', 'rrkkrr', 'rrrrrr', 'rr..rr'], { r: RIBBON, k: shade(RIBBON, -0.25) });
  } else if (look.hat === 'sunhat') {
    const straw = '#f1d08a', dark = shade(straw, -0.18);
    qo(hx, hy - 6, rx + 7, 3.4, dark);
    qo(hx - 0.5, hy - 6.6, rx + 6.5, 2.8, straw);
    qo(hx, hy - 10, rx - 3, 6, straw, (_, y) => y <= hy - 7);
    q(hx - rx + 3, hy - 9, 2 * rx - 6, 2, RIBBON);
    qo(hx - 5, hy - 13, 2.5, 1, shade(straw, 0.4));
  }
}

function drawFace(look: CharacterLook, pose: Pose, mood: Mood | null, qg: QG, q: Q, hooded: boolean) {
  const iris = look.eyeColor ?? '#6b4434';
  const ey = HY + (hooded ? 1 : 0);
  // a mood first; then the pose can close / squint the eyes; otherwise the look decides
  const eyes = mood === 'love' ? 'love' : mood === 'wow' ? 'wow' : mood ? 'happy' : (pose.eyes ?? look.eyes);
  const colors = { d: EYE_DARK, i: iris, I: shade(iris, 0.4), W: WHITE, r: '#ff4d73', l: shade(look.skin, -0.3) };
  const GLYPHS: Record<string, { rows: string[]; dy: number }> = {
    round: { rows: ['.dddd.', 'dWWddd', 'dWWdid', 'ddiiid', 'diiIId', 'ddIIWd', '.dddd.'], dy: -1 },
    dot: { rows: ['.dd.', 'dWdd', 'ddid', '.dd.'], dy: 1 },
    sleepy: { rows: ['lllll', 'dWWdd', 'diiId', '.ddd.'], dy: 2 },
    happy: { rows: ['.ddd.', 'd...d'], dy: 2 },
    closed: { rows: ['d...d', '.ddd.'], dy: 3 },
    love: { rows: ['.r.r.', 'rWrrr', 'rrrrr', '.rrr.', '..r..'], dy: 0 },
    wow: { rows: ['.ddd.', 'dWWWd', 'dWdWd', 'dWWWd', '.ddd.'], dy: 0 },
  };
  const g = GLYPHS[eyes] ?? GLYPHS.round;
  const w = g.rows[0].length;
  // a little turned: the face sits a pixel right of the head's middle
  qg(19 - Math.floor(w / 2), ey + g.dy, g.rows, colors);
  qg(30 - Math.floor(w / 2), ey + g.dy, g.rows, colors);
  q(16, ey + 6, 3, 1, BLUSH);
  q(30, ey + 6, 3, 1, BLUSH);
  // nose and mouth
  const sk = shade(look.skin, -0.22);
  if (look.nose === 'dot') q(24, ey + 5, 1, 1, sk);
  if (look.nose === 'button') {
    q(24, ey + 5, 2, 1, sk);
    q(24, ey + 4, 1, 1, shade(look.skin, 0.4));
  }
  const open = mood === 'wow' || mood === 'laugh' || pose.mouth === 'open' || (!mood && look.mouth === 'open');
  const mouth = open ? 'open' : mood ? 'smile' : look.mouth;
  const my = ey + 7;
  if (mouth === 'smile') qg(23, my, ['m..m', '.mm.'], { m: MOUTH });
  else if (mouth === 'cat') qg(22, my, ['m.m.m', '.m.m.'], { m: MOUTH });
  else if (mouth === 'open') qg(23, my, ['mmmm', 'mttm', '.mm.'], { m: MOUTH, t: TONGUE });
  else q(24, my, 2, 1, MOUTH); // flat: a small pout
}

function drawProp(prop: NonNullable<Pose['prop']>, arms: ArmKind, pix: Pix, q: Q, qo: QO, qg: QG, p: Q) {
  const [hx, hy] = ARMS[arms].at;
  const [lx] = [2 * CX - hx]; // the left hand (mirrored)
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
      q(CX - 7, 37, 14, 6, '#e07a5f');
      q(CX - 6, 37, 6, 5, '#fffaf0');
      q(CX, 37, 6, 5, '#f3e8d4');
      for (const y of [38, 40]) {
        q(CX - 5, y, 4, 1, '#d7cbb6');
        q(CX + 1, y, 4, 1, '#d7cbb6');
      }
      if (prop === 'bookFlip') q(CX + 1, 34, 4, 3, '#fffaf0');
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
      qg(37, 14, ['.b', 'bb', 'bw'], { b: '#8fd0ff', w: WHITE });
      break;
    case 'tube': {
      // a float ring round the middle: the back half behind, the front half in front
      const ring = (front: boolean) =>
        qo(CX, 38, 13, 4.5, '#ff8fab', (x, y) => {
          const u = (x + 0.5 - CX) / 9, v = (y + 0.5 - 37.5) / 2;
          const inner = u * u + v * v <= 1;
          const fr = y >= 38;
          return !inner && fr === front && (front || !pix.get(x, y + Y0));
        });
      ring(false);
      ring(true);
      for (const x of [13, 22, 31]) q(x, 39, 3, 3, WHITE);
      break;
    }
    case 'splash':
    case 'splashB': {
      const d = prop === 'splash' ? [8, 30, 39, 28, 11, 22, 36, 20, 6, 38] : [10, 26, 37, 32, 7, 34, 40, 24, 12, 18];
      for (let i = 0; i < d.length; i += 2) qg(d[i], d[i + 1], ['.w', 'ww', 'w.'], { w: WATER });
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
      for (const [x, y] of [[6, 16], [40, 12], [38, 30]] as const) qg(x, y, ['..w..', '..y..', 'wyWyw', '..y..', '..w..'], { w: '#fff3b0', y: STAR, W: WHITE });
      break;
  }
  void p;
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
