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
        <Text style={styles.draftNotice}>Última actualización: 2 de septiembre de 2026.</Text>

        <Section title="1. Datos que recolectamos">
          Recolectamos la información que ingresás voluntariamente para usar
          la app: tu nombre y email al registrarte, y los datos financieros
          que cargás vos mismo (gastos, ingresos, presupuestos, metas de
          ahorro, deudas, tarjetas de crédito, préstamos e inversiones). No
          recolectamos datos de terceros, no accedemos a tu cuenta bancaria
          directamente ni usamos ningún servicio de scraping o agregación
          bancaria — toda la información financiera es la que vos cargás a
          mano.
        </Section>

        <Section title="2. Cómo usamos tus datos">
          Tus datos se usan exclusivamente para brindarte el servicio: mostrar
          tus resúmenes financieros, calcular presupuestos y proyecciones,
          enviarte notificaciones de vencimientos y alertas de presupuesto
          (dentro de la app y por email), y sincronizar tu información entre
          dispositivos. No vendemos ni compartimos tus datos financieros con
          terceros con fines comerciales o publicitarios, y la app no muestra
          publicidad ni usa rastreadores de marketing.
        </Section>

        <Section title="3. Dónde se almacenan tus datos">
          Tus datos se almacenan en nuestro backend propio, en una base de
          datos protegida, alojada en infraestructura de terceros (proveedor
          de hosting en la nube) que actúa únicamente como encargado técnico
          del almacenamiento. Las credenciales de acceso se guardan de forma
          segura en el dispositivo (almacenamiento cifrado del sistema
          operativo) y todas las comunicaciones con el servidor viajan
          cifradas (HTTPS).
        </Section>

        <Section title="4. Servicios de terceros que usamos">
          Usamos un proveedor de email transaccional para enviarte alertas de
          presupuesto y correos de recuperación de contraseña — estos correos
          incluyen tu email y el contenido de la alerta, no el detalle de tus
          transacciones. La app tiene integrado (pero no necesariamente
          activo en todo momento) un servicio de monitoreo de errores que, de
          estar habilitado, recibe información técnica sobre fallas
          inesperadas (mensaje de error, pila de llamadas) para poder
          diagnosticarlas — esta información nunca incluye tus datos
          financieros. Si usás notificaciones push, el sistema operativo de
          tu dispositivo (Apple/Google) intermedia su entrega, como en
          cualquier app.
        </Section>

        <Section title="5. Cuánto tiempo conservamos tus datos">
          Conservamos tu información mientras tu cuenta esté activa. Si pedís
          la eliminación de tu cuenta, borramos tus datos personales y
          financieros de forma permanente, salvo que la ley exija conservar
          cierta información por un plazo adicional.
        </Section>

        <Section title="6. Tus derechos">
          Podés acceder, corregir, exportar o solicitar la eliminación de tus
          datos personales y financieros en cualquier momento, ya sea desde
          la propia app o contactándonos por los medios indicados abajo.
        </Section>

        <Section title="7. Menores de edad">
          La app no está dirigida a menores de 13 años y no recolectamos a
          sabiendas información de menores de esa edad.
        </Section>

        <Section title="8. Cambios a esta política">
          Si actualizamos esta política de forma significativa, te lo
          notificaremos dentro de la app o por email antes de que el cambio
          entre en vigencia.
        </Section>

        <Section title="9. Contacto">
          Ante cualquier consulta sobre esta política o sobre tus datos,
          escribinos a: ridgomez99@gmail.com.
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
