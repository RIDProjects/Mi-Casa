# 💰 FinanzasApp

Sistema web modular de gestión financiera personal con panel de administración, RBAC, y notificaciones WhatsApp.

## 🏗️ Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | NestJS (Node.js) + TypeScript |
| Base de datos | PostgreSQL 15 |
| Auth | JWT + Passport |
| Permisos | RBAC (Role-Based Access Control) |
| Notificaciones | Twilio / Meta WhatsApp API |
| Contenedores | Docker + Docker Compose |

## 📦 Módulos

- 🔐 **Admin Panel** — Gestión de usuarios, roles y permisos por módulo
- 💸 **Deudas** — "Me deben" / "Debo", balance automático, historial de pagos
- 🛒 **Compras** — Listas con presupuesto CUP/USD, cálculos automáticos, estado de productos
- 📦 **Inventario** — Por ubicación (nevera, frío, alacena, viandero), alertas WhatsApp en stock=1
- 💰 **Fondo de Emergencia** — Cálculo de fondo mínimo/óptimo y ahorro mensual requerido

## 🚀 Inicio Rápido

### Opción 1: Docker Compose (recomendado)

```bash
git clone <repo>
cd finanzas-app

# Copiar variables de entorno
cp backend/.env backend/.env

# Levantar todo
docker-compose up -d

# Ejecutar seed (primer arranque)
docker-compose exec backend node dist/seed
```

Acceder a:
- 🌐 Frontend: http://localhost:3000
- 📚 API Docs (Swagger): http://localhost:3001/api/docs
- 🗃️ PostgreSQL: localhost:5432

### Opción 2: Desarrollo local

#### Pre-requisitos
- Node.js 20+
- PostgreSQL 15+

#### Backend

```bash
cd backend
npm install

# Configurar .env
cp .env .env
# Editar: DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET

# Iniciar en dev (con auto-reload)
npm run start:dev

# En otra terminal: ejecutar el seed
npx ts-node src/seed.ts
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔑 Credenciales por defecto

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin@finanzas.com | Admin123! | admin |

## 🔔 Configurar WhatsApp

### Opción A: Twilio (más fácil de probar)
1. Crear cuenta en https://www.twilio.com
2. Activar WhatsApp Sandbox
3. Agregar en `backend/.env`:
```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```
4. Agregar número WhatsApp de los usuarios en el panel de Usuarios

### Opción B: Meta WhatsApp Business API
```env
WHATSAPP_PROVIDER=meta
META_WHATSAPP_TOKEN=your_token
META_PHONE_NUMBER_ID=your_phone_id
```

La alerta se dispara automáticamente cuando la cantidad de un producto = 1.

## 📐 Arquitectura

```
finanzas-app/
├── backend/                    # NestJS API
│   └── src/
│       ├── auth/               # JWT Auth
│       ├── users/              # CRUD Usuarios
│       ├── roles/              # CRUD Roles + Permisos
│       ├── debts/              # Módulo Deudas
│       ├── purchases/          # Módulo Compras
│       ├── inventory/          # Módulo Inventario
│       ├── emergency-fund/     # Módulo Fondo Emergencia
│       ├── notifications/      # WhatsApp Service
│       ├── common/             # Guards, decorators, filters
│       └── database/entities/  # TypeORM entities
│
├── frontend/                   # Next.js App
│   └── src/
│       ├── pages/              # Rutas (Next.js file-based routing)
│       │   ├── admin/users.tsx
│       │   ├── admin/roles.tsx
│       │   ├── debts.tsx
│       │   ├── inventory.tsx
│       │   ├── purchases.tsx
│       │   └── emergency-fund.tsx
│       ├── components/         # Layout + UI components
│       ├── services/api.ts     # Axios API client
│       └── store/auth.store.ts # Zustand auth state
│
├── docs/schema.sql             # Schema SQL de referencia
└── docker-compose.yml
```

## 🧮 Lógica de negocio (replicada de Excel)

### Deudas
- `balance = totalTheyOweMe - totalIOwe`

### Inventario
- `status = qty === 0 ? 'Sin stock' : qty === 1 ? 'Último' : 'OK'`
- Alert WhatsApp cuando `qty === 1 && !alertSent`

### Compras
- `realPriceCUP = cantidad × precioUnitario`
- `realPriceUSD = realPriceCUP / tasaCambio`
- `diferencia = totalReal - totalPlan`
- `restante = presupuesto - totalReal`
- Estado: Justo / Ajustado / Excedido

### Fondo de Emergencia
- `montoÓptimo = gastosMensuales × mesesObjetivo`
- `montoMínimo = gastosMensuales × mesesMínimo`
- `ahorroMensual = montoMínimo / periodoDeMeses`

## 🔮 Roadmap / Próximas funciones

- [ ] Reportes PDF exportables
- [ ] Gráficas históricas de deudas
- [ ] Multi-tenant (SaaS)
- [ ] App móvil (React Native)
- [ ] Importar desde Excel directamente
- [ ] Notificaciones push web
