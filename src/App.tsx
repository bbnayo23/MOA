import { useAccount } from './hooks/useAccount';
import { useMoa } from './store';
import { CreateScreen } from './ui/CreateScreen';
import { OfflineScreen } from './ui/OfflineScreen';
import { TakenScreen } from './ui/Social';
import { WorldScreen } from './ui/WorldScreen';

export default function App() {
  const screen = useMoa((s) => s.screen);
  const taken = useMoa((s) => s.taken);
  const account = useAccount();
  if (account.status === 'loading') return null;
  if (account.status === 'out') return <OfflineScreen why={account.why} />;
  return screen === 'create' ? <CreateScreen /> : taken ? <TakenScreen /> : <WorldScreen />;
}
