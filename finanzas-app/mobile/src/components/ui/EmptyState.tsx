import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import Button from './Button';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const createStyles = (c: ThemeColors) => ({
  wrap: { alignItems: 'center' as const, justifyContent: 'center' as const, padding: 32, gap: 8 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.infoTint, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 6 },
  title: { fontFamily: fonts.title, fontSize: 17, color: c.onSurface, textAlign: 'center' as const },
  subtitle: { fontFamily: fonts.regular, fontSize: 13.5, color: c.onSurfaceVariant, textAlign: 'center' as const, lineHeight: 20 },
});

export default function EmptyState({ icon = 'document-text-outline', title, subtitle, actionLabel, onAction }: Props) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.infoInk} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} small variant="secondary" style={{ marginTop: 10 }} /> : null}
    </View>
  );
}
