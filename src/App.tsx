import { useMoa } from './store';
import { CreateScreen } from './ui/CreateScreen';
import { WorldScreen } from './ui/WorldScreen';

export default function App() {
  const screen = useMoa((s) => s.screen);
  return screen === 'create' ? <CreateScreen /> : <WorldScreen />;
}
