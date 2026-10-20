import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import { Badge, Card } from '../ui';
import { Debt } from '../../types';
import { formatMoney } from '../../utils/currency';

interface Props {
  debt: Debt;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const fmt = formatMoney;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    content: { flex: 1, paddingVertical: 14, paddingLeft: 18, paddingRight: 8, gap: 6 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontFamily: fonts.semibold, color: c.onSurface, fontSize: 15 },
    amount: { fontFamily: fonts.title, fontSize: 16 },
    bottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    note: { flex: 1, fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 },
    paidIconBtn: { paddingHorizontal: 6 },
    swipeHint: { paddingRight: 12 },
    actionsContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 6 },
    actionBtn: {
      width: 64,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: radius.md,
    },
    paidBtn: { backgroundColor: c.okInk },
    deleteBtn: { backgroundColor: c.dangerInk },
    actionText: { fontFamily: fonts.bold, color: c.surface, fontSize: 10 },
  });

export default function DebtCard({ debt, onMarkPaid, onDelete, onEdit }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const swipeableRef = useRef<Swipeable>(null);
  const isTheyOweMe = debt.type === 'they_owe_me';

  const handleMarkPaid = () => {
    swipeableRef.current?.close();
    Alert.alert(
      'Marcar como pagada',
      `¿Confirmar que ${isTheyOweMe ? debt.personName + ' te pagó' : 'le pagaste a ' + debt.personName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: () => onMarkPaid(debt.id),
        },
      ],
    );
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    Alert.alert(
      'Eliminar deuda',
      `¿Eliminar la deuda de ${debt.personName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDelete(debt.id),
        },
      ],
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-140, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.actionsContainer}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.paidBtn]}
            onPress={handleMarkPaid}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.surface} />
            <Text style={styles.actionText}>Pagada</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={colors.surface} />
            <Text style={styles.actionText}>Eliminar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}
    >
      <Card
        padded={false}
        accent={isTheyOweMe ? colors.brand : colors.dangerInk}
        onPress={() => onEdit(debt.id)}
      >
        <View style={styles.row}>
          <View style={styles.content}>
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>{debt.personName}</Text>
              <Text style={[styles.amount, { color: isTheyOweMe ? colors.okInk : colors.dangerInk }]}>
                {isTheyOweMe ? '+' : '-'} {fmt(debt.amount)}
              </Text>
            </View>
            <View style={styles.bottom}>
              <Badge label={isTheyOweMe ? 'Me deben' : 'Les debo'} tone={isTheyOweMe ? 'info' : 'danger'} />
              {debt.note ? (
                <Text style={styles.note} numberOfLines={1}>
                  {debt.note}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.paidIconBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleMarkPaid();
            }}
            accessibilityLabel={`Marcar como pagada la deuda de ${debt.personName}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.okInk} />
          </TouchableOpacity>
          <Ionicons name="create-outline" size={16} color={colors.outline} style={styles.swipeHint} />
        </View>
      </Card>
    </Swipeable>
  );
}
