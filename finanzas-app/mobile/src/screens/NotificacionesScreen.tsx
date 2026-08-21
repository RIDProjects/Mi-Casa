import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../theme/colors';
import { notificationsService } from '../services/notifications.service';
import { AppNotification } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: AppNotification;
  onMarkRead: (id: string) => void;
}) {
  const title = item.title || 'Notificación';
  const body = item.body || item.message;

  return (
    <TouchableOpacity
      style={[styles.row, !item.isRead && styles.rowUnread]}
      activeOpacity={0.8}
      onPress={() => !item.isRead && onMarkRead(item.id)}
      disabled={item.isRead}
    >
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowBody} numberOfLines={2}>{body}</Text>
        <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
      </View>
      {!item.isRead && (
        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificacionesScreen() {
  const qc = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isRefetching,
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
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: invalidate,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return <LoadingSpinner message="Cargando notificaciones..." />;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="light" />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow item={item} onMarkRead={(id) => markReadMut.mutate(id)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
        ListHeaderComponent={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.isPending}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={Colors.blue} />
              <Text style={styles.markAllText}>
                Marcar todas como leídas ({unreadCount})
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="Sin notificaciones"
            subtitle="Acá vas a ver los avisos del hogar"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 32, gap: 8 },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blueBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.blue,
    paddingVertical: 12,
    marginBottom: 8,
  },
  markAllText: { color: Colors.blue, fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  rowUnread: {
    borderColor: Colors.blue + '60',
    backgroundColor: Colors.blueBg,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.blue,
    marginTop: 6,
  },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  rowBody: { color: Colors.textSecondary, fontSize: 13 },
  rowDate: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});
