import { useAccount } from './hooks/useAccount';
import { useMoa } from './store';
import { CreateScreen } from './ui/CreateScreen';
import { LoginScreen } from './ui/LoginScreen';
import { WorldScreen } from './ui/WorldScreen';
import { ThumbStudio } from './world/Preview';

export default function App() {
  const screen = useMoa((s) => s.screen);
  const account = useAccount();
  if (account === 'loading') return null;
  if (account === 'out') return <LoginScreen />;
  return (
    <>
      {screen === 'create' ? <CreateScreen /> : <WorldScreen />}
      <ThumbStudio />
    </>
  );
}
