import { useIsFocused } from '@react-navigation/native';

export const POLL_INTERVAL_MS = 10000;

/**
 * refetchInterval for a screen's queries: polls only while the screen is focused.
 * Bottom tabs keep every visited tab mounted, so a global refetchInterval would keep
 * all of them polling in the background. Pull-to-refresh and refetch on focus cover the rest.
 */
export function useScreenPolling(): number | false {
  return useIsFocused() ? POLL_INTERVAL_MS : false;
}
