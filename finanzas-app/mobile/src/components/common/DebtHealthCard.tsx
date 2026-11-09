import { View, Text, StyleSheet } from 'react-native';
import { Card, ProgressBar } from '../ui';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { fonts, Tone, toneInk } from '../../theme/tokens';
import type { ThemeColors } from '../../theme/tokens';
import type { DebtHealth } from '../../types';

const VERDICT: Record<Exclude<DebtHealth['status'], 'sin_deudas'>, { title: string; tone: Tone }> = {
  bien: { title: 'Vas bien con tus deudas', tone: 'ok' },
  atencion: { title: 'Atención con tus deudas', tone: 'warn' },
  riesgo: { title: 'Tus deudas están en riesgo', tone: 'danger' },
};

const HORIZON_LABEL = { corto: 'corto plazo', mediano: 'mediano plazo', largo: 'largo plazo' } as const;

function payoffText(data: DebtHealth): string {
  if (data.horizon === 'no_alcanza') return 'Con tu margen actual los pagos no cubren los intereses: la deuda no baja.';
  if (data.horizon === 'ninguno') return '';
  return `Podrías saldarlas en ${data.monthsToPayoff} meses (${HORIZON_LABEL[data.horizon]}).`;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: 10 },
    eyebrow: { fontFamily: fonts.semibold, fontSize: 10.5, color: c.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6 },
    title: { fontFamily: fonts.title, fontSize: 16, letterSpacing: -0.2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
    cell: { width: '50%', gap: 2 },
    label: { fontFamily: fonts.regular, fontSize: 11, color: c.onSurfaceVariant },
    value: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
    note: { fontFamily: fonts.regular, fontSize: 12, color: c.onSurfaceVariant },
    warning: { fontFamily: fonts.medium, fontSize: 12, color: c.dangerInk },
  });

/** Dashboard verdict on the debts: debt/income ratio, extra margin and payoff horizon. Hidden without debts. */
export function DebtHealthCard({ data, fmt }: { data: DebtHealth; fmt: (n: number) => string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  if (data.status === 'sin_deudas') return null;

  const verdict = VERDICT[data.status];
  const ratio = data.debtToIncomePercent;
  const cells: [string, string][] = [
    ['Deuda / ingreso', ratio === null ? '—' : `${ratio}%`],
    ['Pago mensual de deudas', fmt(data.monthlyDebtService)],
    ['Margen para abonar extra', fmt(data.extraPayment)],
    ['Total adeudado', fmt(data.totalBalance)],
  ];

  return (
    <Card style={styles.card}>
      <View>
        <Text style={styles.eyebrow}>Salud de tus deudas</Text>
        <Text style={[styles.title, { color: toneInk(colors, verdict.tone) }]}>{verdict.title}</Text>
      </View>
      <ProgressBar value={ratio === null ? 1 : ratio / 100} tone={verdict.tone} />
      <View style={styles.grid}>
        {cells.map(([label, value]) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>{payoffText(data)}</Text>
      {data.available < 0 && (
        <Text style={styles.warning}>Tus gastos superan tus ingresos: no queda margen para abonar a las deudas.</Text>
      )}
    </Card>
  );
}
