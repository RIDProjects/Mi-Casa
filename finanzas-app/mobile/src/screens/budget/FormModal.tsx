import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../theme/ThemeContext';
import { fonts } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { Button, Card } from '../../components/ui';

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 16 },
    card: { gap: 14, maxHeight: '100%' },
    scroll: { flexShrink: 1 },
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
  /** Neutral styling for non-destructive actions in the delete slot (e.g. restoring defaults). */
  deleteTone?: 'danger' | 'neutral';
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
  deleteTone = 'danger',
  children,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.overlay}>
          <Card style={styles.card}>
            <View>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {children}
            </ScrollView>
            <View style={styles.actions}>
              <Button label="Cancelar" variant="secondary" onPress={onClose} disabled={submitting} style={styles.action} />
              <Button label={submitLabel} icon="checkmark-outline" onPress={onSubmit} loading={submitting} style={styles.action} />
            </View>
            {onDelete ? (
              <Button
                label={deleteLabel}
                icon={deleteTone === 'danger' ? 'trash-outline' : 'refresh-outline'}
                variant={deleteTone === 'danger' ? 'danger' : 'secondary'}
                onPress={onDelete}
                disabled={submitting}
              />
            ) : null}
          </Card>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
