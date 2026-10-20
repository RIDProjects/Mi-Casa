import React, { useState } from 'react';
import { StyleProp, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useTheme } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Adds a show/hide toggle (use with secureTextEntry). */
  passwordToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

const createStyles = (c: ThemeColors) => ({
  label: { fontFamily: fonts.semibold, fontSize: 12, color: c.onSurfaceVariant, marginBottom: 6, letterSpacing: 0.3 },
  field: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: c.surfaceContainer,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
  },
  fieldMultiline: { alignItems: 'flex-start' as const },
  iconMultiline: { marginTop: 15 },
  focused: { borderColor: c.brand, backgroundColor: c.panel },
  invalid: { borderColor: c.dangerInk },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: c.onSurface, paddingVertical: 10 },
  error: { fontFamily: fonts.medium, fontSize: 12, color: c.dangerInk, marginTop: 6 },
});

export default function TextField({ label, error, icon, passwordToggle, containerStyle, secureTextEntry, onFocus, onBlur, ...rest }: Props) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const secure = passwordToggle ? hidden : secureTextEntry;

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, rest.multiline && styles.fieldMultiline, focused && styles.focused, !!error && styles.invalid]}>
        {icon ? (
          <View style={rest.multiline ? styles.iconMultiline : undefined}>
            <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.outline} />
          </View>
        ) : null}
        <TextInput
          {...rest}
          secureTextEntry={secure}
          placeholderTextColor={colors.outline}
          style={styles.input}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
        {passwordToggle ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.outline} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
