import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';
import { AppNotification } from '../types';
import { useManualRefresh } from '../hooks/useManualRefresh';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Card, EmptyState, ErrorState, Reveal, Screen, Skeleton } from '../components/ui';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, paddingBottom: 32, gap: 10 },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.infoTint,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.brand,
      paddingVertical: 12,
      marginBottom: 6,
    },
    markAllText: { fontFamily: fonts.semibold, color: c.primary, fontSize: 13 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
    rowUnread: { backgroundColor: c.infoTint },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand, marginTop: 6 },
    rowContent: { flex: 1, gap: 3 },
    rowTitle: { fontFamily: fonts.bold, color: c.onSurface, fontSize: 14 },
    rowTitleRead: { fontFamily: fonts.semibold, color: c.onSurfaceVariant },
    rowBody: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13 },
    rowDate: { fontFamily: fonts.regular, color: c.outline, fontSize: 11, marginTop: 2 },
  });

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: AppNotification;
  onMarkRead: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const title = item.title || 'Notificación';
  const body = item.body || item.message;

  return (
    <Card padded={false} accent={item.isRead ? undefined : colors.brand}>
      <TouchableOpacity
        style={[styles.row, !item.isRead && styles.rowUnread]}
        activeOpacity={0.8}
        onPress={() => !item.isRead && onMarkRead(item.id)}
        disabled={item.isRead}
        accessibilityLabel={item.isRead ? title : `Marcar como leída: ${title}`}
      >
        {!item.isRead && <View style={styles.unreadDot} />}
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, item.isRead && styles.rowTitleRead]} numberOfLines={1}>{title}</Text>
          <Text style={styles.rowBody} numberOfLines={2}>{body}</Text>
          <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
        </View>
        {!item.isRead && (
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.outline} />
        )}
      </TouchableOpacity>
    </Card>
  );
}

function SkeletonBlocks() {
  return (
    <View testID="notificaciones-skeleton" style={{ gap: 10 }}>
      <Skeleton height={44} radius={radius.md} />
      <Skeleton height={84} radius={radius.lg} />
      <Skeleton height={84} radius={radius.lg} />
      <Skeleton height={84} radius={radius.lg} />
    </View>
  );
}

export default function NotificacionesScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const qc = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getAll,
    staleTime: 0,
    retry: 1,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'No se pudo marcar como leída'),
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'No se pudieron marcar todas como leídas'),
  });

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonBlocks />
      </Screen>
    );
  }

  if (isError && notifications.length === 0) {
    return (
      <Screen edges={['bottom']} refreshing={refreshing} onRefresh={onRefresh}>
        <Card>
          <ErrorState
            message="No se pudieron cargar las notificaciones. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </Card>
      </Screen>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Screen scroll={false} edges={['bottom']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Reveal index={Math.min(index, 7)}>
            <NotificationRow item={item} onMarkRead={(id) => markReadMut.mutate(id)} />
          </Reveal>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListHeaderComponent={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.isPending}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
              <Text style={styles.markAllText}>
                Marcar todas como leídas ({unreadCount})
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="notifications-outline"
              title="Sin notificaciones"
              subtitle="Acá vas a ver los avisos del hogar"
            />
          </Card>
        }
      />
    </Screen>
  );
}
