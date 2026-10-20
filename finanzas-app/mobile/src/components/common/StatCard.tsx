import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, Tone, toneInk, toneTint } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  subtitle?: string;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { flex: 1, padding: 12, gap: 4 },
    iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    title: { fontFamily: fonts.semibold, fontSize: 10.5, color: c.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6 },
    value: { fontFamily: fonts.title, fontSize: 18, letterSpacing: -0.4 },
    subtitle: { fontFamily: fonts.regular, fontSize: 11, color: c.outline },
  });

/** Dashboard stat tile: tone-tinted icon, label and a single-line amount that shrinks to fit. */
export function StatCard({ title, value, icon, tone = 'info', subtitle }: StatCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const ink = toneInk(colors, tone);
  return (
    <Card style={styles.card} padded={false}>
      <View style={styles.iconWrap}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 10, backgroundColor: toneTint(colors, tone) }]} />
        <Ionicons name={icon} size={18} color={ink} />
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={[styles.value, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </Card>
  );
}
