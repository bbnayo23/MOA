import type { Player } from './data/character';
import type { ThemeId } from './data/themes';
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

const AMBIENT: Partial<Record<ThemeId, string[]>> = {
  plaza: ['다들 어디 갈래? 🗺️', '캠핑장 가서 불멍할까? 🔥', '오늘 날씨 좋다 ☀️', '분수 앞에서 사진 찍자 📸', '교회 응원 보드 봤어? 💌', '수영장은 언제 열려? 🏊'],
  camping: ['불멍 최고다… 🔥', '마시멜로 누가 구울래? 🍡', '별 진짜 많다 ✨', '고기 다 익었어! 🍖', '여기 공기 너무 좋다 🌲', '노래 틀까? 🎵'],
  restaurant: ['여기 파스타 맛집이래 🍝', '디저트 뭐 먹을래? 🍰', '버블티 하나 더! 🧋', '오늘은 내가 쏠게 💳', '창가 자리 좋다 ✨'],
  library: ['쉿… 여기 도서관이야 🤫', '이 책 진짜 재밌다 📖', '같이 25분만 집중하자 ⏰', '창가 자리 명당이다 ☀️', '시험 범위 어디까지야? 📝'],
  church: ['여기 오면 마음이 편해져 🕊️', '스테인드글라스 너무 예쁘다 ✨', '촛불 하나 켜고 갈게 🕯️', '응원 보드에 한 줄 남겼어 💌', '이번 주도 다들 고생했어 🙏'],
};
const REPLIES: [RegExp, string[]][] = [
  [/안녕|하이|ㅎㅇ|hi|hello/i, ['안녕~ 👋', '왔구나! 반가워 😆']],
  [/ㅋㅋ|ㅎㅎ|웃겨/, ['ㅋㅋㅋㅋㅋ', 'ㅎㅎ 귀여워']],
  [/주세요|파스타|피자|버거|케이크|버블티|샐러드/, ['나도 한 입만 😋', '맛있겠다!', '그거 여기 시그니처야 ✨']],
  [/배고|고기|먹|바비큐/, ['고기 굽자 🍖', '그릴 쪽으로 와!']],
  [/불|모닥|마시멜로/, ['불멍 하러 가자 🔥', '마시멜로 내 거도 ㅎㅎ']],
  [/기도|힘들|응원|화이팅|파이팅/, ['너라면 잘할 거야 💪', '같이 기도할게 🙏', '응원해! 💕']],
];
const SEED_CHEERS = ['다들 이번 주도 화이팅! 💪', '우리 오래오래 같이 놀자 💕'];
const GENERIC = ['오 진짜?', '좋아좋아 👍', 'ㅇㅈ', '헐 대박', '나도나도!'];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (a: number, b: number) => a + Math.random() * (b - a);

export function startMockFriends(themeId: ThemeId): () => void {
  const timers = new Set<number>();
  const later = (ms: number, fn: () => void) => {
    const t = window.setTimeout(() => (timers.delete(t), fn()), ms);
    timers.add(t);
  };
  const { say, system, addCheer } = useMoa.getState();

  later(300, () => {
    system(`${FRIENDS.map((f) => f.nickname).join(', ')}님이 먼저 와 있어요!`);
    if (!useMoa.getState().cheers.length) SEED_CHEERS.forEach((text, i) => addCheer(FRIENDS[i % FRIENDS.length].nickname, text));
  });
  const lines = AMBIENT[themeId] ?? GENERIC;
  const ambient = () => {
    say(pick(FRIENDS), pick(lines));
    later(between(18000, 35000), ambient);
  };
  later(between(5000, 9000), ambient);

  const unsub = useMoa.subscribe((s, prev) => {
    const note = s.cheers.at(-1);
    if (note && note !== prev.cheers.at(-1) && note.nickname === s.me.nickname)
      later(between(1500, 3000), () => say(pick(FRIENDS), pick(['응원 고마워 💕', '보드에 남긴 거 봤어! 🥹', '나도 힘낼게 💪'])));
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
