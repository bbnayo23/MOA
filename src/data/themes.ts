import type { Background } from '../art/ground';
import type { ArtKind } from '../art/props';
import { isWalkable, tileToWorld, type Tile } from '../game/iso';
import type { ActionId } from './actions';
import type { CharacterLook } from './character';

export type ThemeId = 'camping' | 'church' | 'pool' | 'tennis' | 'gym' | 'library' | 'mall' | 'restaurant';

/** Enough to show a theme on the select screen. */
export interface ThemeMeta {
  themeId: ThemeId;
  name: string;
  emoji: string;
  tagline: string;
  activities: string[];
  /** Card palette: [floor A, floor B]. */
  colors: [string, string];
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
  colors: ['#b8e6b0', '#a9dca3'],
  background: {
    size: 8,
    sky: ['#6f6cc4', '#8a7fd3', '#a891dd', '#c4a3e0', '#e2b3d6', '#f7c7c4'],
    hills: ['#a596d8', '#8379c4'],
    ground: ['#b8e6b0', '#a9dca3'],
    side: ['#c99b7a', '#b5876a'],
    flowers: ['#ffb3c6', '#fff1a8', '#c9b6ff', '#ffffff'],
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

/** Playable themes. The rest are preview-only until their config lands here. */
export const THEME_CONFIGS: Partial<Record<ThemeId, ThemeConfig>> = { camping };

export const THEMES: ThemeMeta[] = [
  camping,
  { themeId: 'church', name: '교회', emoji: '⛪', tagline: '조용히 마음을 모으는 곳', activities: ['기도하기', '앉기', '촛불 켜기', '응원 메시지 남기기'], colors: ['#f3e3c8', '#e8d3b0'] },
  { themeId: 'pool', name: '수영장', emoji: '🏊', tagline: '첨벙첨벙 여름 한가운데', activities: ['수영하기', '튜브 타기', '물장구치기'], colors: ['#a9e1ff', '#8fd0f5'] },
  { themeId: 'tennis', name: '테니스장', emoji: '🎾', tagline: '랠리 한 판 어때?', activities: ['서브', '스윙', '랠리', '친구와 미니게임'], colors: ['#9fd8a8', '#f2a37e'] },
  { themeId: 'gym', name: '헬스장', emoji: '🏋️', tagline: '같이 하면 덜 힘들어', activities: ['덤벨 들기', '러닝머신', '스트레칭', '스쿼트'], colors: ['#d8d4e6', '#c6c1d8'] },
  { themeId: 'library', name: '도서관', emoji: '📚', tagline: '사각사각 집중 모드', activities: ['책 읽기', '공부하기', '집중 타이머'], colors: ['#e7c9a5', '#d9b78f'] },
  { themeId: 'mall', name: '쇼핑몰', emoji: '🛍️', tagline: '오늘의 코디 쇼핑', activities: ['옷 구경', '피팅룸', '의상 변경', '코디 공유'], colors: ['#ffe0ec', '#f6f0ff'] },
  { themeId: 'restaurant', name: '레스토랑', emoji: '🍝', tagline: '맛있는 수다 타임', activities: ['음식 주문', '식사하기', '음료 마시기', '대화하기'], colors: ['#ffffff', '#ffb3b3'] },
];

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
