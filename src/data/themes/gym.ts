import type { Tile } from '../../game/iso';
import type { InteractionObject, ThemeConfig } from './types';

/** You stand on the belt, just in front of the console. */
const treadmill = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'treadmill', label: '러닝머신', icon: '🏃', at,
  actions: ['treadmill'],
  spots: [{ tx: at.tx + 0.1, ty: at.ty + 0.1 }],
});

const mat = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'mat', label: '요가 매트', icon: '🧘', at,
  actions: ['stretch', 'squat'],
  spots: [{ tx: at.tx + 0.05, ty: at.ty + 0.05 }],
});

export const gym: ThemeConfig = {
  themeId: 'gym',
  name: '헬스장',
  emoji: '🏋️',
  tagline: '같이 하면 덜 힘들어',
  activities: ['덤벨 들기', '러닝머신', '스트레칭', '스쿼트'],
  color: '#a99fd0',
  background: {
    size: 8,
    sky: ['#e9e6f5', '#eeebf6', '#f3f0f7', '#f7f5f9'],
    ground: ['#e8e4f0', '#ddd8e8'],
    side: ['#b8b0cc', '#a69dbd'],
    // tall mirror panes
    walls: { left: '#f3f1f8', right: '#e6e2f0', trim: '#a99fd0', glass: ['#dff3ff', '#eef9ff'] },
    rugs: [{ from: { tx: 3.6, ty: 4.0 }, to: { tx: 6.0, ty: 1.6 }, width: 1.6, color: '#d3cdea', border: '#b3abd3' }],
  },
  spawnPosition: { tx: 6.0, ty: 6.0 },
  availableActions: ['dumbbell', 'treadmill', 'stretch', 'squat', 'wave'],
  interactionObjects: [
    treadmill('treadmill-1', { tx: 0.6, ty: 2.0 }),
    treadmill('treadmill-2', { tx: 0.6, ty: 3.9 }),
    {
      id: 'rack', kind: 'rack', label: '덤벨 랙', icon: '🏋️', at: { tx: 2.6, ty: 0.55 },
      actions: ['dumbbell'],
      spots: [{ tx: 3.0, ty: 1.15 }, { tx: 3.6, ty: 0.55 }],
    },
    mat('mat-1', { tx: 4.2, ty: 3.4 }),
    mat('mat-2', { tx: 5.4, ty: 2.2 }),
  ],
  decorations: [
    { kind: 'plant', at: { tx: 0.5, ty: 6.8 } },
    { kind: 'plant', at: { tx: 7.3, ty: 0.6 } },
  ],
  recommendedOutfits: [
    { name: '💪 트레이닝룩', look: { top: 'tee', topColor: '#a9cdfc', bottom: 'shorts', bottomColor: '#5c6185', hat: 'cap' } },
    { name: '🧘 요가룩', look: { top: 'tee', topColor: '#cbb8ff', bottom: 'pants', bottomColor: '#ffb3c6', hat: 'none' } },
  ],
};
