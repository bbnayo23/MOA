import { useAccount } from './hooks/useAccount';
import { useMoa } from './store';
import { CreateScreen } from './ui/CreateScreen';
import { OfflineScreen } from './ui/OfflineScreen';
import { WorldScreen } from './ui/WorldScreen';
import { ThumbStudio } from './world/Preview';

export default function App() {
  const screen = useMoa((s) => s.screen);
  const account = useAccount();
  if (account.status === 'loading') return null;
  if (account.status === 'out') return <OfflineScreen why={account.why} />;
  return (
    <>
      {screen === 'create' ? <CreateScreen /> : <WorldScreen />}
      <ThumbStudio />
    </>
  );
}
