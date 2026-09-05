# AGENTS.md - Mi Casa Pro (Finanzas App)

## Project Overview

This is a monorepo containing a personal finance management application:
- **Frontend**: Next.js 14 + React 18 + TypeScript + TailwindCSS
- **Backend**: NestJS + TypeORM + PostgreSQL + JWT Auth

---

## Build, Lint & Test Commands

### Frontend (finanzas-app/frontend)

```bash
# Development
npm run dev              # Start Next.js dev server on port 3000

# Production
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint            # Run Next.js ESLint
```

### Backend (finanzas-app/backend)

```bash
# Development
npm run start:dev       # Start with --watch (hot reload)

# Production
npm run build          # Compile TypeScript to dist/
npm run start          # Run compiled Node.js app

# Linting & Testing
npm run lint           # Run ESLint on src/ and test/
npm run test           # Run Jest test suite
npm run test -- --testPathPattern=<pattern>   # Run single test file
npm run test -- --testNamePattern=<name>      # Run tests matching name
```

---

## Code Style Guidelines

### TypeScript Configuration

- **Frontend tsconfig**: Loose mode (`strict: false`, `noImplicitAny: false`)
- **Backend tsconfig**: Loose mode (`strictNullChecks: false`, `noImplicitAny: false`)
- Always use explicit types when possible, even if strict mode is disabled

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | kebab-case | `inventory-item.tsx`, `debts.controller.ts` |
| Files (classes/utilities) | PascalCase | `AuthService.ts`, `useAuthStore.ts` |
| Variables & Functions | camelCase | `getDashboard()`, `hasPermission` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Interfaces/Types | PascalCase | `LoginDto`, `UserProfile` |
| CSS Classes | kebab-case | `text-gray-900`, `grid-cols-2` |

### Import Order

```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';

// 2. Internal modules (relative paths)
import Layout from '../components/layout/Layout';
import { debtsAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';

// 3. UI/components
import StatCard from '../components/ui/StatCard';
```

### React/Next.js Patterns

- **Pages**: Use Next.js Pages Router (`src/pages/*.tsx`)
- **Components**: Place reusable components in `src/components/ui/` and `src/components/layout/`
- **State**: Use Zustand for global state (`src/store/`)
- **Data Fetching**: Use React Query (`useQuery`, `useMutation`)
- **Forms**: Use React Hook Form
- **Styling**: TailwindCSS utility classes (no custom CSS files)

### NestJS Backend Patterns

- **Controllers**: Use Swagger decorators (`@ApiTags`, `@ApiOperation`)
- **DTOs**: Use class-validator for validation (`@IsString()`, `@IsNumber()`, etc.)
- **Services**: Business logic in services, injected into controllers
- **Guards**: Use JWT auth guards for protected routes

### Error Handling

- **Frontend**: Use `react-hot-toast` for user notifications
- **Backend**: Throw NestJS exceptions (`BadRequestException`, `UnauthorizedException`)
- Always validate inputs with class-validator DTOs

### General Guidelines

1. **No inline styles** - Use TailwindCSS utility classes
2. **No console.log in production** - Remove before committing
3. **Always handle loading/error states** - Show feedback during async operations
4. **Use descriptive variable names** - Avoid single letters except in loops
5. **Keep components small** - Extract logic into custom hooks when needed
6. **Use TypeScript interfaces** - Define shared types in appropriate locations

---

## Project Structure

```
finanzas-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # Layout, Sidebar
│   │   │   └── ui/         # StatCard, Modal, ConfirmDialog
│   │   ├── pages/          # Next.js pages (dashboard.tsx, login.tsx, etc.)
│   │   ├── services/       # API client functions
│   │   └── store/          # Zustand stores
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── auth/           # Auth module (controller, service, guards)
    │   ├── users/          # Users module
    │   ├── debts/          # Debts module
    │   ├── inventory/      # Inventory module
    │   ├── purchases/     # Purchases module
    │   └── ...
    └── package.json
```

---

## Environment Variables

Create `.env` files as needed (not committed to git):
- Frontend: `NEXT_PUBLIC_API_URL`
- Backend: Database credentials, JWT secret, etc.

---

## Common Tasks

### Run single test in backend
```bash
cd finanzas-app/backend
npm run test -- --testPathPattern=auth.service
```

### Add new API endpoint
1. Backend: Create/extend controller + service in appropriate module
2. Frontend: Add API function in `src/services/api.ts`
3. Frontend: Consume in component using React Query

### Add new page
1. Create file in `src/pages/` (e.g., `src/pages/new-feature.tsx`)
2. Import Layout component and build page
3. Add navigation link in Sidebar