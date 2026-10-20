import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import { useThemedStyles, useTheme } from '../../theme/ThemeContext';
import { fonts, Tone, toneInk, toneTint } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

interface Props {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  subtitle?: string;
  onPress?: () => void;
}

const createStyles = (c: ThemeColors) => ({
  card: { flex: 1 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 4 },
  title: { fontFamily: fonts.semibold, fontSize: 10.5, color: c.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  value: { fontFamily: fonts.title, fontSize: 21, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.regular, fontSize: 11, color: c.outline },
});

export default function StatCard({ title, value, icon, tone = 'info', subtitle, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const ink = toneInk(colors, tone);
  return (
    <Card style={styles.card} padded={false} onPress={onPress}>
      <View style={{ padding: 14, gap: 4 }}>
        <View style={[styles.icon, { backgroundColor: toneTint(colors, tone) }]}>
          <Ionicons name={icon} size={18} color={ink} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={[styles.value, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </Card>
  );
}
