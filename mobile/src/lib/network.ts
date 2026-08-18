import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Backs every "You're offline" message in the app (section 8/17/23) and
// the auto-sync-on-reconnect behavior (see app/(app)/audit/[id].tsx).
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
}
