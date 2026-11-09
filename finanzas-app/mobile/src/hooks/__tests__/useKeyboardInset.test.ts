import { keyboardOverlap } from '../useKeyboardInset';

describe('keyboardOverlap', () => {
  it('is zero while the keyboard is below the container, even with a tab bar under it', () => {
    expect(keyboardOverlap(717, 800)).toBe(0);
  });

  it('is the part of the container the keyboard covers', () => {
    expect(keyboardOverlap(717, 500)).toBe(217);
  });
});
