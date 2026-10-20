import React from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../../theme/ThemeContext';
import { fonts } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: React.ReactNode;
}

const createStyles = (c: ThemeColors) => ({
  row: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, justifyContent: 'space-between' as const, gap: 12 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurfaceVariant },
  title: { fontFamily: fonts.title, fontSize: 28, color: c.onSurface, letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13.5, color: c.onSurfaceVariant, marginTop: 2 },
});

export default function PageHeader({ title, subtitle, eyebrow, right }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
