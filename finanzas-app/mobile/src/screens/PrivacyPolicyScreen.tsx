import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Card, Reveal, Screen } from '../components/ui';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  index: number;
}

function Section({ title, children, index }: SectionProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Reveal index={index}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionBody}>{children}</Text>
      </Card>
    </Reveal>
  );
}

export default function PrivacyPolicyScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <Screen edges={['bottom']} contentStyle={styles.scroll}>
      <Reveal index={0}>
        <Text style={styles.title}>Política de Privacidad</Text>
        <Text style={styles.draftNotice}>Última actualización: 19 de octubre de 2026.</Text>
      </Reveal>

        <Section index={1} title="1. Datos que recolectamos">
          Recolectamos la información que ingresas voluntariamente para usar
          la app: tu nombre y email al registrarte, y los datos financieros
          que cargas tú mismo (gastos, ingresos, presupuestos, metas de
          ahorro, deudas, tarjetas de crédito, préstamos e inversiones). No
          recolectamos datos de terceros, no accedemos a tu cuenta bancaria
          directamente ni usamos ningún servicio de scraping o agregación
          bancaria — toda la información financiera es la que tú cargas a
          mano.
        </Section>

        <Section index={2} title="2. Cómo usamos tus datos">
          Tus datos se usan exclusivamente para brindarte el servicio: mostrar
          tus resúmenes financieros, calcular presupuestos y proyecciones,
          enviarte notificaciones de vencimientos y alertas de presupuesto
          (dentro de la app y por email), y sincronizar tu información entre
          dispositivos. No vendemos ni compartimos tus datos financieros con
          terceros con fines comerciales o publicitarios, y la app no muestra
          publicidad ni usa rastreadores de marketing.
        </Section>

        <Section index={3} title="3. Dónde se almacenan tus datos">
          Tus datos se almacenan en nuestro backend propio, en una base de
          datos alojada en infraestructura de terceros (Railway), que actúa
          únicamente como encargado técnico del almacenamiento. Los
          servidores pueden estar ubicados fuera de tu país, por lo que tus
          datos pueden transferirse y tratarse en otras jurisdicciones. Todas
          las comunicaciones con el servidor viajan cifradas (HTTPS). Tu
          sesión se guarda en el almacenamiento local de la app en tu
          dispositivo hasta que cierres sesión.
        </Section>

        <Section index={4} title="4. Servicios de terceros que usamos">
          Usamos Resend como proveedor de email transaccional para enviarte
          alertas de presupuesto, avisos de vencimientos y correos de
          recuperación de contraseña; estos correos incluyen tu email y el
          contenido de la alerta, no el detalle de tus transacciones. El
          alojamiento de la API y la base de datos está en Railway, y el de
          la versión web en Vercel. La app tiene integrado (pero no
          necesariamente activo en todo momento) un servicio de monitoreo de
          errores (Sentry) que, de estar habilitado, recibe información
          técnica sobre fallas inesperadas (mensaje de error, pila de
          llamadas); esta información no incluye tus datos financieros. Si
          usas notificaciones push, el sistema operativo de tu dispositivo
          (Apple/Google) intermedia su entrega, como en cualquier app.
        </Section>

        <Section index={5} title="5. Cuánto tiempo conservamos tus datos">
          Conservamos tu información mientras tu cuenta esté activa. Puedes
          eliminar tu cuenta en cualquier momento desde Perfil → Eliminar
          cuenta (se te pedirá tu contraseña). Al hacerlo borramos tu cuenta
          de forma permanente y, si eras el único miembro de tu casa, también
          todos los datos financieros de esa casa. Si compartes la casa con
          otros miembros, los datos de la casa permanecen disponibles para
          ellos. Podemos conservar cierta información por un plazo adicional
          solo si la ley lo exige.
        </Section>

        <Section index={6} title="6. Tus derechos">
          Puedes consultar y corregir tus datos financieros directamente en
          la app y eliminar tu cuenta y tus datos desde Perfil → Eliminar
          cuenta. Para solicitar una copia (exportación) de tus datos
          personales o ejercer cualquier otro derecho, escríbenos a los
          medios indicados abajo.
        </Section>

        <Section index={7} title="7. Menores de edad">
          La app no está dirigida a menores de 13 años y no recolectamos a
          sabiendas información de menores de esa edad.
        </Section>

        <Section index={8} title="8. Cambios a esta política">
          Si actualizamos esta política de forma significativa, te lo
          notificaremos dentro de la app o por email antes de que el cambio
          entre en vigencia.
        </Section>

        <Section index={9} title="9. Contacto">
          Ante cualquier consulta sobre esta política o sobre tus datos,
          escríbenos a: ridgomez99@gmail.com.
        </Section>
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 32, gap: 14 },
    title: { fontFamily: fonts.title, color: c.onSurface, fontSize: 24, letterSpacing: -0.5 },
    draftNotice: { fontFamily: fonts.regular, color: c.outline, fontSize: 12, marginTop: -8 },
    section: { gap: 6 },
    sectionTitle: { fontFamily: fonts.title, color: c.onSurface, fontSize: 15 },
    sectionBody: { fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 14, lineHeight: 21 },
  });
