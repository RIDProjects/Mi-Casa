import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { House } from './house.entity';

export enum Periodicity {
  DAILY        = 'daily',
  WEEKLY       = 'weekly',
  BIWEEKLY     = 'biweekly',
  MONTHLY      = 'monthly',
  BIMONTHLY    = 'bimonthly',
  QUARTERLY    = 'quarterly',
  FOURMONTHLY  = 'fourmonthly',
  SEMIANNUAL   = 'semiannual',
  ANNUAL       = 'annual',
}

@Entity('budget_expenses')
export class BudgetExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'enum', enum: Periodicity, default: Periodicity.MONTHLY })
  periodicity: Periodicity;

  @Column({ default: false })
  isFixed: boolean;

  @Column({ default: false })
  isCreditCard: boolean;

  @Column({ default: false })
  isAntExpense: boolean;

  @Index()
  @ManyToOne('BudgetCategory', 'expenses', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: any;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('budget_categories')
export class BudgetCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: false })
  isDefault: boolean;

  @Index()
  @ManyToOne('Budget', 'categories', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: any;

  @OneToMany(() => BudgetExpense, (exp) => exp.category, {
    cascade: true,
    eager: true,
  })
  expenses: BudgetExpense[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('income_sources')
export class IncomeSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 'fixed' })
  type: string; // 'fixed' | 'variable'

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amount: number;

  @Index()
  @ManyToOne('Budget', 'incomeSources', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: any;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'Mi Presupuesto' })
  name: string;

  @Column({ nullable: true })
  year: number;

  @Column('decimal', { precision: 5, scale: 2, default: 20 })
  savingsTargetPercent: number;

  @Index()
  @ManyToOne(() => House, { nullable: true })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @OneToMany('IncomeSource', 'budget', { cascade: true, eager: true })
  incomeSources: IncomeSource[];

  @OneToMany('BudgetCategory', 'budget', { cascade: true, eager: true })
  categories: BudgetCategory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
