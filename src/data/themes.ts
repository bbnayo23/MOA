import type { Background } from '../art/ground';
import type { ArtKind } from '../art/props';
import { isWalkable, tileToWorld, type Tile } from '../game/iso';
import type { ActionId } from './actions';
import type { CharacterLook } from './character';

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

const camping: ThemeConfig = {
  themeId: 'camping',
  name: '캠핑장',
  emoji: '🏕️',
  tagline: '별 아래 모닥불 앞에서',
  activities: ['모닥불 피우기', '바비큐', '불멍', '텐트에서 쉬기'],
  color: '#86cfa0',
  background: {
    size: 8,
    sky: ['#6f6cc4', '#8a7fd3', '#a891dd', '#c4a3e0', '#e2b3d6', '#f7c7c4'],
    hills: ['#a596d8', '#8379c4'],
    ground: ['#b8e6b0', '#a9dca3'],
    side: ['#c99b7a', '#b5876a'],
    night: true,
    flowers: ['#ffb3c6', '#fff1a8', '#c9b6ff', '#ffffff'],
    motes: 0xfff3a0,
  },
  spawnPosition: { tx: 5.6, ty: 5.6 },
  availableActions: ['fireGaze', 'roast', 'bbq', 'rest', 'sit', 'wave', 'dance'],
  interactionObjects: [
    {
      id: 'campfire', kind: 'campfire', label: '모닥불', icon: '🔥', at: { tx: 4.2, ty: 4.2 },
      actions: ['fireGaze', 'roast'],
      spots: [{ tx: 3.35, ty: 5.0 }, { tx: 5.0, ty: 3.35 }, { tx: 3.6, ty: 3.6 }],
    },
    {
      id: 'grill', kind: 'grill', label: '바비큐 그릴', icon: '🍖', at: { tx: 4.4, ty: 1.4 },
      actions: ['bbq'],
      spots: [{ tx: 3.9, ty: 1.9 }, { tx: 4.9, ty: 0.9 }],
    },
    {
      id: 'tent', kind: 'tent', label: '텐트', icon: '⛺', at: { tx: 1.3, ty: 4.0 },
      actions: ['rest'],
      spots: [{ tx: 1.9, ty: 4.5 }],
    },
  ],
  decorations: [
    // forest behind and along the back edges
    ...[
      [-0.8, 1], [1, -0.8], [-0.6, 2.5], [2.5, -0.6], [-0.5, 4.5], [4.5, -0.5],
      [0.2, 1.2], [1.3, 0.2], [0.3, 3.2], [3.4, 0.3], [0.2, 5.6], [6.0, 0.2], [7.5, 0.4],
    ].map(([tx, ty]) => ({ kind: 'pine' as const, at: { tx, ty } })),
    { kind: 'log', at: { tx: 3.3, ty: 4.9 } },
    { kind: 'log', at: { tx: 4.9, ty: 3.3 } },
    { kind: 'lantern', at: { tx: 2.2, ty: 6.4 } },
    { kind: 'lantern', at: { tx: 6.6, ty: 2.0 } },
    { kind: 'bush', at: { tx: 7.4, ty: 4.6 } },
    { kind: 'bush', at: { tx: 1.6, ty: 7.4 } },
    { kind: 'rock', at: { tx: 7.0, ty: 7.0 } },
    { kind: 'rock', at: { tx: 0.8, ty: 6.8 } },
  ],
  recommendedOutfits: [
    { name: '🌲 캠핑 후디', look: { top: 'hoodie', topColor: '#b5e8c9', bottom: 'pants', bottomColor: '#5c6185', hat: 'beanie' } },
    { name: '🔥 불멍 니트', look: { top: 'stripe', topColor: '#ff9a7a', accessory: 'scarf', hat: 'none' } },
  ],
};

// Pews in three rows either side of the aisle (which runs up the screen's centre line).
const pews: InteractionObject[] = [6, 8, 10].flatMap((sum, row) =>
  [-1.7, 1.7].map((d, side) => {
    const at = { tx: (sum - d) / 2, ty: (sum + d) / 2 };
    return {
      id: `pew-${row}-${side}`, kind: 'pew' as const, label: '긴 의자', icon: '🪑', at,
      actions: ['sit' as const],
      spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + o + 0.08, ty: at.ty - o + 0.08 })),
    };
  }),
);

const church: ThemeConfig = {
  themeId: 'church',
  name: '교회',
  emoji: '⛪',
  tagline: '조용히 마음을 모으는 곳',
  activities: ['기도하기', '앉기', '촛불 켜기', '응원 메시지 남기기'],
  color: '#d6b48c',
  background: {
    size: 8,
    sky: ['#f4e4f2', '#f6e6ec', '#f8e9e6', '#faece0'],
    ground: ['#f0dcc0', '#e8d0b0'],
    side: ['#c99b7a', '#b5876a'],
    walls: { left: '#fbf3e8', right: '#f1e3d2', trim: '#d6b48c', glass: ['#ffb3c6', '#a9cdfc', '#ffe08a', '#b5e8c9', '#cbb8ff'] },
    rugs: [{ from: { tx: 2.4, ty: 2.4 }, to: { tx: 8, ty: 8 }, width: 1.1, color: '#e98aa2', border: '#f6c76b' }],
    motes: 0xfff8e1,
  },
  spawnPosition: { tx: 6.6, ty: 6.6 },
  availableActions: ['pray', 'sit', 'lightCandle', 'cheer', 'wave'],
  interactionObjects: [
    {
      id: 'altar', kind: 'altar', label: '제단', icon: '✝️', at: { tx: 1.4, ty: 1.4 },
      actions: ['pray'],
      spots: [{ tx: 2.3, ty: 2.3 }, { tx: 1.7, ty: 2.9 }, { tx: 2.9, ty: 1.7 }],
    },
    {
      id: 'candles', kind: 'candles', label: '촛불', icon: '🕯️', at: { tx: 0.7, ty: 3.6 },
      actions: ['lightCandle'],
      spots: [{ tx: 1.5, ty: 3.9 }, { tx: 0.9, ty: 4.5 }],
    },
    {
      id: 'board', kind: 'board', label: '응원 보드', icon: '💌', at: { tx: 3.6, ty: 0.7 },
      actions: ['cheer'],
      spots: [{ tx: 3.9, ty: 1.5 }, { tx: 4.5, ty: 0.9 }],
    },
    ...pews,
  ],
  decorations: [
    { kind: 'plant', at: { tx: 0.5, ty: 2.2 } },
    { kind: 'plant', at: { tx: 2.2, ty: 0.5 } },
    { kind: 'plant', at: { tx: 0.6, ty: 7.0 } },
    { kind: 'plant', at: { tx: 7.0, ty: 0.6 } },
  ],
  recommendedOutfits: [
    { name: '👔 단정한 재킷', look: { top: 'jacket', topColor: '#5c6185', bottom: 'pants', bottomColor: '#5c6185', hat: 'none' } },
    { name: '🎀 주일 원피스룩', look: { top: 'tee', topColor: '#fffaf2', bottom: 'skirt', bottomColor: '#cbb8ff', hat: 'ribbon' } },
  ],
};

/** Themes you can enter from the plaza. The rest are preview-only until their config lands here. */
const PLAYABLE: Partial<Record<ThemeId, ThemeConfig>> = { camping, church };

/** The eight theme buildings around the plaza, in this order. */
export const THEMES: ThemeMeta[] = [
  camping,
  church,
  { themeId: 'pool', name: '수영장', emoji: '🏊', tagline: '첨벙첨벙 여름 한가운데', activities: ['수영하기', '튜브 타기', '물장구치기'], color: '#7cc4f0' },
  { themeId: 'tennis', name: '테니스장', emoji: '🎾', tagline: '랠리 한 판 어때?', activities: ['서브', '스윙', '랠리', '친구와 미니게임'], color: '#f2a37e' },
  { themeId: 'gym', name: '헬스장', emoji: '🏋️', tagline: '같이 하면 덜 힘들어', activities: ['덤벨 들기', '러닝머신', '스트레칭', '스쿼트'], color: '#a99fd0' },
  { themeId: 'library', name: '도서관', emoji: '📚', tagline: '사각사각 집중 모드', activities: ['책 읽기', '공부하기', '집중 타이머'], color: '#c9a27e' },
  { themeId: 'mall', name: '쇼핑몰', emoji: '🛍️', tagline: '오늘의 코디 쇼핑', activities: ['옷 구경', '피팅룸', '의상 변경', '코디 공유'], color: '#ff9fc0' },
  { themeId: 'restaurant', name: '레스토랑', emoji: '🍝', tagline: '맛있는 수다 타임', activities: ['음식 주문', '식사하기', '음료 마시기', '대화하기'], color: '#ff9a8a' },
];

// Buildings line the two back edges of the plaza, alternating left / right from the top corner.
const buildings: InteractionObject[] = THEMES.map((t, i) => {
  const along = 1.5 + 1.8 * Math.floor(i / 2);
  const at = i % 2 ? { tx: along, ty: 0.55 } : { tx: 0.55, ty: along };
  return {
    id: `door-${t.themeId}`, kind: 'building', label: t.name, icon: t.emoji, at,
    actions: [],
    spots: [{ tx: at.tx + 0.55, ty: at.ty + 0.55 }],
    color: t.color,
    enter: t.themeId,
    locked: !PLAYABLE[t.themeId],
  };
});

const bench = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'pew', label: '벤치', icon: '🪑', at,
  actions: ['sit'],
  spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + o + 0.08, ty: at.ty - o + 0.08 })),
});

const plaza: ThemeConfig = {
  themeId: 'plaza',
  name: '모아 광장',
  emoji: '⛲',
  tagline: '우리 모두 모이는 곳',
  activities: ['친구 만나기', '테마 공간 들어가기'],
  color: '#c9b6ff',
  background: {
    size: 8,
    sky: ['#a9c8ff', '#bcd2ff', '#cfdcff', '#e2e3ff', '#f3e6fb', '#ffe9f0'],
    hills: ['#c4d9f5', '#b3e0c8'],
    ground: ['#f6efe7', '#ece4f4'],
    side: ['#d8c9e6', '#c4b4d8'],
    flowers: ['#ffb3c6', '#fff1a8', '#c9b6ff'],
    rugs: [
      { from: { tx: 0, ty: 4 }, to: { tx: 8, ty: 4 }, width: 1.1, color: '#f8dcc8', border: '#efc6a8' },
      { from: { tx: 4, ty: 0 }, to: { tx: 4, ty: 8 }, width: 1.1, color: '#f8dcc8', border: '#efc6a8' },
    ],
    motes: 0xffd6e0,
  },
  spawnPosition: { tx: 5.4, ty: 5.4 },
  availableActions: ['sit', 'wave', 'dance'],
  interactionObjects: [...buildings, bench('bench-l', { tx: 2.7, ty: 5.1 }), bench('bench-r', { tx: 5.1, ty: 2.7 })],
  decorations: [
    { kind: 'fountain', at: { tx: 4, ty: 4 } },
    { kind: 'bush', at: { tx: 1.2, ty: 7.4 } },
    { kind: 'bush', at: { tx: 7.4, ty: 1.2 } },
    { kind: 'plant', at: { tx: 3.6, ty: 7.5 } },
    { kind: 'plant', at: { tx: 7.5, ty: 3.6 } },
    { kind: 'rock', at: { tx: 2.6, ty: 7.3 } },
    { kind: 'rock', at: { tx: 7.3, ty: 2.6 } },
  ],
  recommendedOutfits: [],
};

/** Every enterable world, the plaza included. */
export const THEME_CONFIGS: Partial<Record<ThemeId, ThemeConfig>> = { plaza, ...PLAYABLE };

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
