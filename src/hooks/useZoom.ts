import { useEffect, useState } from 'react';
import { fromGame, toGame } from '../bridge';

/** The camera's zoom buttons and the level they show. */
export function useZoom() {
  const [pct, setPct] = useState(100);
  useEffect(() => fromGame.on('zoomLevel', setPct), []);
  return {
    pct,
    zoomIn: () => toGame.emit('zoom', 'in'),
    zoomOut: () => toGame.emit('zoom', 'out'),
    reset: () => toGame.emit('zoom', 'reset'),
  };
}
