export const SKIN_TONES = ['#ffe8dc', '#fcd5bd', '#eab894', '#c99271', '#8f6450'] as const;
export const HAIR_COLORS = ['#4a3540', '#8a5a44', '#e0a96d', '#f7d88b', '#f4a6c0', '#a7bcf5', '#9fdcc0', '#eeeaf6'] as const;
export const CLOTH_COLORS = ['#fffaf2', '#ffb3c6', '#ffd38a', '#b5e8c9', '#a9cdfc', '#cbb8ff', '#ff9a7a', '#5c6185'] as const;
/** The colour deep in the big glossy eyes. */
export const EYE_COLORS = ['#6b4434', '#3d6fb8', '#3c8a5c', '#d0703c', '#7b52b0', '#2e2a3a'] as const;

export const FACE_SHAPES = ['round', 'oval', 'wide'] as const;
export const NOSES = ['none', 'dot', 'button'] as const;
export const HAIR_STYLES = ['short', 'bob', 'long', 'spiky', 'buns'] as const;
export const EYE_TYPES = ['round', 'dot', 'happy', 'sleepy'] as const;
export const MOUTH_TYPES = ['smile', 'cat', 'open', 'flat'] as const;
export const TOP_STYLES = ['tee', 'stripe', 'hoodie', 'jacket', 'dress'] as const;
export const BOTTOM_STYLES = ['pants', 'shorts', 'skirt'] as const;
/** Hats, and animal hoods (a kigurumi hood with ears; its colour is the animal's). */
export const HAT_STYLES = ['none', 'cap', 'beanie', 'ribbon', 'sunhat', 'bunny', 'bear', 'frog', 'kitty', 'puppy'] as const;
export const ACCESSORIES = ['none', 'glasses', 'star', 'scarf', 'flower'] as const;

export interface CharacterLook {
  skin: string;
  face: (typeof FACE_SHAPES)[number];
  eyes: (typeof EYE_TYPES)[number];
  /** Looks saved before eye colours existed have none: brown. */
  eyeColor?: string;
  nose: (typeof NOSES)[number];
  mouth: (typeof MOUTH_TYPES)[number];
  hair: (typeof HAIR_STYLES)[number];
  hairColor: string;
  top: (typeof TOP_STYLES)[number];
  topColor: string;
  bottom: (typeof BOTTOM_STYLES)[number];
  bottomColor: string;
  shoes: string;
  hat: (typeof HAT_STYLES)[number];
  accessory: (typeof ACCESSORIES)[number];
}

export interface Player {
  id: string;
  nickname: string;
  look: CharacterLook;
}

/** Drives the customisation UI: one entry per editable slot. */
export const LOOK_OPTIONS: {
  tab: '얼굴' | '헤어' | '옷' | '소품';
  key: keyof CharacterLook;
  label: string;
  values: readonly string[];
  color?: boolean;
}[] = [
  { tab: '얼굴', key: 'skin', label: '피부색', values: SKIN_TONES, color: true },
  { tab: '얼굴', key: 'face', label: '얼굴형', values: FACE_SHAPES },
  { tab: '얼굴', key: 'eyes', label: '눈', values: EYE_TYPES },
  { tab: '얼굴', key: 'eyeColor', label: '눈동자 색', values: EYE_COLORS, color: true },
  { tab: '얼굴', key: 'nose', label: '코', values: NOSES },
  { tab: '얼굴', key: 'mouth', label: '입', values: MOUTH_TYPES },
  { tab: '헤어', key: 'hair', label: '헤어스타일', values: HAIR_STYLES },
  { tab: '헤어', key: 'hairColor', label: '헤어 컬러', values: HAIR_COLORS, color: true },
  { tab: '옷', key: 'top', label: '상의', values: TOP_STYLES },
  { tab: '옷', key: 'topColor', label: '상의 컬러', values: CLOTH_COLORS, color: true },
  { tab: '옷', key: 'bottom', label: '하의', values: BOTTOM_STYLES },
  { tab: '옷', key: 'bottomColor', label: '하의 컬러', values: CLOTH_COLORS, color: true },
  { tab: '옷', key: 'shoes', label: '신발', values: CLOTH_COLORS, color: true },
  { tab: '소품', key: 'hat', label: '모자 · 후드', values: HAT_STYLES },
  { tab: '소품', key: 'accessory', label: '액세서리', values: ACCESSORIES },
];

export const LABELS: Record<string, string> = {
  oval: '갸름', wide: '넓적', button: '동글 코',
  round: '동글', dot: '콩알', happy: '웃는 눈', sleepy: '뾰로통',
  smile: '미소', cat: '고양이', open: '활짝', flat: '시크',
  short: '숏컷', bob: '단발', long: '긴 머리', spiky: '삐죽', buns: '똥머리',
  tee: '티셔츠', stripe: '스트라이프', hoodie: '후디', jacket: '재킷', dress: '원피스',
  pants: '바지', shorts: '반바지', skirt: '치마',
  none: '없음', cap: '캡모자', beanie: '비니', ribbon: '리본', sunhat: '밀짚모자',
  bunny: '토끼 후드', bear: '곰 후드', frog: '개구리 후드', kitty: '고양이 후드', puppy: '강아지 후드',
  glasses: '안경', star: '별 핀', scarf: '목도리', flower: '꽃 핀',
};

export const PRESETS: { name: string; look: CharacterLook }[] = [
  {
    name: '모아',
    look: {
      skin: '#ffe8dc', face: 'round', eyes: 'round', eyeColor: '#d0703c', nose: 'none', mouth: 'flat', hair: 'bob', hairColor: '#8a5a44',
      top: 'hoodie', topColor: '#ffb3c6', bottom: 'skirt', bottomColor: '#ffb3c6', shoes: '#fffaf2',
      hat: 'bunny', accessory: 'none',
    },
  },
  {
    name: '콩이',
    look: {
      skin: '#fcd5bd', face: 'wide', eyes: 'sleepy', eyeColor: '#3c8a5c', nose: 'dot', mouth: 'cat', hair: 'short', hairColor: '#4a3540',
      top: 'tee', topColor: '#b5e8c9', bottom: 'pants', bottomColor: '#5c6185', shoes: '#ff9a7a',
      hat: 'frog', accessory: 'none',
    },
  },
  {
    name: '보리',
    look: {
      skin: '#eab894', face: 'round', eyes: 'round', eyeColor: '#6b4434', nose: 'button', mouth: 'smile', hair: 'short', hairColor: '#f7d88b',
      top: 'stripe', topColor: '#ffd38a', bottom: 'shorts', bottomColor: '#a9cdfc', shoes: '#cbb8ff',
      hat: 'bear', accessory: 'scarf',
    },
  },
  {
    name: '루루',
    look: {
      skin: '#ffe8dc', face: 'round', eyes: 'round', eyeColor: '#3d6fb8', nose: 'button', mouth: 'cat', hair: 'short', hairColor: '#e0a96d',
      top: 'hoodie', topColor: '#ffd38a', bottom: 'shorts', bottomColor: '#a9cdfc', shoes: '#ff9a7a',
      hat: 'puppy', accessory: 'none',
    },
  },
];

export function randomLook(): CharacterLook {
  const look = { ...PRESETS[0].look } as Record<keyof CharacterLook, string>;
  for (const o of LOOK_OPTIONS) look[o.key] = o.values[Math.floor(Math.random() * o.values.length)];
  return look as CharacterLook;
}
