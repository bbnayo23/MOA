import type { Pose } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { Pix, shade } from './pix';

export const AVATAR_W = 30;
export const AVATAR_H = 31;
/** Row under the feet outline — sprites anchor here. */
export const AVATAR_FOOT = 30;

// Body is designed on a 22-wide grid centred at x=11; OX leaves room for props.
const OX = 4;
const OY = 1;
const INK = '#3a2e3f';
const MOUTH = '#d0607a';
const BLUSH = '#ffb3c1';
const WHITE = '#fffdf8';
const GLASSES = '#5b4a6b';
const STAR = '#ffd166';
const SCARF = '#ff8a8a';
const RIBBON = '#ff8fab';

/** Character look + animation pose → outlined pixel grid (facing right). */
export function renderAvatar(look: CharacterLook, pose: Pose = {}): Pix {
  const pix = new Pix(AVATAR_W, AVATAR_H);
  const sit = pose.legs === 'sit';
  const u = (sit ? 2 : 0) + (pose.bob ?? 0);
  // p: planted on the ground (legs, shoes); q: moves with the upper body
  const p = (x: number, y: number, w: number, h: number, c: string) => pix.put(x + OX, y + OY, w, h, c);
  const q = (x: number, y: number, w: number, h: number, c: string) => p(x, y + u, w, h, c);
  const dots = (c: string, xy: number[]) => {
    for (let i = 0; i < xy.length; i += 2) q(xy[i], xy[i + 1], 1, 1, c);
  };

  const { skin, hairColor: hair, topColor: top, bottomColor: bottom, shoes } = look;
  const arm = shade(top, -0.12);

  // back hair
  if (look.hair === 'long') q(3, 9, 16, 12, shade(hair, -0.1));
  if (look.hair === 'buns')
    for (const bx of [2, 16]) {
      q(bx + 1, 2, 2, 1, hair);
      q(bx, 3, 4, 2, hair);
      q(bx + 1, 5, 2, 1, hair);
    }

  // legs & shoes
  if (sit) {
    p(5, 25, 12, 1, look.bottom === 'shorts' ? skin : bottom);
    p(4, 26, 3, 2, shoes);
    p(15, 26, 3, 2, shoes);
  } else {
    const liftL = pose.legs === 'stepA' ? 1 : 0;
    const liftR = pose.legs === 'stepB' ? 1 : 0;
    const legC = look.bottom === 'pants' ? bottom : skin;
    const [lx, rx, lw] = look.bottom === 'skirt' ? [8, 12, 2] : [7, 12, 3];
    p(lx, 23 + u, lw, 3 - u - liftL, legC);
    p(rx, 23 + u, lw, 3 - u - liftR, legC);
    if (look.bottom === 'shorts') {
      p(7, 23 + u, 3, 1, bottom);
      p(12, 23 + u, 3, 1, bottom);
    }
    p(6, 26 - liftL, 4, 2, shoes);
    p(12, 26 - liftR, 4, 2, shoes);
  }

  // hips
  if (look.bottom === 'skirt') {
    q(7, 21, 8, 1, bottom);
    q(6, 22, 10, 2, bottom);
    q(6, 23, 10, 1, shade(bottom, -0.1));
  } else {
    q(7, 21, 8, 2, bottom);
    q(10, 22, 2, 1, shade(bottom, -0.15));
  }

  // torso
  q(7, 16, 8, 5, top);
  if (look.top === 'tee') q(10, 16, 2, 1, skin);
  if (look.top === 'stripe') {
    q(7, 17, 8, 1, WHITE);
    q(7, 19, 8, 1, WHITE);
  }
  if (look.top === 'hoodie') {
    q(7, 16, 8, 1, shade(top, -0.15));
    dots(WHITE, [9, 17, 12, 17]);
    q(9, 19, 4, 1, shade(top, -0.1));
  }
  if (look.top === 'jacket') {
    q(10, 16, 2, 5, WHITE);
    dots(shade(top, -0.2), [9, 17, 12, 17]);
  }

  // head
  q(6, 5, 10, 1, skin);
  q(5, 6, 12, 1, skin);
  q(4, 7, 14, 7, skin);
  q(5, 14, 12, 1, skin);
  q(6, 15, 10, 1, skin);

  // face
  const eyes = pose.eyes === 'closed' ? 'sleepy' : (pose.eyes ?? look.eyes);
  if (eyes === 'round') {
    q(7, 10, 2, 2, INK);
    q(13, 10, 2, 2, INK);
    dots(WHITE, [7, 10, 13, 10]);
  } else if (eyes === 'dot') {
    q(8, 10, 1, 2, INK);
    q(13, 10, 1, 2, INK);
  } else if (eyes === 'happy') {
    dots(INK, [6, 11, 7, 10, 8, 11, 13, 11, 14, 10, 15, 11]);
  } else {
    q(7, 11, 2, 1, INK);
    q(13, 11, 2, 1, INK);
  }
  q(5, 12, 2, 1, BLUSH);
  q(15, 12, 2, 1, BLUSH);
  if (look.mouth === 'smile') dots(MOUTH, [9, 12, 10, 13, 11, 13, 12, 12]);
  else if (look.mouth === 'cat') dots(MOUTH, [8, 13, 9, 14, 10, 13, 11, 13, 12, 14, 13, 13]);
  else if (look.mouth === 'open') q(10, 13, 2, 2, MOUTH);
  else q(10, 13, 2, 1, MOUTH);

  // front hair
  q(7, 3, 8, 1, hair);
  q(5, 4, 12, 1, hair);
  q(4, 5, 14, 4, hair);
  q(7, 4, 3, 1, shade(hair, 0.3));
  q(6, 5, 2, 1, shade(hair, 0.3));
  if (look.hair === 'spiky') {
    q(6, 2, 2, 1, hair);
    q(10, 1, 2, 2, hair);
    q(14, 2, 2, 1, hair);
  }
  if (look.hair === 'bob' || look.hair === 'long') {
    const len = look.hair === 'long' ? 10 : 9;
    q(3, 6, 2, len, hair);
    q(17, 6, 2, len, hair);
  } else {
    q(4, 9, 1, 3, hair);
    q(17, 9, 1, 3, hair);
  }

  // arms (after head so a raised arm sits in front of it)
  const sleeve = look.top === 'hoodie' || look.top === 'jacket' ? 3 : 2;
  const armDown = (x: number) => {
    q(x, 16, 2, sleeve, arm);
    q(x, 16 + sleeve, 2, 4 - sleeve, skin);
  };
  const arms = pose.arms ?? 'down';
  if (arms === 'up') {
    q(4, 15, 2, 2, arm);
    q(3, 13, 2, 2, arm);
    q(3, 11, 2, 2, skin);
  } else armDown(5);
  if (arms === 'up' || arms === 'waveA') {
    q(16, 15, 2, 2, arm);
    q(17, 13, 2, 2, arm);
    q(17, 11, 2, 2, skin);
  } else if (arms === 'waveB') {
    q(16, 15, 2, 2, arm);
    q(18, 13, 2, 2, arm);
    q(19, 11, 2, 2, skin);
  } else if (arms === 'front') {
    q(15, 17, 3, 2, arm);
    q(18, 17, 2, 2, skin);
  } else armDown(15);

  // hat (matches the top colour)
  if (look.hat === 'cap') {
    q(6, 2, 10, 1, top);
    q(5, 3, 12, 4, top);
    q(7, 3, 3, 1, shade(top, 0.35));
    q(4, 7, 16, 1, shade(top, -0.2));
  } else if (look.hat === 'beanie') {
    q(6, 2, 10, 1, top);
    q(5, 3, 12, 3, top);
    q(4, 6, 14, 2, shade(top, -0.15));
    q(10, 1, 2, 1, WHITE);
  } else if (look.hat === 'ribbon') {
    q(12, 2, 2, 3, RIBBON);
    q(17, 2, 2, 3, RIBBON);
    dots(RIBBON, [14, 3, 16, 3]);
    dots(shade(RIBBON, -0.25), [15, 3]);
  }

  // accessory
  if (look.accessory === 'glasses') {
    for (const gx of [6, 12]) {
      q(gx, 9, 4, 1, GLASSES);
      q(gx, 12, 4, 1, GLASSES);
      q(gx, 10, 1, 2, GLASSES);
      q(gx + 3, 10, 1, 2, GLASSES);
    }
    q(10, 10, 2, 1, GLASSES);
  } else if (look.accessory === 'star') {
    q(15, 5, 1, 3, STAR);
    q(14, 6, 3, 1, STAR);
  } else if (look.accessory === 'scarf') {
    q(6, 15, 10, 2, SCARF);
    q(12, 17, 2, 3, shade(SCARF, -0.1));
  }

  // prop, held in the right hand of the 'front' arm
  if (pose.prop === 'stick') {
    dots('#8b5a3c', [20, 16, 21, 15, 22, 14, 23, 13]);
    q(23, 11, 2, 2, '#fff4e6');
    dots('#e0a96d', [24, 12]);
  } else if (pose.prop) {
    const o = pose.prop === 'spatulaUp' ? -2 : 0;
    dots('#9aa0a6', [20, 16 + o, 21, 15 + o, 22, 14 + o]);
    q(22, 11 + o, 3, 3, '#d7dbe2');
  }

  return pix.outline();
}
