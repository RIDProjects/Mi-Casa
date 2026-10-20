import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../theme/ThemeContext';
import { fonts } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { Button, Card } from '../../components/ui';

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 },
    card: { gap: 14, maxHeight: '90%' },
    title: { fontFamily: fonts.title, color: c.onSurface, fontSize: 18 },
    subtitle: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 13, marginTop: 2 },
    body: { gap: 14 },
    actions: { flexDirection: 'row', gap: 12 },
    action: { flex: 1 },
  });

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
  /** Optional destructive action shown under the form (edit mode). */
  onDelete?: () => void;
  deleteLabel?: string;
  children: React.ReactNode;
}

/** Small themed dialog shared by the budget forms (category, expense, income). */
export default function FormModal({
  visible,
  title,
  subtitle,
  submitLabel,
  submitting,
  onSubmit,
  onClose,
  onDelete,
  deleteLabel = 'Eliminar',
  children,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.overlay}>
          <Card style={styles.card}>
            <View>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {children}
            </ScrollView>
            <View style={styles.actions}>
              <Button label="Cancelar" variant="secondary" onPress={onClose} disabled={submitting} style={styles.action} />
              <Button label={submitLabel} icon="checkmark-outline" onPress={onSubmit} loading={submitting} style={styles.action} />
            </View>
            {onDelete ? (
              <Button label={deleteLabel} icon="trash-outline" variant="danger" onPress={onDelete} disabled={submitting} />
            ) : null}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
