import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/** How far the keyboard covers a view whose bottom edge sits at `containerBottom` (window coordinates). */
export const keyboardOverlap = (containerBottom: number, keyboardTop: number): number =>
  Math.max(0, containerBottom - keyboardTop);

/**
 * Replaces KeyboardAvoidingView on screens inside the tab navigator: it derives the keyboard
 * overlap from the view's frame, which is wrong with a header and a tab bar, and left a gap
 * under the form and pushed the top of the screen out of view. This measures the container's real
 * bottom edge, so the tab bar the keyboard covers is accounted for. Android resizes the window itself.
 * Put `ref` on a stable outer View and apply `inset` as paddingBottom on the View inside it.
 */
export function useKeyboardInset() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      ref.current?.measureInWindow((_x: number, y: number, _w: number, height: number) => setInset(keyboardOverlap(y + height, keyboardTop)));
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setInset(0));
    return () => {
      change.remove();
      hide.remove();
    };
  }, []);

  return { ref, inset };
}
