# Mi Casa Pro 🏠

Sistema de gestión financiera del hogar. SaaS web + app móvil (Android/iOS) que reemplaza las planillas Excel de presupuesto, deudas, gastos, metas de ahorro, tarjetas de crédito, créditos y patrimonio.

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
| Compras | `/purchases` | Listas de compras en CUP |

### Mobile (Android + iOS)
| Pantalla | Descripción |
|----------|-------------|
| Login | Autenticación JWT |
| Deudas | SectionList con swipe + FAB |
| Lista de compras | Agregar productos con precio CUP antes de ir al mercado |
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
cp .env.example .env        # configurar DB_HOST, DB_PORT, JWT_SECRET, etc.
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

**Sin compilar nada.** Instalá [Expo Go](https://expo.dev/go) en tu celular y:

```bash
cd finanzas-app/mobile
npm install
npx expo start
# Escaneá el QR con Expo Go
```

> Para conectar al backend desde el celular físico cambiá `API_BASE_URL` en `src/config/api.ts` por la IP local de tu PC (ej: `http://192.168.1.10:3001/api/v1`). Para emulador Android usá `http://10.0.2.2:3001/api/v1`.

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

EAS compila en la nube y te devuelve un link para descargar el `.apk`. Sin necesidad de Android Studio ni SDK local.

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
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=micasapro
JWT_SECRET=tu_jwt_secret_largo_y_seguro
PORT=3001
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Mobile (`src/config/api.ts`)

```ts
// Emulador Android
export const API_BASE_URL = 'http://10.0.2.2:3001/api/v1';

// Celular físico (reemplazá con tu IP local)
export const API_BASE_URL = 'http://192.168.1.10:3001/api/v1';

// Producción
export const API_BASE_URL = 'https://api.micasapro.com/api/v1';
```

---

## Sistema de permisos

Cada usuario pertenece a una casa (`House`). Los roles controlan el acceso por módulo:

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el sistema, panel de administración |
| `house_admin` | Gestión de miembros de la casa |
| `member` | Acceso según permisos asignados por módulo |

Los permisos se definen por módulo: `view`, `create`, `edit`, `delete`.

---

## Fórmulas financieras implementadas

**PMT — Cuota mensual de ahorro** (Metas):
```
PMT = ((meta - presente*(1+r/12)^n) * (r/12)) / ((1+r/12)^n - 1)
```

**Normalización de periodicidad** (Presupuesto):
```
Mensual = monto × factor
Diario×30 | Semanal×4 | Quincenal×2 | Mensual×1
Bimestral÷2 | Trimestral÷3 | Cuatrimestral÷4 | Semestral÷6 | Anual÷12
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
# 1. Crear cuenta en railway.app con GitHub
# 2. New Project → Deploy from GitHub repo
# 3. + New → Database → PostgreSQL
# 4. Configurar el servicio backend:
#    Root Directory:   finanzas-app/backend
#    Build Command:    npm run build
#    Start Command:    node dist/main
```

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
```

Railway genera automáticamente la URL pública del backend.

### 2. Vercel — Frontend

```bash
# 1. Crear cuenta en vercel.com con GitHub
# 2. New Project → Import Git Repository
# 3. Framework Preset: Next.js (se detecta automáticamente)
#    Root Directory: finanzas-app/frontend
```

Variable de entorno en Vercel:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app/api/v1
```

Después del deploy, volvé a Railway y actualizá `FRONTEND_URL` con la URL de Vercel.

### 3. Mobile — APK con backend en producción

```bash
cd finanzas-app/mobile
# Actualizar .env con la URL de Railway
echo "EXPO_PUBLIC_API_URL=https://tu-backend.up.railway.app/api/v1" > .env
eas build --platform android --profile preview
```

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
