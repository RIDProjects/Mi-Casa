import { useCallback, useState } from 'react';

// React Query's `isRefetching` turns true on ANY refetch, including the
// background polling ticks (refetchInterval). Wiring that straight into a
// RefreshControl makes the pull-to-refresh spinner flash every poll,
// which reads as the screen "jumping" on its own. This hook tracks only
// user-initiated refreshes so the spinner stays tied to an actual pull.
export function useManualRefresh(refetch: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
