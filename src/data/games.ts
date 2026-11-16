import type { ThemeId } from './themes/types';

/**
 * Minigames: pure data. Which space each is played in, how many play, and how
 * the result reads. The game itself (rules, scene, controls) is in src/games/;
 * the lobby / countdown / results around it are shared (src/games/session.ts).
 */
export type GameId = 'tennis' | 'swim';

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
  /** points: most wins · time: fastest wins (null = didn't finish). */
  score: 'points' | 'time';
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
    howTo: ['← → (왼팔 · 오른팔)를 번갈아 눌러 헤엄쳐요', '박자를 맞출수록 빨라요 — 너무 빨리 연타하면 허우적', '같은 팔을 두 번 누르면 첨벙, 느려져요', '가장 먼저 25m를 찍으면 1등'],
  },
};
