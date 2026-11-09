import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Screen from '../Screen';
import { ThemeProvider } from '../../../theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../../../hooks/useHeaderOverlap', () => ({
  useHeaderOverlap: () => ({ ref: { current: null }, onLayout: jest.fn(), paddingTop: 80 }),
}));

const flatten = (style: any): Record<string, any> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style ?? {};

describe('Screen under a native header', () => {
  it.each([true, false])('pushes the content below the header (scroll=%s)', (scroll) => {
    const { getByText } = render(
      <ThemeProvider>
        <Screen scroll={scroll}>
          <Text>contenido</Text>
        </Screen>
      </ThemeProvider>,
    );
    let node: any = getByText('contenido');
    let padded = false;
    while (node) {
      if (flatten(node.props?.style).paddingTop === 80) padded = true;
      node = node.parent;
    }
    expect(padded).toBe(true);
  });
});
