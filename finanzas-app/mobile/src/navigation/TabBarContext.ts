import { createContext } from 'react';

/**
 * True for everything rendered inside the bottom tab navigator. The tab bar sits under those screens
 * and already covers the bottom safe area, so they must not reserve it again (that left a gap above it).
 */
export const TabBarContext = createContext(false);
