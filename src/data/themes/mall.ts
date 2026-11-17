import type { Tile } from '../../world/space';
import type { CharacterLook } from '../character';
import { fine } from './grid';
import type { InteractionObject, ThemeConfig } from './types';

/** Looks you can try on in the fitting room. Each is a partial look laid over yours. */
export const OUTFITS: { name: string; look: Partial<CharacterLook> }[] = [
  { name: '🌸 러블리', look: { top: 'stripe', topColor: '#ffb3c6', bottom: 'skirt', bottomColor: '#fffaf2', hat: 'ribbon', accessory: 'none' } },
  { name: '🖤 시크', look: { top: 'jacket', topColor: '#5c6185', bottom: 'pants', bottomColor: '#5c6185', hat: 'none', accessory: 'glasses' } },
  { name: '🌿 캐주얼', look: { top: 'tee', topColor: '#b5e8c9', bottom: 'shorts', bottomColor: '#a9cdfc', hat: 'cap', accessory: 'none' } },
  { name: '⚾ 스트릿', look: { top: 'hoodie', topColor: '#ffd38a', bottom: 'pants', bottomColor: '#5c6185', hat: 'cap', accessory: 'star' } },
  { name: '❄️ 윈터', look: { top: 'hoodie', topColor: '#fffaf2', bottom: 'pants', bottomColor: '#cbb8ff', hat: 'beanie', accessory: 'scarf' } },
  { name: '🍑 데일리', look: { top: 'tee', topColor: '#ff9a7a', bottom: 'skirt', bottomColor: '#a9cdfc', hat: 'none', accessory: 'none' } },
];

/** Two browsing spots in front of a rack, either side of its centre. */
const rack = (id: string, at: Tile): InteractionObject => ({
  id, kind: 'clothesRack', label: '옷걸이', icon: '👚', at,
  actions: ['browse'],
  spots: [-0.25, 0.25].map((o) => ({ tx: at.tx + 0.55 + o, ty: at.ty + 0.55 - o })),
});

export const mall: ThemeConfig = {
  themeId: 'mall',
  name: '쇼핑몰',
  emoji: '🛍️',
  tagline: '오늘의 코디 쇼핑',
  activities: ['옷 구경', '피팅룸', '의상 변경', '코디 공유', '쉼터 소파', '스타일링 챌린지', '코디 투표'],
  color: '#ff9fc0',
  background: {
    size: 8,
    sky: ['#ffeef5', '#fff1f6', '#fff5f8', '#fff8fa'],
    ground: ['#fcf0f4', '#efd8e7'],
    side: ['#e6c9d9', '#d6b6c8'],
    walls: { left: '#fdf1f6', right: '#f6e2ec', trim: '#ee86ab', glass: ['#ffe0ec', '#e6f5ff'] },
    // the catwalk down the middle
    rugs: [{ from: { tx: 2.6, ty: 2.6 }, to: { tx: 8, ty: 8 }, width: 1.0, color: '#ffd6e0', border: '#ff9fc0' }],
    motes: 0xffe0ec,
  },
  spawnPosition: { tx: 6.6, ty: 6.6 },
  availableActions: ['browse', 'fitting', 'pose', 'stylingGame', 'voteGame', 'sit', 'wave', 'jump', 'dance'],
  interactionObjects: [
    rack('rack-1', { tx: 0.6, ty: 2.0 }),
    rack('rack-2', { tx: 0.6, ty: 4.2 }),
    rack('rack-3', { tx: 0.6, ty: 6.0 }),
    rack('rack-4', { tx: 3.4, ty: 5.0 }),
    rack('rack-5', { tx: 5.0, ty: 3.4 }),
    {
      id: 'sofa', kind: 'sofa', label: '쉼터 소파', icon: '🛋️', at: { tx: 7.2, ty: 3.2 }, color: '#cbb8ff',
      actions: ['sit'],
      spots: [-0.13, 0.13].map((o) => ({ tx: 7.2 + o + 0.04, ty: 3.2 - o + 0.04 })),
    },
    {
      id: 'fitting', kind: 'fittingRoom', label: '피팅룸', icon: '👗', at: { tx: 3.4, ty: 0.6 },
      actions: ['fitting', 'voteGame'],
      spots: [{ tx: 3.95, ty: 1.15 }],
    },
    {
      id: 'mirror', kind: 'mirror', label: '전신 거울', icon: '🪞', at: { tx: 5.6, ty: 0.55 },
      actions: ['pose', 'stylingGame'],
      spots: [{ tx: 6.0, ty: 1.1 }, { tx: 5.5, ty: 1.6 }],
    },
  ],
  decorations: [
    { kind: 'plant', at: { tx: 0.5, ty: 6.8 } },
    { kind: 'plant', at: { tx: 7.4, ty: 0.8 } },
    { kind: 'plant', at: { tx: 1.6, ty: 0.5 } },
    { kind: 'plant', at: { tx: 7.4, ty: 4.4 } },
    { kind: 'plant', at: { tx: 4.4, ty: 7.4 } },
    // dresses on forms along the back wall, tables of folded clothes
    { kind: 'dressForm', at: { tx: 2.2, ty: 0.6 }, color: '#ffb3c6' },
    { kind: 'dressForm', at: { tx: 4.5, ty: 0.55 }, color: '#a9cdfc' },
    { kind: 'dressForm', at: { tx: 6.7, ty: 0.55 }, color: '#ffd38a' },
    { kind: 'displayTable', at: { tx: 2.0, ty: 4.0 } },
    { kind: 'displayTable', at: { tx: 4.0, ty: 2.0 } },
    { kind: 'displayTable', at: { tx: 5.6, ty: 7.2 } },
    { kind: 'displayTable', at: { tx: 7.2, ty: 5.6 } },
    { kind: 'frame', at: { tx: 0.12, ty: 2.9 }, color: '#ff9fc0' },
    { kind: 'frame', at: { tx: 0.12, ty: 5.1 }, color: '#cbb8ff' },
    // the atrium: trees in planters and benches either side of the walkway
    { kind: 'planterTree', at: { tx: fine(6.4), ty: fine(9.2) } },
    { kind: 'planterTree', at: { tx: fine(9.2), ty: fine(6.4) } },
    { kind: 'pew', at: { tx: fine(8.3), ty: fine(11.6) } },
    { kind: 'pew', at: { tx: fine(11.6), ty: fine(8.3) } },
    // more to look at: racks, a shoe shelf, mannequins; the checkout by the way out
    { kind: 'clothesRack', at: { tx: fine(13.0), ty: fine(9.6) } },
    { kind: 'clothesRack', at: { tx: fine(4.0), ty: fine(13.6) } },
    { kind: 'shoeShelf', at: { tx: 0.4, ty: fine(15.0) } },
    { kind: 'shoeShelf', at: { tx: fine(11.0), ty: 0.4 } },
    { kind: 'dressForm', at: { tx: fine(8.2), ty: fine(14.2) }, color: '#9fd8b8' },
    { kind: 'dressForm', at: { tx: fine(14.2), ty: fine(13.4) }, color: '#ffb3c6' },
    { kind: 'cashier', at: { tx: fine(14.8), ty: fine(1.6) }, color: '#ff9fc0' },
    { kind: 'shoppingBags', at: { tx: fine(13.6), ty: fine(7.2) } },
    { kind: 'shoppingBags', at: { tx: fine(5.0), ty: fine(8.8) } },
  ],
  recommendedOutfits: OUTFITS.slice(0, 2),
};
