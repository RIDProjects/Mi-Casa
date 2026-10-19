import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
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
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={close} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, loading && styles.disabled]}
              onPress={confirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.deleteText}>Eliminar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  body: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
  },
  error: { color: Colors.red, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.red,
  },
  deleteText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
