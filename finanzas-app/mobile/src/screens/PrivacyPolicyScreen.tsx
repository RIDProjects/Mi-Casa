/**
 * BORRADOR — este texto NO es una política de privacidad final.
 * Necesita revisión legal antes de publicar la app en las tiendas
 * (App Store / Google Play). No usar como texto definitivo sin que
 * un profesional legal lo revise y lo adapte a la jurisdicción
 * correspondiente.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../theme/colors';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Política de Privacidad</Text>
        <Text style={styles.draftNotice}>
          Borrador — pendiente de revisión legal. Última actualización: sin
          definir.
        </Text>

        <Section title="1. Datos que recolectamos">
          Recolectamos la información que ingresás voluntariamente para usar
          la app: tu email y nombre al registrarte, y los datos financieros
          que cargás vos mismo (gastos, ingresos, presupuestos, metas de
          ahorro y deudas). No recolectamos datos de terceros ni accedemos a
          tu cuenta bancaria directamente.
        </Section>

        <Section title="2. Cómo usamos tus datos">
          Tus datos se usan exclusivamente para brindarte el servicio: mostrar
          tus resúmenes financieros, calcular presupuestos, enviarte
          notificaciones de vencimientos y sincronizar tu información entre
          dispositivos. No vendemos ni compartimos tus datos financieros con
          terceros con fines comerciales o publicitarios.
        </Section>

        <Section title="3. Dónde se almacenan tus datos">
          Tus datos se almacenan en nuestro backend propio, en una base de
          datos protegida. Las credenciales de acceso se guardan de forma
          segura en el dispositivo (almacenamiento cifrado del sistema
          operativo) y las comunicaciones con el servidor viajan cifradas.
        </Section>

        <Section title="4. Reportes de errores">
          Si ocurre un error inesperado en la app, podemos enviar información
          técnica (mensaje de error, pila de llamadas) a un servicio de
          monitoreo de errores para poder diagnosticarlo y solucionarlo. Esta
          información no incluye tus datos financieros.
        </Section>

        <Section title="5. Tus derechos">
          Podés solicitar la corrección o eliminación de tus datos personales
          y financieros en cualquier momento contactándonos por los medios
          indicados abajo.
        </Section>

        <Section title="6. Contacto">
          Ante cualquier consulta sobre esta política o sobre tus datos,
          escribinos a: soporte@micasapro.app (dirección de contacto a
          confirmar).
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48, gap: 20 },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  draftNotice: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: -12,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
