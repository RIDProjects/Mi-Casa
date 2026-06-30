import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';

interface Props {
  message?: string;
  size?: 'small' | 'large';
}

export default function LoadingSpinner({ message, size = 'large' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.blue} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
});
