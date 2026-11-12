import { toGame } from '../bridge';
import { ACTIONS, type ActionId } from '../data/actions';
import type { ThemeConfig } from '../data/themes';
import { useMoa } from '../store';

/** The action bar shows the clicked object's actions, or everything the theme offers. */
export function useActionBar(theme: ThemeConfig) {
  const selected = useMoa((st) => st.selectedObject);
  const current = useMoa((st) => st.currentAction);
  const selectObject = useMoa((st) => st.selectObject);
  const target = theme.interactionObjects.find((o) => o.id === selected);

  return {
    target,
    actions: (target ? target.actions : theme.availableActions).map((id) => ({
      id,
      ...ACTIONS[id],
      active: current === id,
    })),
    run: (actionId: ActionId) => {
      toGame.emit('act', { actionId, objectId: target?.id });
      selectObject(null);
    },
    clearTarget: () => selectObject(null),
  };
}
