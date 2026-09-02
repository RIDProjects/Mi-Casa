import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const APP_VERSION = '1.0.0';

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  color?: string;
}

function InfoRow({ icon, label, value, color = Colors.textSecondary }: RowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        {value ? <Text style={rowStyles.value} numberOfLines={1}>{value}</Text> : null}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 1,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que querés cerrar sesión?',
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
              Alert.alert('Error', 'No se pudo cerrar sesión. Intentá de nuevo.');
            }
          },
        },
      ],
    );
  };

  const initials = getInitials(user?.name);
  const roleName = user?.roles?.[0]?.name;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Perfil</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          {roleName && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleName}</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información de cuenta</Text>
          <InfoRow
            icon="person-outline"
            label="Nombre"
            value={user?.name}
            color={Colors.blue}
          />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={user?.email}
            color={Colors.blue}
          />
          {user?.id && (
            <InfoRow
              icon="key-outline"
              label="ID de usuario"
              value={`#${user.id}`}
              color={Colors.textMuted}
            />
          )}
        </View>

        {/* App info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acerca de la app</Text>
          <InfoRow
            icon="phone-portrait-outline"
            label="Aplicación"
            value="Mi Casa Pro — Mobile"
            color={Colors.blue}
          />
          <InfoRow
            icon="git-branch-outline"
            label="Versión"
            value={APP_VERSION}
            color={Colors.textSecondary}
          />
          <InfoRow
            icon="server-outline"
            label="Plataforma"
            value="Android"
            color={Colors.textSecondary}
          />
        </View>

        {/* Legal */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PrivacyPolicy')}
          activeOpacity={0.85}
        >
          <View style={styles.linkRow}>
            <View style={[rowStyles.iconWrap, { backgroundColor: Colors.blue + '20' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.blue} />
            </View>
            <Text style={styles.linkLabel}>Política de Privacidad</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.85}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={Colors.white} />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionFooter}>Mi Casa Pro v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48, gap: 20 },
  header: {
    marginBottom: 4,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 3,
    borderColor: Colors.blue + '50',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  roleBadge: {
    backgroundColor: Colors.blueBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.blue + '40',
    marginTop: 4,
  },
  roleText: {
    color: Colors.blue,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 0,
  },
  cardTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.red,
    borderRadius: 14,
    height: 54,
    marginTop: 4,
  },
  logoutBtnDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  versionFooter: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
