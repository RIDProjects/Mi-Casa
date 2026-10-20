import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const STEP = 32;

/**
 * "Libro contable" backdrop: a faint ledger grid, a brand glow top-right and
 * budget rings bottom-right (same layers as the web Layout). Pure Views, no SVG,
 * so it ships over the air. Never intercepts touches.
 */
export default function LedgerBackground() {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const cols = Math.ceil(width / STEP);
  const rows = Math.ceil(height / STEP);
  const lines = useMemo(
    () => [
      ...Array.from({ length: cols }, (_, i) => ({ key: `v${i}`, style: { left: i * STEP, top: 0, bottom: 0, width: StyleSheet.hairlineWidth } })),
      ...Array.from({ length: rows }, (_, i) => ({ key: `h${i}`, style: { top: i * STEP, left: 0, right: 0, height: StyleSheet.hairlineWidth } })),
    ],
    [cols, rows],
  );

  const ringAlpha = isDark ? 0.5 : 0.35;
  const ring = (size: number, color: string, thickness: number, offset: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: thickness,
    borderColor: color,
    right: -size / 2 + offset,
    bottom: -size / 2 + offset,
    opacity: ringAlpha,
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]}>
      <View style={{ position: 'absolute', top: -180, right: -140, width: 420, height: 420, borderRadius: 210, backgroundColor: colors.glow, opacity: 0.55 }} />
      {lines.map((l) => (
        <View key={l.key} style={[{ position: 'absolute', backgroundColor: colors.grid }, l.style]} />
      ))}
      <View style={ring(300, colors.okInk, 22, 40)} />
      <View style={ring(210, colors.dangerInk, 18, 20)} />
      <View style={ring(130, colors.infoInk, 14, 0)} />
    </View>
  );
}
