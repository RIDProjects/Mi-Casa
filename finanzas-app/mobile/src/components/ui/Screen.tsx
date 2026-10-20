import React from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';
import LedgerBackground from './LedgerBackground';

interface Props {
  children: React.ReactNode;
  /** false for screens that manage their own list (FlatList). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Safe-area edges to respect; tabs screens pass ['top'] by default. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Themed screen shell: ledger background, safe area, status bar and optional pull-to-refresh scroll. */
export default function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle, edges = ['top'] }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: colors.surface }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LedgerBackground />
      <SafeAreaView style={styles.flex} edges={edges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
});
