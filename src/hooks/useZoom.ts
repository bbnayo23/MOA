import { useEffect, useState } from 'react';
import { fromGame, toGame } from '../bridge';

/** The camera's zoom buttons and the level they show. */
export function useZoom() {
  const [level, setLevel] = useState({ pct: 100, min: 50 });
  useEffect(() => fromGame.on('zoomLevel', setLevel), []);
  return {
    ...level,
    zoomIn: () => toGame.emit('zoom', 'in'),
    zoomOut: () => toGame.emit('zoom', 'out'),
    reset: () => toGame.emit('zoom', 'reset'),
  };
}
