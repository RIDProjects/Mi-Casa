import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { House } from './house.entity';

export enum TransactionType {
  FIXED_INCOME = 'ingreso_fijo',
  VARIABLE_INCOME = 'ingreso_variable',
  EXPENSE = 'gasto',
}

export enum PaymentMethod {
  CASH = 'efectivo',
  TRANSFER = 'transferencia',
  CARD = 'tarjeta',
}

export const EXPENSE_CATEGORIES = [
  'Casa',
  'Comida',
  'Familia',
  'Transporte',
  'Viajes',
  'Deudas',
  'Salud',
  'Suscripciones',
  'Cuidado Personal',
  'Otros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column()
  concept: string;

  /** Only relevant when type === 'gasto' */
  @Column({ nullable: true })
  category: string | null;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  /** Card name — only relevant when paymentMethod === 'tarjeta' */
  @Column({ nullable: true })
  cardName: string | null;

  /** ISO date string YYYY-MM-DD */
  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  notes: string | null;

  @Index()
  @ManyToOne(() => House, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn()
  createdAt: Date;
}
