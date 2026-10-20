import React from 'react';
import { Image, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

const MARK = require('../../../assets/logo-mark.png');

interface Props {
  size?: number;
  variant?: 'full' | 'mark';
}

/** Mi Casa Pro mark (same artwork as the web SVG) plus optional wordmark. */
export default function Logo({ size = 36, variant = 'full' }: Props) {
  const { colors } = useTheme();
  const mark = <Image source={MARK} style={{ width: size, height: size }} accessibilityLabel="Mi Casa Pro" />;
  if (variant === 'mark') return mark;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {mark}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontFamily: fonts.extrabold, fontSize: Math.round(size * 0.5), color: colors.onSurface, letterSpacing: -0.4 }}>
          Mi Casa
        </Text>
        <View style={{ backgroundColor: colors.infoTint, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.infoInk, letterSpacing: 1.2 }}>PRO</Text>
        </View>
      </View>
    </View>
  );
}
