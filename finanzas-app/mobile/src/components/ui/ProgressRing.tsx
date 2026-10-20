import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  /** 0..1 (clamped). */
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  children?: React.ReactNode;
}

/**
 * Circular progress without SVG (so it ships over the air): two clipped half rings,
 * the right one fills for the first 50 %, the left one for the rest (each is omitted while empty to avoid a stray tick).
 */
export default function ProgressRing({ value, size = 96, thickness = 10, color, children }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.brand;
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  const rightDeg = -135 + Math.min(pct, 50) * 3.6;
  const leftDeg = -135 + Math.max(pct - 50, 0) * 3.6;
  const half = size / 2;
  const circle = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderColor: 'transparent',
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[circle, { borderColor: colors.ringTrack }]} />
      {pct > 0 ? (
        <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
          <View style={[circle, { left: -half, borderTopColor: ink, borderRightColor: ink, transform: [{ rotate: `${rightDeg}deg` }] }]} />
        </View>
      ) : null}
      {pct > 50 ? (
        <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={[circle, { left: 0, borderBottomColor: ink, borderLeftColor: ink, transform: [{ rotate: `${leftDeg}deg` }] }]} />
        </View>
      ) : null}
      {children}
    </View>
  );
}
