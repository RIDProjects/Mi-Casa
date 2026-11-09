import { ComponentRef, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';

/** How much of a view starting `containerTop` below the top of its screen sits under a header of `headerHeight`. */
export const headerOverlap = (headerHeight: number, containerTop: number): number =>
  Math.max(0, headerHeight - containerTop);

/**
 * Content is laid out from the top of its screen, behind the native stack header: iOS only adjusts a
 * scroll view that is the screen's first child, and not at all in modal sheets. This measures where the
 * container starts inside its screen (not in the window, so sheets that sit below the top work too) and
 * returns the padding that pushes it below the header; it is 0 when the content already starts under it.
 * Put `ref` and `onLayout` on the screen's root View and apply `paddingTop`.
 */
export function useHeaderOverlap() {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [paddingTop, setPaddingTop] = useState(0);

  const onLayout = useCallback(() => {
    ref.current?.measure((_x: number, y: number) => setPaddingTop(headerOverlap(headerHeight, y)));
  }, [headerHeight]);

  return { ref, onLayout, paddingTop };
}
