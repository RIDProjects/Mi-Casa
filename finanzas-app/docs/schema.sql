-- FinanzasApp Database Schema
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PERMISSIONS
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    description VARCHAR(200),
    UNIQUE(module, action)
);

-- ROLES
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200)
);

-- ROLE_PERMISSIONS
CREATE TABLE public.role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- USERS
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    whatsapp_number VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- USER_ROLES
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- DEBTS
CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_name VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    note TEXT,
    type VARCHAR(20) CHECK (type IN ('they_owe_me','i_owe')) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PURCHASE_LISTS
CREATE TABLE public.purchase_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    budget_cup DECIMAL(12,2) DEFAULT 0,
    budget_usd DECIMAL(12,2) DEFAULT 0,
    exchange_rate DECIMAL(10,2) DEFAULT 515,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PURCHASE_ITEMS
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES purchase_lists(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(12,2) DEFAULT 0,
    real_price_cup DECIMAL(12,2) DEFAULT 0,
    real_price_usd DECIMAL(12,2) DEFAULT 0,
    planned_price_cup DECIMAL(12,2) DEFAULT 0,
    planned_price_usd DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','purchased','cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- INVENTORY_ITEMS
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    quantity INTEGER DEFAULT 0,
    location VARCHAR(20) DEFAULT 'alacena' CHECK (location IN ('nevera','frio','alacena','viandero','otro')),
    notes TEXT,
    alert_sent BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EMERGENCY_FUNDS
CREATE TABLE public.emergency_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    target_months INTEGER DEFAULT 6,
    minimum_months INTEGER DEFAULT 3,
    saving_period_months INTEGER DEFAULT 24,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EXPENSE_CATEGORIES
CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES emergency_funds(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    monthly_amount DECIMAL(12,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- Seed permissions
INSERT INTO public.permissions (module, action, description) VALUES
  ('users','view','Ver usuarios'),('users','create','Crear usuarios'),
  ('users','edit','Editar usuarios'),('users','delete','Eliminar usuarios'),
  ('roles','view','Ver roles'),('roles','create','Crear roles'),
  ('roles','edit','Editar roles'),('roles','delete','Eliminar roles'),
  ('debts','view','Ver deudas'),('debts','create','Crear deudas'),
  ('debts','edit','Editar deudas'),('debts','delete','Eliminar deudas'),
  ('purchases','view','Ver compras'),('purchases','create','Crear compras'),
  ('purchases','edit','Editar compras'),('purchases','delete','Eliminar compras'),
  ('inventory','view','Ver inventario'),('inventory','create','Crear inventario'),
  ('inventory','edit','Editar inventario'),('inventory','delete','Eliminar inventario'),
  ('emergency_fund','view','Ver fondo'),('emergency_fund','create','Crear fondo'),
  ('emergency_fund','edit','Editar fondo'),('emergency_fund','delete','Eliminar fondo');
