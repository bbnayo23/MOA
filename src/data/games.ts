import type { ThemeId } from './themes/types';

/**
 * Minigames: pure data. Which space each is played in, how many play, and how
 * the result reads. The game itself (rules, scene, controls) is in src/games/;
 * the lobby / countdown / results around it are shared (src/games/session.ts).
 */
export type GameId =
  | 'tennis' | 'doubles' | 'swim' | 'hurdles'
  | 'fishing' | 'barista' | 'squat' | 'memory' | 'styling' | 'breath'
  | 'stars' | 'recall' | 'rhythm' | 'bookhunt' | 'vote' | 'glass';

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
  /** A game with no winner: what it came to, all together ({n}: the count). */
  together?: string;
  /** Two teams: seats 0 · 2 against 1 · 3. */
  teams?: boolean;
  /** Start with whoever's here: empty seats go to computer players. */
  fill?: boolean;
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
  doubles: {
    id: 'doubles', name: '테니스 2:2 복식', icon: '🎾', themeId: 'tennis', min: 2, max: 4, cpu: 3, score: 'points', scene: true, teams: true, fill: true,
    howTo: ['두 명씩 한 팀 — 각자 코트 절반(왼쪽·오른쪽)을 맡아요', '내 쪽 절반으로 오는 공을 쳐요 (← → 이동 · Space 스윙)', '서브는 팀끼리 번갈아, 팀 안에서도 번갈아', '빈자리는 컴퓨터가 채워요 — 먼저 5점 내는 팀이 승리'],
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
  hurdles: {
    id: 'hurdles', name: '오리 피하기 레이스', icon: '🦆', themeId: 'pool', min: 2, max: 4, cpu: 2, score: 'time', scene: true,
    howTo: ['수영 레이스처럼 ← → 를 번갈아 헤엄쳐요', '레인마다 고무 오리가 떠 있어요 — 바로 앞에서 잠수! (Space · 잠수)', '오리에 부딪히면 확 느려져요', '가장 먼저 25m를 찍으면 1등'],
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
  // second games, one more per space
  stars: {
    id: 'stars', name: '별자리 잇기', icon: '🌌', themeId: 'camping', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['밤하늘의 별을 1번부터 차례로 눌러 이어요', '별자리를 완성하면 다음 별자리가 떠요', '엉뚱한 별을 누르면 잠깐 멈춰요', '45초 동안 가장 많이 이으면 승리'],
  },
  recall: {
    id: 'recall', name: '주문 기억하기', icon: '🧾', themeId: 'restaurant', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['손님 주문이 하나씩 보여요 — 잘 기억해요', '다 보여 주면 순서대로 눌러요 (숫자키 1–6)', '맞히면 주문이 길어지고, 틀리면 짧아져요', '50초 동안 기억한 메뉴가 가장 많으면 승리'],
  },
  rhythm: {
    id: 'rhythm', name: '리듬 운동', icon: '🎵', themeId: 'gym', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['음표가 선에 닿을 때 그 줄을 눌러요 (J · K · L · 터치)', '딱 맞으면 2점, 조금 어긋나면 1점', '아무 때나 누르면 1점 깎여요', '40초 동안 최고 점수에 도전'],
  },
  bookhunt: {
    id: 'bookhunt', name: '책 찾기', icon: '📖', themeId: 'library', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['손님이 찾는 책과 색·모양이 같은 책을 책장에서 골라요', '찾으면 1점, 새 책장이 나와요', '잘못 고르면 잠깐 멈춰요', '45초 동안 가장 많이 찾으면 승리'],
  },
  vote: {
    id: 'vote', name: '코디 투표', icon: '🗳️', themeId: 'mall', min: 2, max: 4, cpu: 2, score: 'points',
    howTo: ['오늘의 주제에 어울리게 28초 동안 옷을 골라요', '그다음 모두의 코디를 보고 가장 잘 어울리는 사람에게 투표해요 (나 말고)', '받은 표가 점수예요', '혼자 하면 컴퓨터도 주제를 보고 투표해요'],
  },
  glass: {
    id: 'glass', name: '스테인드글라스', icon: '🧩', themeId: 'church', min: 2, max: 6, cpu: 0, score: 'none', together: '함께 완성한 창 {n}장',
    howTo: ['조각을 누르면 한 칸씩 돌아가요', '모든 조각이 바르게 놓이면 창이 완성돼요', '함께하는 친구와 같은 창을 맞춰요 — 누가 돌려도 모두에게 보여요', '점수도 순위도 없어요. 60초 동안 몇 장을 함께 완성할까요'],
  },
};
