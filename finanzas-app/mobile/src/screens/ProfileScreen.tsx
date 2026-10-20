import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ThemeMode, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { RootStackParamList } from '../navigation/types';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { Badge, Button, Card, PageHeader, Reveal, Screen } from '../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const APP_VERSION = '1.0.0';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { mode: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    avatarSection: { alignItems: 'center', gap: 6, paddingVertical: 8 },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 3,
      borderColor: c.infoTint,
    },
    avatarText: { fontFamily: fonts.title, color: c.onBrand, fontSize: 28, letterSpacing: -0.5 },
    userName: { fontFamily: fonts.title, color: c.onSurface, fontSize: 22 },
    roleBadge: { alignItems: 'center', marginTop: 4 },
    userEmail: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 14 },
    cardTitle: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: { flex: 1, gap: 1 },
    rowLabel: {
      fontFamily: fonts.semibold,
      color: c.onSurfaceVariant,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    rowValue: { fontFamily: fonts.medium, color: c.onSurface, fontSize: 15 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    linkLabel: { flex: 1, fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.surfaceContainer,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 4,
      gap: 4,
      marginTop: 8,
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 40,
      borderRadius: radius.sm,
    },
    segmentItemActive: { backgroundColor: c.brand },
    segmentLabel: { fontFamily: fonts.semibold, color: c.onSurfaceVariant, fontSize: 13 },
    segmentLabelActive: { color: c.onBrand },
    deleteAccountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.dangerInk,
    },
    deleteAccountText: { fontFamily: fonts.semibold, color: c.dangerInk, fontSize: 15 },
    versionFooter: { fontFamily: fonts.regular, color: c.outline, fontSize: 12, textAlign: 'center', marginTop: 4 },
  });

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  muted?: boolean;
  last?: boolean;
}

function InfoRow({ icon, label, value, muted, last }: RowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const ink = muted ? colors.outline : colors.primary;
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={[styles.iconWrap, { backgroundColor: muted ? colors.surfaceContainer : colors.infoTint }]}>
        <Ionicons name={icon} size={18} color={ink} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch {
              setIsLoggingOut(false);
              Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
            }
          },
        },
      ],
    );
  };

  const initials = getInitials(user?.name);
  const roleName = user?.roles?.[0]?.name;
  // Global admins cannot self-delete (the API refuses it).
  const canDeleteAccount = !user?.roles?.some((r) => r.name === 'admin');

  return (
    <Screen edges={['bottom']}>
      <Reveal index={0}>
        <PageHeader title="Perfil" />
      </Reveal>

      <Reveal index={1}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          {roleName && (
            <View style={styles.roleBadge}>
              <Badge label={roleName.toUpperCase()} tone="info" style={{ alignSelf: 'center' }} />
            </View>
          )}
        </View>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Text style={styles.cardTitle}>Apariencia</Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.mode;
              return (
                <Pressable
                  key={opt.mode}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => setMode(opt.mode)}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={opt.icon} size={16} color={active ? colors.onBrand : colors.onSurfaceVariant} />
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <Text style={styles.cardTitle}>Información de cuenta</Text>
          <InfoRow icon="person-outline" label="Nombre" value={user?.name} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} last={!user?.id} />
          {user?.id && (
            <InfoRow icon="key-outline" label="ID de usuario" value={`#${user.id}`} muted last />
          )}
        </Card>
      </Reveal>

      <Reveal index={4}>
        <Card>
          <Text style={styles.cardTitle}>Acerca de la app</Text>
          <InfoRow icon="phone-portrait-outline" label="Aplicación" value="Mi Casa Pro — Mobile" />
          <InfoRow icon="git-branch-outline" label="Versión" value={APP_VERSION} muted />
          <InfoRow icon="server-outline" label="Plataforma" value="Android" muted last />
        </Card>
      </Reveal>

      <Reveal index={5}>
        <Card onPress={() => navigation.navigate('PrivacyPolicy')}>
          <View style={styles.linkRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.infoTint }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.linkLabel}>Política de Privacidad</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </View>
        </Card>
      </Reveal>

      <Reveal index={6}>
        <Button
          label="Cerrar sesión"
          icon="log-out-outline"
          variant="danger"
          onPress={handleLogout}
          loading={isLoggingOut}
        />
      </Reveal>

      {canDeleteAccount && (
        <Reveal index={7}>
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={() => setShowDeleteAccount(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color={colors.dangerInk} />
            <Text style={styles.deleteAccountText}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </Reveal>
      )}

      <DeleteAccountModal
        visible={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDeleted={logout}
      />

      <Text style={styles.versionFooter}>Mi Casa Pro v{APP_VERSION}</Text>
    </Screen>
  );
}
