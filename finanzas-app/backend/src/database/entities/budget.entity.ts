import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { House } from './house.entity';

export enum Periodicity {
  MONTHLY = 'monthly',
  BIMONTHLY = 'bimonthly',
  QUARTERLY = 'quarterly',
  SEMIANNUAL = 'semiannual',
  ANNUAL = 'annual',
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
