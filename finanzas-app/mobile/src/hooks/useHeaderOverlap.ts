import { ComponentRef, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';

/** How much of a view starting at `containerTop` (window coordinates) sits under a header of `headerHeight`. */
export const headerOverlap = (headerHeight: number, containerTop: number): number =>
  Math.max(0, headerHeight - containerTop);

/**
 * Screens whose first child is not a ScrollView are laid out from the top of the window, behind the
 * native stack header (iOS only auto-adjusts scroll views). This measures where the container really
 * starts and returns the padding that pushes its content below the header; it is 0 when the content
 * already starts under it. Put `ref` and `onLayout` on the screen's root View and apply `paddingTop`.
 */
export function useHeaderOverlap() {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [paddingTop, setPaddingTop] = useState(0);

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x: number, y: number) => setPaddingTop(headerOverlap(headerHeight, y)));
  }, [headerHeight]);

  return { ref, onLayout, paddingTop };
}
