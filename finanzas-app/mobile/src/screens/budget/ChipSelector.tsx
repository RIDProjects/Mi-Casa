import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { fontFamily: fonts.semibold, fontSize: 12, color: c.onSurfaceVariant, marginBottom: 8, letterSpacing: 0.3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceContainer,
    },
    chipText: { fontFamily: fonts.semibold, color: c.onSurfaceVariant, fontSize: 13 },
  });

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  /** A single value for single choice, or a list for toggles. */
  value: T | T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Chip row, same look as the currency chips of AddHouseholdExpenseScreen; toggles when `value` is a list. */
export default function ChipSelector<T extends string>({ label, options, value, onChange, disabled }: Props<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = Array.isArray(value) ? value.includes(opt.value) : opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={disabled}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, active && { backgroundColor: colors.infoTint, borderColor: colors.brand }]}
            >
              <Text style={[styles.chipText, active && { color: colors.primary }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
