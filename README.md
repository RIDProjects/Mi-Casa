# Mi Casa Pro 🏠

Sistema de gestión financiera del hogar. SaaS web + app móvil (Android/iOS) que reemplaza las planillas Excel de presupuesto, deudas, gastos, metas de ahorro, tarjetas de crédito, créditos y patrimonio.

---

## Demo

- 🔗 **Demo en vivo**: _agregar URL de producción (Vercel) aquí_
- 📱 **APK de prueba**: _agregar link de build EAS (perfil `preview`) aquí_
- 🖼️ **Screenshots**: _pendiente — agregar capturas del dashboard, presupuesto y mobile_

---

## Features

- 📊 **Dashboard** con KPIs, termómetro de gastos vs presupuesto y alertas de stock
- 💰 **Presupuesto mensual** con categorías, periodicidad flexible (diaria a anual) y gastos hormiga
- 🔄 **Transacciones** con registro y seguimiento mensual
- 🎯 **Metas de ahorro** con cálculo de cuota (PMT) y proyección temporal
- 🤝 **Deudas bidireccionales** (ME DEBEN / LES DEBO) con balance neto
- 💳 **Tarjetas de crédito**: utilización, límite y estado de pago
- 🏦 **Créditos y préstamos** con tabla de amortización y progreso
- 📈 **Patrimonio neto** en tiempo real (activos físicos + efectivo − deudas)
- 🆘 **Fondo de emergencia** con calculadora por categoría de gasto
- 🧮 **Simulador de préstamos** sin necesidad de API
- 📦 **Inventario y lista de compras** del hogar
- 🔐 **RBAC multi-hogar**: roles y permisos por módulo (admin, house_admin, user, viewer)
- 📱 **App móvil** (Android/iOS) con las pantallas core: login, deudas, compras, gastos

---

## Arquitectura

```
Mi Casa Pro
├── finanzas-app/
│   ├── backend/      → NestJS + TypeORM + PostgreSQL (API REST)
│   ├── frontend/     → Next.js + Tailwind CSS (Web SaaS)
│   └── mobile/       → React Native + Expo (Android + iOS)
```

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS, TypeORM, PostgreSQL, JWT |
| Frontend | Next.js 14, Tailwind CSS, React Query, Zustand |
| Mobile | React Native 0.74, Expo 51, Expo Router |
| Build móvil | EAS Build (Expo Application Services) |

---

## Módulos

### Web (frontend)
| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | KPIs, termómetro de gastos, alertas de stock |
| Presupuesto | `/presupuesto` | Ingresos, categorías de gastos, advisory |
| Transacciones | `/transacciones` | Registro mensual de movimientos |
| Metas de Ahorro | `/metas` | Objetivos con cálculo PMT |
| Deudas | `/debts` | Gestor bidireccional ME DEBEN / LES DEBO |
| Tarjetas | `/tarjetas` | Crédito, utilización, estado de pago |
| Créditos | `/creditos` | Préstamos con progreso y meses estimados |
| Patrimonio | `/patrimonio` | Activos físicos/cash − deudas |
| Fondo Emergencia | `/emergency-fund` | Calculadora con categorías de gasto |
| Simulador | `/simulador` | Tabla de amortización sin API |
| Inventario | `/inventory` | Stock del hogar |
| Compras | `/purchases` | Listas de compras multimoneda (totales convertidos a la moneda local) |

### Mobile (Android + iOS)
| Pantalla | Descripción |
|----------|-------------|
| Login | Autenticación JWT |
| Deudas | SectionList con swipe + FAB |
| Lista de compras | Agregar productos multimoneda antes de ir al mercado (subtotales por moneda) |
| Registro de gastos | Historial mensual por categoría |

---

## Requisitos previos

- Node.js >= 18
- PostgreSQL >= 14
- Para mobile: cuenta en [Expo](https://expo.dev) (gratis)
- Para build iOS: Apple Developer Program ($99/año) + macOS con Xcode

---

## Instalación y desarrollo

### 1. Backend

```bash
cd finanzas-app/backend
npm install
cp .env.example .env        # configurar DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, JWT_SECRET, etc.
npm run start:dev
# → http://localhost:3001/api/v1
```

### 2. Frontend (web)

```bash
cd finanzas-app/frontend
npm install
# Crear .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
npm run dev
# → http://localhost:3000
```

### 3. Mobile — preview rápido con Expo Go

**Sin compilar nada.** Instala [Expo Go](https://expo.dev/go) en tu celular y:

```bash
cd finanzas-app/mobile
npm install
npx expo start
# Escanea el QR con Expo Go
```

> `API_BASE_URL` (`src/config/api.ts`) se lee de `EXPO_PUBLIC_API_URL`. Para conectar desde un celular físico define esa variable con la IP local de tu PC (ej: `http://192.168.1.10:3001/api/v1`). Sin ella se usa `http://10.0.2.2:3001/api/v1` (emulador Android).

---

## Build — generar APK e IPA

### Requisito único: instalar EAS CLI

```bash
npm install -g eas-cli
eas login          # loguearse con cuenta Expo
```

### APK Android (para instalar directamente en el celular)

```bash
cd finanzas-app/mobile
eas build --platform android --profile preview
```

EAS compila en la nube y devuelve un link para descargar el `.apk`. Sin necesidad de Android Studio ni SDK local.

### IPA iOS (para TestFlight o App Store)

```bash
eas build --platform ios --profile preview
```

Requiere:
1. Apple Developer Program activo
2. Bundle ID `com.micasapro.app` registrado en [Apple Developer](https://developer.apple.com)
3. EAS maneja los certificados automáticamente en el primer build

### Build de producción (Play Store / App Store)

```bash
# Android → genera .aab para Play Store
eas build --platform android --profile production

# iOS → genera .ipa firmado para App Store
eas build --platform ios --profile production
```

### Perfiles de build (`eas.json`)

| Perfil | Android | iOS | Uso |
|--------|---------|-----|-----|
| `development` | `.apk` debug | Simulador | Desarrollo local |
| `preview` | `.apk` release | TestFlight interno | QA / testing |
| `production` | `.aab` | App Store | Distribución pública |

---

## Variables de entorno

### Backend (`.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=tu_password
DB_NAME=micasapro
JWT_SECRET=tu_jwt_secret_largo_y_seguro
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
APP_TIMEZONE=America/Havana
TRUST_PROXY_HOPS=1
SEED=false
RESEND_API_KEY=
RESEND_FROM=Mi Casa Pro <onboarding@resend.dev>
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@mi-casa.app
```

| Variable | Descripción |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Conexión a PostgreSQL. En producción `DB_USER`, `DB_PASS` y `DB_NAME` son obligatorias |
| `JWT_SECRET` | Secreto de firma de los tokens JWT |
| `PORT` | Puerto HTTP (default `3001`) |
| `FRONTEND_URL` | Origen permitido por CORS y base de los enlaces de invitación. Obligatoria en producción |
| `NODE_ENV` | `production` activa SSL en la DB, desactiva `synchronize` y Swagger |
| `APP_TIMEZONE` | Zona horaria para calcular "hoy" y los límites de mes (default `America/Havana`) |
| `TRUST_PROXY_HOPS` | Saltos de proxy confiables para obtener la IP real (default `1`; `0` lo desactiva) |
| `SEED` | `true` solo para crear los roles y permisos base en una DB vacía. Sin roles, el registro falla. Déjala sin definir o en `false` después |
| `RESEND_API_KEY`, `RESEND_FROM` | Envío de emails (invitaciones, alertas y recordatorios a los administradores de la casa) vía Resend |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Notificaciones push web |

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Mobile

`src/config/api.ts` no tiene la URL escrita a mano: lee `EXPO_PUBLIC_API_URL` en tiempo de compilación (fallback `http://10.0.2.2:3001/api/v1`).

```env
# Desarrollo local: finanzas-app/mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001/api/v1
```

Para builds y updates de EAS se define en el entorno de EAS (`--environment preview`), no en el código.

---

## Modelo de datos

El esquema completo de PostgreSQL (tablas, relaciones, constraints) está documentado en [`finanzas-app/docs/schema.sql`](./finanzas-app/docs/schema.sql).

---

## Sistema de permisos

Cada usuario pertenece a una casa (`House`). Los roles controlan el acceso por módulo:

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el sistema, panel de administración |
| `house_admin` | Administrador de la casa: gestiona miembros (invitaciones y roles) y monedas/tasas |
| `user` | Miembro: CRUD completo (`view`, `create`, `edit`, `delete`) en todos los módulos |
| `viewer` | Solo lectura |

Los permisos se definen por módulo: `view`, `create`, `edit`, `delete`. Solo los administradores de la casa invitan o gestionan miembros (y eligen su rol: `user` o `house_admin`) y administran monedas y tasas. Las invitaciones requieren un email válido; los emails no distinguen mayúsculas.

Las tasas de cambio son **por casa** (no se comparten entre casas), deben ser mayores que 0 y cada casa tiene una única moneda local. Para usar "Hacer local" debe existir antes la tasa entre la moneda nueva y la local actual; al cambiarla se recalculan todas las tasas y los montos convertidos de los gastos existentes.

---

## Fórmulas financieras implementadas

**PMT — Cuota mensual de ahorro** (Metas):
```
PMT = ((meta - presente*(1+r/12)^n) * (r/12)) / ((1+r/12)^n - 1)
r = tasa% / 100      (la tasa anual se ingresa como porcentaje, de 0 a 100)
```

**Normalización de periodicidad** (Presupuesto):
```
Mensual = monto × factor
Diario×30 | Semanal×4 | Quincenal×2 | Mensual×1
Bimestral÷2 | Trimestral÷3 | Cuatrimestral÷4 | Semestral÷6 | Anual÷12
```

**Estrategias de pago de deudas** (Payoff: avalancha y bola de nieve):
```
Presupuesto mensual fijo = suma de pagos mínimos + extra
Rollover: al saldar una deuda, su mínimo pasa a la siguiente
feasible = false si los pagos no cubren los intereses (sin tiempo total)
```

**Patrimonio neto**:
```
Neto = (activos físicos + efectivo) − (saldo tarjetas + deuda créditos)
```

---

## Despliegue en producción

El sistema usa **dos plataformas** porque el backend NestJS requiere un proceso persistente (incompatible con serverless):

| Parte | Plataforma | Costo |
|---|---|---|
| Frontend (Next.js) | Vercel — Hobby | $0/mes |
| Backend (NestJS) + PostgreSQL | Railway — Starter | ~$5/mes |

### 1. Railway — Backend + Base de datos

```bash
# 1. Crear cuenta en railway.app
# 2. New Project → Empty service (no vinculado a GitHub)
# 3. + New → Database → PostgreSQL
# 4. Desplegar el backend desde la carpeta del servicio:
cd finanzas-app/backend
railway up
```

> El servicio de Railway **no está vinculado a GitHub**: hacer push no despliega el backend; hay que ejecutar `railway up`. El contenedor (Dockerfile) ejecuta las migraciones al iniciar (`typeorm migration:run` y luego `node dist/main`), por lo que conviene **respaldar la base de datos antes** de cada despliegue (ver [Backups](#backups)).

Variables de entorno en Railway:

```env
NODE_ENV=production
PORT=3001
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASS=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
JWT_SECRET=secret-largo-y-aleatorio
FRONTEND_URL=https://tu-app.vercel.app
APP_TIMEZONE=America/Havana
TRUST_PROXY_HOPS=1
RESEND_API_KEY=...
# SEED=true solo en el primer arranque con la DB vacía (crea roles y permisos base)
```

Railway genera automáticamente la URL pública del backend.

### 2. Vercel — Frontend

```bash
# 1. Crear cuenta en vercel.com con GitHub
# 2. New Project → Import Git Repository
# 3. Framework Preset: Next.js (se detecta automáticamente)
#    Root Directory: finanzas-app/frontend
```

Vercel despliega el frontend en cada push a `main`.

Variable de entorno en Vercel:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app/api/v1
```

Después del deploy, vuelve a Railway y actualiza `FRONTEND_URL` con la URL de Vercel.

### 3. Mobile — APK con backend en producción

`EXPO_PUBLIC_API_URL` se define en el entorno de EAS (`preview`), no en el código:

```bash
cd finanzas-app/mobile
eas build --platform android --profile preview
```

Los cambios de JavaScript se publican por OTA (canal `preview`), sin generar un APK nuevo:

```bash
npx eas-cli update --branch preview --environment preview
```

### Backups

Antes de desplegar cambios con migraciones, respalda la base de datos. Postgres no tiene URL pública: el dump se ejecuta dentro del servicio vía SSH y se descarga por stdout.

```bash
# 1. Llave SSH registrada en Railway (una sola vez)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_railway -N ""
railway ssh keys add --key ~/.ssh/id_ed25519_railway.pub --name backup

# 2. Config SSH para el servicio Postgres y host key de Railway
railway ssh config -s Postgres --path /tmp/rw_ssh_config --alias mcpg -i ~/.ssh/id_ed25519_railway
ssh-keyscan -t ed25519 ssh.railway.com > /tmp/rw_known_hosts

# 3. Dump en formato custom, guardado en tu máquina
ssh -F /tmp/rw_ssh_config -o UserKnownHostsFile=/tmp/rw_known_hosts mcpg \
  'pg_dump -U "$PGUSER" -d "$PGDATABASE" -Fc --no-owner' > prod-$(date +%Y%m%d-%H%M%S).dump
```

Restaurar en local para ensayar migraciones: `pg_restore -d <db> --no-owner prod-XXXX.dump` (usa la misma versión mayor de Postgres que producción, 18).

---

## Capacidad y performance

Configuración actual con 1 instancia en Railway:

| Métrica | Valor |
|---|---|
| Usuarios concurrentes cómodos | 100-150 |
| Pool de conexiones PostgreSQL | 25 activas · 2 mínimo |
| Rate limiter (burst) | 20 req/s por IP |
| Rate limiter (normal) | 300 req/min por IP |
| Rate limiter (anti-scraping) | 1.500 req/15min por IP |
| HTTP keep-alive | 65s (compatible con Railway LB) |

Para escalar: agregar instancias en Railway sin cambios de código.

---

## Estructura de carpetas (mobile)

```
mobile/
├── App.tsx                    # Entry point (react-native-gesture-handler PRIMERO)
├── app.json                   # Config Expo
├── eas.json                   # Perfiles de build EAS
├── src/
│   ├── config/api.ts          # URL del backend
│   ├── context/AuthContext.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx   # Auth guard raíz
│   │   ├── MainTabs.tsx       # Bottom tabs
│   │   └── GastosStack.tsx
│   ├── screens/
│   │   ├── auth/LoginScreen.tsx
│   │   ├── debts/
│   │   │   ├── DebtsSummaryScreen.tsx
│   │   │   └── AddDebtScreen.tsx
│   │   └── expenses/
│   │       ├── ShoppingListScreen.tsx
│   │       └── ExpenseRegistryScreen.tsx
│   ├── services/
│   │   ├── apiClient.ts       # Axios + registerUnauthorizedHandler
│   │   ├── debts.service.ts
│   │   └── transactions.service.ts
│   ├── components/common/
│   │   ├── EmptyState.tsx
│   │   └── LoadingSpinner.tsx
│   ├── theme/colors.ts
│   └── types/index.ts
```
