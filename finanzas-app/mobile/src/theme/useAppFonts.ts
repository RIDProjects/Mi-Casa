import { useEffect, useState } from 'react';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { WorkSans_600SemiBold, WorkSans_700Bold } from '@expo-google-fonts/work-sans';

// If the fonts neither load nor fail within this time (slow or stalled asset download),
// start the app anyway with the system font instead of leaving a blank screen.
export const FONT_LOAD_TIMEOUT_MS = 4000;

/**
 * Loads the Pro-Ledger fonts. Returns true once the app can render: fonts loaded,
 * loading failed, or the timeout elapsed. Never blocks the app forever.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return loaded || !!error || timedOut;
}
