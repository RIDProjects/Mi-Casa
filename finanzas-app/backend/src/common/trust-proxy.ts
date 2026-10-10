import { INestApplication } from '@nestjs/common';

// Railway (y cualquier load balancer) termina la conexión: sin 'trust proxy'
// req.ip es la IP del proxy y el ThrottlerGuard trata a TODOS los clientes
// como uno solo (429 aleatorios bajo carga normal, y el límite de login no
// frena a nadie en particular). TRUST_PROXY_HOPS permite ajustar cuántos
// saltos de proxy hay delante; 0 desactiva la confianza.
export function configureTrustProxy(app: INestApplication): void {
  const raw = process.env.TRUST_PROXY_HOPS;
  const parsed = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  const hops = Number.isInteger(parsed) && parsed >= 0 ? parsed : 1;
  app.getHttpAdapter().getInstance().set('trust proxy', hops);
}
