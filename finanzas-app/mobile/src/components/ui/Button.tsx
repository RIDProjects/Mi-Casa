import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useTheme } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

const createStyles = (c: ThemeColors) => ({
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    minHeight: 48,
  },
  small: { minHeight: 38, paddingHorizontal: 14 },
  primary: { backgroundColor: c.brand },
  secondary: { backgroundColor: c.surfaceContainer, borderWidth: 1, borderColor: c.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: c.dangerTint, borderWidth: 1, borderColor: c.dangerInk },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
  labelSmall: { fontSize: 13 },
});

export default function Button({ label, onPress, variant = 'primary', icon, loading, disabled, small, style }: Props) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const ink = variant === 'primary' ? colors.onBrand : variant === 'danger' ? colors.dangerInk : variant === 'ghost' ? colors.primary : colors.onSurface;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.base, styles[variant], small && styles.small, inactive && styles.disabled, pressed && { opacity: 0.8 }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ink} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={ink} /> : null}
          <Text style={[styles.label, small && styles.labelSmall, { color: ink }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
