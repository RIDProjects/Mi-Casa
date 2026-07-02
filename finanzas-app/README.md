# Mi Casa — Sistema de Gestión Financiera Personal

Aplicación full-stack de finanzas personales con presupuesto, inversiones, deudas, tarjetas, metas de ahorro y patrimonio.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Query |
| Backend | NestJS, TypeORM, TypeScript |
| Base de datos | PostgreSQL |
| Auth | JWT + bcrypt |

---

## Despliegue gratuito — Vercel + Railway + Neon

### Arquitectura

```
Vercel (frontend Next.js)  →  Railway (backend NestJS)  →  Neon (PostgreSQL)
```

| Servicio | Plan gratuito | Límites |
|---------|--------------|---------|
| [Vercel](https://vercel.com) | Hobby | 100 GB bandwidth/mes, deploys ilimitados |
| [Railway](https://railway.app) | Starter | $5 crédito/mes (~500 hs de cómputo) |
| [Neon](https://neon.tech) | Free | 0.5 GB storage, 1 proyecto |

---

## Paso 1 — Base de datos en Neon

1. Creá cuenta en [neon.tech](https://neon.tech)
2. Creá un proyecto, seleccioná región más cercana
3. Copiá el **Connection String** (formato `postgresql://user:pass@host/db?sslmode=require`)
4. Guardalo — lo usás en el Paso 2

---

## Paso 2 — Backend en Railway

1. Creá cuenta en [railway.app](https://railway.app) (vinculá con GitHub)
2. **New Project → Deploy from GitHub repo** → seleccioná este repositorio
3. Configurá el **Root Directory**: `finanzas-app/backend`
4. En **Variables** del servicio, agregá:

```env
NODE_ENV=production
PORT=3001

# Datos de conexión de Neon
DB_HOST=<neon-host>
DB_PORT=5432
DB_USER=<neon-user>
DB_PASS=<neon-password>
DB_NAME=<neon-db>

# JWT — generá con: openssl rand -hex 64
JWT_SECRET=<secret-largo-y-aleatorio>

# URL del frontend en Vercel (la obtenés en el Paso 3)
FRONTEND_URL=https://tu-app.vercel.app

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASS=tu-app-password
```

5. Railway expone una URL pública automáticamente (ej: `https://mi-casa-backend.up.railway.app`)
6. Copiá esa URL — la usás en el Paso 3

> **Nota SSL con Neon:** En producción Neon requiere SSL. Asegurate de tener `ssl: { rejectUnauthorized: false }` en la config TypeORM cuando `NODE_ENV=production`.

---

## Paso 3 — Frontend en Vercel

1. Creá cuenta en [vercel.com](https://vercel.com) (vinculá con GitHub)
2. **Add New Project → Import** → seleccioná este repositorio
3. Configurá:
   - **Framework Preset**: Next.js (detectado automáticamente)
   - **Root Directory**: `finanzas-app/frontend`
4. En **Environment Variables** agregá:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app/api/v1
```

5. Click en **Deploy**
6. Copiá la URL de producción (ej: `https://mi-casa.vercel.app`)
7. Volvé a Railway → actualizá `FRONTEND_URL` con esta URL y redesplegá

---

## Paso 4 — Seed inicial

Para crear roles y usuario admin inicial:

```bash
# En Railway → tu servicio → Shell
SEED=true node dist/main.js
```

O agregá temporalmente `SEED=true` a las variables de Railway, desplegá, luego removela.

---

## Desarrollo local

### Prerequisitos
- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
# Clonar
git clone <repo-url>
cd finanzas-app

# Backend
cd backend
cp .env.example .env      # completar variables
npm install
npm run start:dev

# Frontend (otra terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/docs`

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NODE_ENV` | Si | `development` o `production` |
| `PORT` | Si | Puerto del servidor (default: 3001) |
| `DB_HOST` | Si | Host PostgreSQL |
| `DB_PORT` | Si | Puerto (default: 5432) |
| `DB_USER` | Si | Usuario PostgreSQL |
| `DB_PASS` | Si | Contraseña PostgreSQL |
| `DB_NAME` | Si | Nombre de la base de datos |
| `JWT_SECRET` | Si | Secret JWT (min 32 chars) |
| `FRONTEND_URL` | Si | URL frontend para CORS |
| `SEED` | No | `true` para ejecutar seed |
| `SMTP_HOST` | No | Servidor SMTP |
| `SMTP_PORT` | No | Puerto SMTP |
| `SMTP_USER` | No | Email remitente |
| `SMTP_PASS` | No | App password SMTP |

### Frontend (`frontend/.env.local`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | Si | URL base del backend (`/api/v1`) |

---

## Estructura del proyecto

```
finanzas-app/
├── backend/
│   └── src/
│       ├── auth/               # JWT auth + guards + estrategias
│       ├── budget/             # Presupuesto con categorías e ingresos
│       ├── transactions/       # Transacciones
│       ├── credit-cards/       # Tarjetas de crédito
│       ├── loans/              # Creditos y préstamos
│       ├── savings-goals/      # Metas de ahorro
│       ├── net-worth/          # Patrimonio neto
│       ├── debts/              # Deudas
│       ├── purchases/          # Lista de compras
│       ├── household-expenses/ # Gastos del hogar
│       ├── emergency-fund/     # Fondo de emergencia
│       └── notifications/      # Sistema de notificaciones
└── frontend/
    └── src/
        ├── pages/              # Rutas Next.js
        ├── components/         # Componentes reutilizables
        ├── services/           # Clientes de API (axios)
        ├── store/              # Estado global (Zustand)
        └── lib/                # Utilidades compartidas
```

---

## Funcionalidades principales

- Presupuesto mensual con categorías, períodos flexibles y gastos hormiga
- Registro de transacciones con termómetro vs presupuesto
- Seguimiento de tarjetas de crédito (saldo, límite, fechas)
- Créditos y préstamos con progreso de amortización
- Metas de ahorro con proyección temporal
- Patrimonio neto (activos vs pasivos) en tiempo real
- Dashboard de deudas con balance neto
- Simulador de préstamos con tabla de cuotas
- Lista de compras mensual
- Registro de gastos fijos del hogar
- Fondo de emergencia con meta y seguimiento
- Multi-hogar: un usuario puede pertenecer a varios hogares
- RBAC: roles de administrador global y de hogar
