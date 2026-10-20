import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useThemedStyles } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Left accent bar colour (e.g. status). */
  accent?: string;
  padded?: boolean;
}

const createStyles = (c: ThemeColors, isDark: boolean) => ({
  card: {
    backgroundColor: c.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.35 : 0.06,
    shadowRadius: isDark ? 10 : 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: isDark ? 3 : 2,
    overflow: 'hidden' as const,
  },
  padded: { padding: 16 },
  accent: { position: 'absolute' as const, left: 0, top: 0, bottom: 0, width: 4 },
});

export default function Card({ children, onPress, style, accent, padded = true }: Props) {
  const styles = useThemedStyles(createStyles);
  const body = (
    <>
      {accent ? <View style={[styles.accent, { backgroundColor: accent }]} /> : null}
      {children}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, padded && styles.padded, pressed && { opacity: 0.85 }, style]}>
        {body}
      </Pressable>
    );
  }
  return <View style={[styles.card, padded && styles.padded, style]}>{body}</View>;
}
