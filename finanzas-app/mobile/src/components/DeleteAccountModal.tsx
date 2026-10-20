import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Button, TextField } from './ui';
import { accountService } from '../services/account.service';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}

function errorMessage(error: any): string {
  const status = error?.response?.status;
  if (status === 401) return 'Contraseña incorrecta.';
  if (status === 429) return 'Demasiados intentos. Espera un minuto e intenta de nuevo.';
  return error?.response?.data?.message || 'No se pudo eliminar la cuenta. Intenta de nuevo.';
}

export default function DeleteAccountModal({ visible, onClose, onDeleted }: Props) {
  const styles = useThemedStyles(createStyles);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (loading) return;
    setPassword('');
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!password) {
      setError('Ingresa tu contraseña para confirmar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await accountService.deleteAccount(password);
      setPassword('');
      await onDeleted();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Eliminar cuenta</Text>
          <Text style={styles.body}>
            Se eliminarán tu cuenta y, si eres el único miembro de tu casa, también todos los datos
            de esa casa (presupuestos, deudas, gastos, metas). Esta acción no se puede deshacer.
          </Text>
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Button label="Cancelar" variant="secondary" onPress={close} disabled={loading} style={styles.action} />
            <Button label="Eliminar" variant="danger" onPress={confirm} loading={loading} style={styles.action} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    sheet: {
      backgroundColor: c.panel,
      borderRadius: radius.xl,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.35 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    title: { fontFamily: fonts.title, color: c.onSurface, fontSize: 18 },
    body: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 14, lineHeight: 20 },
    error: { fontFamily: fonts.medium, color: c.dangerInk, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
    action: { flex: 1 },
  });
