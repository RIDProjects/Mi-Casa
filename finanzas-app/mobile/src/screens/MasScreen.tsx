import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MasStackParamList, RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Card, PageHeader, Reveal, Screen } from '../components/ui';

type Nav = NativeStackNavigationProp<MasStackParamList & RootStackParamList>;
type Destination = keyof (MasStackParamList & RootStackParamList);

interface Entry {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  to: Destination;
}

interface Group {
  title: string;
  entries: Entry[];
}

// Navigation from the hub reaches both this stack and the root stack (React Navigation bubbles up).
export const MAS_GROUPS: Group[] = [
  {
    title: 'Finanzas',
    entries: [
      { label: 'Movimientos', hint: 'Ingresos y gastos del mes', icon: 'swap-horizontal-outline', to: 'Movimientos' },
      { label: 'Deudas', hint: 'Lo que te deben y lo que debes', icon: 'people-outline', to: 'DebtsSummary' },
      { label: 'Tarjetas de crédito', hint: 'Límites, saldos y uso', icon: 'card-outline', to: 'Tarjetas' },
      { label: 'Cuotas', hint: 'Compras a plazos', icon: 'layers-outline', to: 'Cuotas' },
    ],
  },
  {
    title: 'Ahorro y patrimonio',
    entries: [
      { label: 'Fondo de emergencia', hint: 'Cobertura en meses', icon: 'shield-checkmark-outline', to: 'FondoEmergencia' },
      { label: 'Patrimonio', hint: 'Activos, pasivos y evolución', icon: 'trending-up-outline', to: 'Patrimonio' },
    ],
  },
  {
    title: 'Calendario',
    entries: [{ label: 'Vencimientos', hint: 'Próximos pagos del hogar', icon: 'calendar-outline', to: 'Vencimientos' }],
  },
  {
    title: 'Cuenta',
    entries: [{ label: 'Perfil y ajustes', hint: 'Apariencia, privacidad y sesión', icon: 'person-outline', to: 'Perfil' }],
  },
];

const createStyles = (c: ThemeColors) => ({
  group: { gap: 8 },
  groupTitle: { fontFamily: fonts.semibold, fontSize: 11, color: c.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 1, paddingHorizontal: 4 },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.border },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.infoTint, alignItems: 'center' as const, justifyContent: 'center' as const },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: c.onSurfaceVariant, marginTop: 1 },
});

export default function MasScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen>
      <Reveal index={0}>
        <PageHeader title="Más" subtitle={user?.name ? `Sesión de ${user.name}` : undefined} />
      </Reveal>
      {MAS_GROUPS.map((group, groupIndex) => (
        <Reveal key={group.title} index={groupIndex + 1}>
          <View style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Card padded={false}>
              {group.entries.map((entry, i) => (
                <Pressable
                  key={entry.to}
                  accessibilityRole="button"
                  accessibilityLabel={entry.label}
                  onPress={() => (navigation.navigate as (screen: Destination) => void)(entry.to)}
                  style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.icon}>
                    <Ionicons name={entry.icon} size={20} color={colors.infoInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{entry.label}</Text>
                    <Text style={styles.hint}>{entry.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.outline} />
                </Pressable>
              ))}
            </Card>
          </View>
        </Reveal>
      ))}
    </Screen>
  );
}
