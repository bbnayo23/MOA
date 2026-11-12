import { toGame } from '../bridge';
import type { CharacterLook } from '../data/character';
import { OUTFITS } from '../data/themes/mall';
import { useMoa } from '../store';

/** The fitting room: try looks on (changes your outfit everywhere), share, or open the full editor. */
export function useWardrobe() {
  const look = useMoa((st) => st.me.look);

  return {
    outfits: OUTFITS.map((o) => ({
      ...o,
      preview: { ...look, ...o.look },
      wearing: (Object.keys(o.look) as (keyof CharacterLook)[]).every((k) => look[k] === o.look[k]),
    })),
    wear: (patch: Partial<CharacterLook>) => useMoa.getState().setLook(patch),
    share: () => {
      const st = useMoa.getState();
      st.system(`👗 ${st.me.nickname}님이 오늘의 코디를 공유했어요`);
      st.say(st.me, '✨ 오늘 코디 어때?');
    },
    customize: () => useMoa.getState().go('create'),
    /** Stops my "trying on" action, which closes the fitting room. */
    close: () => toGame.emit('stop', null),
  };
}
