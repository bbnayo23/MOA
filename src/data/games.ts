import type { ThemeId } from './themes/types';

/**
 * Minigames: pure data. Which space each is played in, how many play, and how
 * the result reads. The game itself (rules, scene, controls) is in src/games/;
 * the lobby / countdown / results around it are shared (src/games/session.ts).
 */
export type GameId = 'tennis' | 'swim' | 'fishing' | 'barista' | 'squat' | 'memory' | 'styling' | 'breath';

export interface GameDef {
  id: GameId;
  name: string;
  icon: string;
  themeId: ThemeId;
  /** Players in a match (a solo game fills up with computer players). */
  min: number;
  max: number;
  /** Computer players in a solo game. */
  cpu: number;
  /** points: most wins · time: fastest wins (null = didn't finish) · none: no winner, just doing it together. */
  score: 'points' | 'time' | 'none';
  /** Played in its own 3D scene (the world stops meanwhile); otherwise on a card over the world. */
  scene?: boolean;
  howTo: string[];
}

export const GAMES: Record<GameId, GameDef> = {
  tennis: {
    id: 'tennis',
    name: '테니스 1:1',
    icon: '🎾',
    themeId: 'tennis',
    min: 2,
    max: 2,
    cpu: 1,
    score: 'points',
    scene: true,
    howTo: ['← → (◀ ▶)로 공이 떨어질 곳으로 달려가요', '공이 오면 타이밍 맞춰 스윙! (Space · 스윙)', '스윙할 때 ← →를 누르고 있으면 그쪽으로 쳐요', '먼저 5점 내면 승리'],
  },
  swim: {
    id: 'swim',
    name: '수영 레이스 25m',
    icon: '🏊',
    themeId: 'pool',
    min: 2,
    max: 4,
    cpu: 2,
    score: 'time',
    scene: true,
    howTo: ['← → (왼팔 · 오른팔)를 번갈아 눌러 헤엄쳐요', '박자를 맞출수록 빨라요 — 너무 빨리 연타하면 허우적', '같은 팔을 두 번 누르면 첨벙, 느려져요', '가장 먼저 25m를 찍으면 1등'],
  },
  // one per space: a round of N seconds on a card over the world (rules: src/games/timed.ts)
  fishing: {
    id: 'fishing', name: '호숫가 낚시', icon: '🎣', themeId: 'camping', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['찌가 쏙 들어가면 그때 낚아채요! (Space · 낚아채기)', '큰 물고기일수록 점수는 높고 기회는 짧아요', '헛챔질하면 다음 입질이 도망가요', '40초 동안 가장 많이 낚으면 승리'],
  },
  barista: {
    id: 'barista', name: '바리스타 챌린지', icon: '☕', themeId: 'restaurant', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['주문에 맞는 재료를 컵에 담아요 (숫자키 1–7 · 터치)', '다 담았으면 내기! (Space) — 틀리면 컵을 비우고 다시', '레시피는 옆의 메뉴판에 있어요', '45초 동안 가장 많이 만들면 승리'],
  },
  squat: {
    id: 'squat', name: '스쿼트 타이밍', icon: '🦵', themeId: 'gym', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['게이지가 초록 칸에 오면 Space · 스쿼트!', '한가운데 딱 맞으면 2점, 근처면 1점', '빗나가면 휘청 — 잠깐 쉬어야 해요', '할수록 빨라져요. 40초 동안 최고 점수에 도전'],
  },
  memory: {
    id: 'memory', name: '기억력 카드', icon: '🃏', themeId: 'library', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['카드 두 장을 뒤집어 같은 그림을 찾아요', '짝을 맞히면 1점, 다 맞히면 새 판이 깔려요', '모두 같은 카드 배치로 겨뤄요', '60초 동안 가장 많이 찾으면 승리'],
  },
  styling: {
    id: 'styling', name: '스타일링 챌린지', icon: '👗', themeId: 'mall', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['손님이 원하는 모자 · 옷 · 소품을 골라요', '다 골랐으면 완성! — 맞으면 1점, 다음 손님', '틀리면 다시 골라 보세요', '45초 동안 가장 많이 코디하면 승리'],
  },
  breath: {
    id: 'breath', name: '함께 호흡하기', icon: '🕊️', themeId: 'church', min: 2, max: 6, cpu: 0, score: 'none',
    howTo: ['원이 커질 때 숨을 들이쉬며 꾹 누르고 (Space · 누르기)', '원이 작아질 때 손을 떼고 내쉬어요', '함께한 친구들의 호흡도 작은 원으로 보여요', '점수도 순위도 없어요. 1분 동안 천천히'],
  },
};
