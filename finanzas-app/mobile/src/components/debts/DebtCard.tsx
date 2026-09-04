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
import { Colors } from '../../theme/colors';
import { Debt } from '../../types';
import { formatMoney } from '../../utils/currency';

interface Props {
  debt: Debt;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const fmt = formatMoney;

export default function DebtCard({ debt, onMarkPaid, onDelete, onEdit }: Props) {
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
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.actionText}>Pagada</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.white} />
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
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onEdit(debt.id)}
      >
        <View style={[styles.indicator, { backgroundColor: isTheyOweMe ? Colors.blue : Colors.red }]} />
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.name}>{debt.personName}</Text>
            <Text
              style={[
                styles.amount,
                { color: isTheyOweMe ? Colors.green : Colors.red },
              ]}
            >
              {isTheyOweMe ? '+' : '-'} {fmt(debt.amount)}
            </Text>
          </View>
          {debt.note ? (
            <Text style={styles.note} numberOfLines={1}>
              {debt.note}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.paidIconBtn}
          onPress={(e) => {
            e.stopPropagation();
            handleMarkPaid();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.green} />
        </TouchableOpacity>
        <Ionicons
          name="create-outline"
          size={16}
          color={Colors.textMuted}
          style={styles.swipeHint}
        />
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  indicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  note: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  paidIconBtn: {
    paddingHorizontal: 6,
  },
  swipeHint: {
    paddingRight: 10,
    opacity: 0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    marginRight: 16,
    gap: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtn: {
    width: 64,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
  },
  paidBtn: {
    backgroundColor: Colors.green,
  },
  deleteBtn: {
    backgroundColor: Colors.red,
  },
  actionText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
