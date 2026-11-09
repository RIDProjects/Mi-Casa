import { headerOverlap } from '../useHeaderOverlap';

describe('headerOverlap', () => {
  it('is the part of the content hidden under the header', () => {
    expect(headerOverlap(103, 0)).toBe(103);
    expect(headerOverlap(103, 40)).toBe(63);
  });

  it('is zero when the content already starts below the header', () => {
    expect(headerOverlap(103, 103)).toBe(0);
    expect(headerOverlap(103, 130)).toBe(0);
  });
});
