import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fonts, Tone, toneInk, toneTint } from '../../theme/tokens';

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: toneTint(colors, tone), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: toneInk(colors, tone) }}>{label}</Text>
    </View>
  );
}
