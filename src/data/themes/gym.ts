import type { Tile } from '../../world/space';
import { fine } from './grid';
import type { InteractionObject, ThemeConfig } from './types';

/** You stand on the belt, just in front of the console. */
const treadmill = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'treadmill', label: '러닝머신', icon: '🏃', at,
  actions: ['treadmill'],
  spots: [{ tx: at.tx + 0.1, ty: at.ty + 0.1 }],
});

const mat = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'mat', label: '요가 매트', icon: '🧘', at,
  actions: ['stretch', 'squat', 'squatGame', 'rhythmGame'],
  spots: [{ tx: at.tx + 0.05, ty: at.ty + 0.05 }],
});

export const gym: ThemeConfig = {
  themeId: 'gym',
  name: '헬스장',
  emoji: '🏋️',
  tagline: '같이 하면 덜 힘들어',
  activities: ['덤벨 들기', '러닝머신', '스트레칭', '스쿼트', '스쿼트 타이밍 챌린지', '리듬 운동'],
  color: '#a99fd0',
  background: {
    size: 8,
    sky: ['#e9e6f5', '#eeebf6', '#f3f0f7', '#f7f5f9'],
    ground: ['#e1dcef', '#cdc5e3'],
    side: ['#b8b0cc', '#a69dbd'],
    // tall mirror panes
    walls: { left: '#eeecf7', right: '#dfdbef', trim: '#8f84c4', glass: ['#dff3ff', '#eef9ff'] },
    rugs: [
      { from: { tx: 3.6, ty: 4.0 }, to: { tx: 6.0, ty: 1.6 }, width: 1.6, color: '#d3cdea', border: '#b3abd3' },
      // rubber flooring under the free weights
      { from: { tx: 2.4, ty: 1.4 }, to: { tx: 6.8, ty: 1.4 }, width: 1.2, color: '#cbc4e0', border: '#b3abd3' },
    ],
  },
  spawnPosition: { tx: fine(10.8), ty: fine(11.4) }, // in the middle of it all
  availableActions: ['dumbbell', 'treadmill', 'stretch', 'squat', 'squatGame', 'rhythmGame', 'wave', 'jump'],
  interactionObjects: [
    treadmill('treadmill-1', { tx: 0.6, ty: 2.0 }),
    treadmill('treadmill-2', { tx: 0.6, ty: 3.9 }),
    treadmill('treadmill-3', { tx: 0.6, ty: 5.8 }),
    {
      id: 'rack', kind: 'rack', label: '덤벨 랙', icon: '🏋️', at: { tx: 2.6, ty: 0.55 },
      actions: ['dumbbell'],
      spots: [{ tx: 3.0, ty: 1.15 }, { tx: 3.6, ty: 0.55 }],
    },
    {
      id: 'rack-2', kind: 'rack', label: '덤벨 랙', icon: '🏋️', at: { tx: 4.8, ty: 0.55 },
      actions: ['dumbbell'],
      spots: [{ tx: 5.2, ty: 1.15 }, { tx: 5.8, ty: 0.55 }],
    },
    mat('mat-1', { tx: 4.2, ty: 3.4 }),
    mat('mat-2', { tx: 5.4, ty: 2.2 }),
    mat('mat-3', { tx: 6.4, ty: 3.8 }),
    mat('mat-4', { tx: 3.8, ty: 6.4 }),
  ],
  decorations: [
    { kind: 'plant', at: { tx: 0.5, ty: 6.8 } },
    { kind: 'plant', at: { tx: 7.3, ty: 0.6 } },
    { kind: 'plant', at: { tx: 7.4, ty: 5.4 } },
    { kind: 'plant', at: { tx: 5.4, ty: 7.4 } },
    ...[2.4, 3.5, 4.6].map((ty) => ({ kind: 'bike' as const, at: { tx: 1.9, ty } })),
    { kind: 'weightBench', at: { tx: 3.7, ty: 1.45 } },
    { kind: 'weightBench', at: { tx: 6.4, ty: 1.45 } },
    { kind: 'gymBalls', at: { tx: 7.0, ty: 5.4 } },
    { kind: 'weightBench', at: { tx: 5.0, ty: 7.0 } },
    { kind: 'cooler', at: { tx: 7.4, ty: 6.5 } },
    { kind: 'cooler', at: { tx: 6.6, ty: 0.45 } },
    { kind: 'frame', at: { tx: 0.12, ty: 2.9 }, color: '#9fe3c4' },
    { kind: 'frame', at: { tx: 0.12, ty: 5.1 }, color: '#ffd38a' },
    { kind: 'frame', at: { tx: fine(7.6), ty: 0.12 }, color: '#ffb3c6' },
    // free weights at the front left: a squat rack, kettlebells, plyo boxes
    { kind: 'powerRack', at: { tx: fine(4.8), ty: fine(10.2) } },
    { kind: 'powerRack', at: { tx: fine(7.6), ty: fine(10.2) } },
    { kind: 'weightBench', at: { tx: fine(6.4), ty: fine(12.9) } },
    { kind: 'kettlebells', at: { tx: fine(4.2), ty: fine(13.2) } },
    { kind: 'rack', at: { tx: fine(9.0), ty: fine(14.4) } },
    { kind: 'plyoBoxes', at: { tx: fine(2.4), ty: fine(15.0) } },
    // the stretching corner by the mats
    { kind: 'kettlebells', at: { tx: fine(10.0), ty: fine(9.4) } },
    { kind: 'mat', at: { tx: fine(10.2), ty: fine(5.2) } },
    { kind: 'mat', at: { tx: fine(12.6), ty: fine(10.4) } },
    { kind: 'gymBalls', at: { tx: fine(13.0), ty: fine(13.4) } },
    { kind: 'plyoBoxes', at: { tx: fine(15.0), ty: fine(12.6) } },
    // a full row of machines along the left wall (the ones above are for using)
    ...[5.45, 10.07].map((ty) => ({ kind: 'treadmill' as const, at: { tx: 0.6, ty: fine(ty) } })),
    { kind: 'bike', at: { tx: 1.9, ty: fine(12.1) } },
    // punching bags along the right, lockers by the back wall
    { kind: 'punchBag', at: { tx: fine(15.3), ty: fine(5.4) } },
    { kind: 'punchBag', at: { tx: fine(15.3), ty: fine(8.9) }, color: '#7fb7e8' },
    { kind: 'lockers', at: { tx: fine(2.0), ty: 0.35 } },
  ],
  recommendedOutfits: [
    { name: '💪 트레이닝룩', look: { top: 'tee', topColor: '#a9cdfc', bottom: 'shorts', bottomColor: '#5c6185', hat: 'cap' } },
    { name: '🧘 요가룩', look: { top: 'tee', topColor: '#cbb8ff', bottom: 'pants', bottomColor: '#ffb3c6', hat: 'none' } },
  ],
};
