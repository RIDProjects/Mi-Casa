import * as Sentry from '@sentry/react-native';

// DSN se lee de una variable de entorno pública. Si no está seteada
// (por ejemplo en desarrollo local sin cuenta de Sentry configurada),
// el init es un no-op silencioso: no debe romper la app.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    tracesSampleRate: 1.0,
  });
}
