import React, { useContext } from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';
import LedgerBackground from './LedgerBackground';
import { TabBarContext } from '../../navigation/TabBarContext';
import { useHeaderOverlap } from '../../hooks/useHeaderOverlap';

type Edge = 'top' | 'bottom' | 'left' | 'right';

/** The tab bar already covers the bottom safe area, so a screen above it must not reserve it again. */
export const effectiveEdges = (edges: Edge[], underTabBar: boolean): Edge[] =>
  underTabBar ? edges.filter((edge) => edge !== 'bottom') : edges;

interface Props {
  children: React.ReactNode;
  /** false for screens that manage their own list (FlatList). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Safe-area edges to respect; tabs screens pass ['top'] by default. */
  edges?: Edge[];
  /** Defaults to whether the screen is inside the tab navigator; modals presented over the tab bar pass false. */
  underTabBar?: boolean;
}

/** Themed screen shell: ledger background, safe area, status bar and optional pull-to-refresh scroll. */
export default function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle, edges = ['top'], underTabBar }: Props) {
  const { colors, isDark } = useTheme();
  const inTabs = useContext(TabBarContext);
  const header = useHeaderOverlap();

  return (
    <View
      ref={header.ref}
      onLayout={header.onLayout}
      style={[styles.flex, { backgroundColor: colors.surface, paddingTop: header.paddingTop }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LedgerBackground />
      <SafeAreaView style={styles.flex} edges={effectiveEdges(edges, underTabBar ?? inTabs)}>
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
