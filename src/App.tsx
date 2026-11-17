import { useEffect } from 'react';
import { useAccount } from './hooks/useAccount';
import { useMoa } from './store';
import { CreateScreen } from './ui/CreateScreen';
import { OfflineScreen } from './ui/OfflineScreen';
import { TakenScreen } from './ui/Social';
import { hideSplash } from './ui/splash';
import { WorldScreen } from './ui/WorldScreen';

export default function App() {
  const screen = useMoa((s) => s.screen);
  const taken = useMoa((s) => s.taken);
  const account = useAccount();
  const world = account.status === 'in' && screen !== 'create' && !taken;
  // the loading screen stays up while the account loads; the world lifts it once it's drawn (see World)
  useEffect(() => {
    if (account.status !== 'loading' && !world) hideSplash();
  }, [account.status, world]);
  if (account.status === 'loading') return null;
  if (account.status === 'out') return <OfflineScreen why={account.why} />;
  return screen === 'create' ? <CreateScreen /> : taken ? <TakenScreen /> : <WorldScreen />;
}
