import { effectiveEdges } from '../Screen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

describe('effectiveEdges', () => {
  it('drops the bottom edge under a tab bar, which already covers the bottom safe area', () => {
    expect(effectiveEdges(['bottom'], true)).toEqual([]);
    expect(effectiveEdges(['top', 'bottom'], true)).toEqual(['top']);
  });

  it('keeps every requested edge when no tab bar is below the screen (modals, root stack)', () => {
    expect(effectiveEdges(['bottom'], false)).toEqual(['bottom']);
    expect(effectiveEdges(['top'], false)).toEqual(['top']);
  });

  it('leaves screens that do not ask for the bottom edge untouched', () => {
    expect(effectiveEdges(['top'], true)).toEqual(['top']);
    expect(effectiveEdges([], true)).toEqual([]);
  });
});
