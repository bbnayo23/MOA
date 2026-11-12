import { useMoa } from './store';
import { CreateScreen } from './ui/CreateScreen';
import { ThemeScreen } from './ui/ThemeScreen';
import { WorldScreen } from './ui/WorldScreen';

export default function App() {
  const screen = useMoa((s) => s.screen);
  if (screen === 'create') return <CreateScreen />;
  if (screen === 'themes') return <ThemeScreen />;
  return <WorldScreen />;
}
