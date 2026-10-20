import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Tone, toneInk } from '../../theme/tokens';

interface Props {
  /** 0..1 (clamped). */
  value: number;
  tone?: Tone;
  height?: number;
}

export default function ProgressBar({ value, tone = 'info', height = 8 }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, { toValue: clamped, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [clamped, width]);

  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.ringTrack, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height,
          borderRadius: height,
          backgroundColor: tone === 'info' ? colors.brand : toneInk(colors, tone),
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
