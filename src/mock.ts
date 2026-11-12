import type { Player } from './data/character';
import { useMoa } from './store';

// ponytail: stand-in for realtime presence + chat. Replace with a Supabase
// channel that calls the same store actions (say / system).
export const FRIENDS: Player[] = [
  {
    id: 'haru',
    nickname: '하루',
    look: {
      skin: '#fcd5bd', eyes: 'round', mouth: 'cat', hair: 'short', hairColor: '#4a3540',
      top: 'hoodie', topColor: '#b5e8c9', bottom: 'pants', bottomColor: '#5c6185', shoes: '#fffaf2',
      hat: 'cap', accessory: 'none',
    },
  },
  {
    id: 'momo',
    nickname: '모모',
    look: {
      skin: '#ffe8dc', eyes: 'happy', mouth: 'smile', hair: 'long', hairColor: '#f4a6c0',
      top: 'stripe', topColor: '#cbb8ff', bottom: 'skirt', bottomColor: '#ffd38a', shoes: '#ff9a7a',
      hat: 'none', accessory: 'star',
    },
  },
];

const AMBIENT = ['불멍 최고다… 🔥', '마시멜로 누가 구울래? 🍡', '별 진짜 많다 ✨', '고기 다 익었어! 🍖', '여기 공기 너무 좋다 🌲', '노래 틀까? 🎵'];
const REPLIES: [RegExp, string[]][] = [
  [/안녕|하이|ㅎㅇ|hi|hello/i, ['안녕~ 👋', '왔구나! 반가워 😆']],
  [/ㅋㅋ|ㅎㅎ|웃겨/, ['ㅋㅋㅋㅋㅋ', 'ㅎㅎ 귀여워']],
  [/배고|고기|먹|바비큐/, ['고기 굽자 🍖', '그릴 쪽으로 와!']],
  [/불|모닥|마시멜로/, ['불멍 하러 가자 🔥', '마시멜로 내 거도 ㅎㅎ']],
];
const GENERIC = ['오 진짜?', '좋아좋아 👍', 'ㅇㅈ', '헐 대박', '나도나도!'];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (a: number, b: number) => a + Math.random() * (b - a);

export function startMockFriends(): () => void {
  const timers = new Set<number>();
  const later = (ms: number, fn: () => void) => {
    const t = window.setTimeout(() => (timers.delete(t), fn()), ms);
    timers.add(t);
  };
  const { say, system } = useMoa.getState();

  later(300, () => system(`${FRIENDS.map((f) => f.nickname).join(', ')}님이 먼저 와 있어요!`));
  const ambient = () => {
    say(pick(FRIENDS), pick(AMBIENT));
    later(between(18000, 35000), ambient);
  };
  later(between(5000, 9000), ambient);

  const unsub = useMoa.subscribe((s, prev) => {
    const last = s.messages.at(-1);
    if (!last || last === prev.messages.at(-1) || last.playerId !== 'me') return;
    const pool = REPLIES.find(([re]) => re.test(last.text))?.[1];
    if (!pool && Math.random() < 0.4) return;
    later(between(1200, 2600), () => say(pick(FRIENDS), pick(pool ?? GENERIC)));
  });

  return () => {
    unsub();
    timers.forEach(clearTimeout);
  };
}
