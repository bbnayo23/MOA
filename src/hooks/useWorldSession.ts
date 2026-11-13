import { useEffect } from 'react';
import { fromGame } from '../bridge';
import { ACTIONS } from '../data/actions';
import { HUB, THEMES, THEME_CONFIGS, type ThemeId } from '../data/themes';
import { startMockFriends } from '../mock';
import { supabase } from '../net/supabase';
import { useMoa } from '../store';

/** While a world is open: mock friends are around, and game events land in the store. */
export function useWorldSession() {
  const themeId = useMoa((st) => st.themeId);
  const panel = useMoa((st) => (st.currentAction ? ACTIONS[st.currentAction].opens : undefined));
  const preview = useMoa((st) => st.preview);

  useEffect(() => (themeId && !supabase ? startMockFriends(themeId) : undefined), [themeId]);
  useEffect(() => {
    const st = useMoa.getState();
    const offs = [
      fromGame.on('objectClick', st.selectObject),
      fromGame.on('actionChange', st.setCurrentAction),
      fromGame.on('portal', st.visit),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return { theme: themeId ? THEME_CONFIGS[themeId] : undefined, panel, preview };
}

/** Every place you can go from the sidebar: the plaza first, then the eight themes. */
export function usePlaces(currentId: ThemeId) {
  const visit = useMoa((st) => st.visit);
  return [THEME_CONFIGS[HUB]!, ...THEMES].map((t) => ({
    ...t,
    here: t.themeId === currentId,
    open: t.themeId in THEME_CONFIGS,
    go: () => t.themeId !== currentId && visit(t.themeId),
  }));
}
