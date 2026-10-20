import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useThemedStyles } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const createStyles = (c: ThemeColors) => ({
  bar: { backgroundColor: c.panel, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingVertical: 10 },
});

/**
 * Primary action pinned under a list. Replaces the floating button, which sat on top of
 * the amounts at the right edge of the rows while scrolling.
 */
export default function ActionBar({ label, onPress, icon = 'add' }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.bar}>
      <Button label={label} icon={icon} onPress={onPress} />
    </View>
  );
}
