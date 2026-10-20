import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { Button, Card, LedgerBackground, Logo, Reveal, TextField } from '../../components/ui';

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.surface },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 48,
      gap: 28,
    },
    logoArea: { alignItems: 'center', gap: 10 },
    tagline: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 14 },
    card: { padding: 24, gap: 16 },
    cardTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 20, marginBottom: 4 },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.dangerTint,
      borderWidth: 1,
      borderColor: c.dangerInk,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    errorText: { fontFamily: fonts.medium, color: c.dangerInk, fontSize: 13, flex: 1 },
    hint: { fontFamily: fonts.regular, color: c.outline, fontSize: 12, textAlign: 'center' },
  });

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu email y contraseña.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      const raw = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      let msg: string;
      if (!raw) {
        msg = 'Error al iniciar sesión. Verifica tus credenciales.';
      } else if (Array.isArray(raw)) {
        msg = raw.join(', ');
      } else if (typeof raw === 'string') {
        msg = raw;
      } else {
        msg = 'Credenciales incorrectas.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LedgerBackground />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Reveal index={0}>
          <View style={styles.logoArea}>
            <Logo size={56} />
            <Text style={styles.tagline}>Gestión financiera del hogar</Text>
          </View>
        </Reveal>

        <Reveal index={1}>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.dangerInk} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextField
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
            />

            <TextField
              label="Contraseña"
              icon="lock-closed-outline"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="••••••••"
              passwordToggle
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />

            <Button label="Ingresar" onPress={handleLogin} loading={isLoading} />

            <Text style={styles.hint}>
              El registro de cuentas nuevas se realiza desde la app web.
            </Text>
          </Card>
        </Reveal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
