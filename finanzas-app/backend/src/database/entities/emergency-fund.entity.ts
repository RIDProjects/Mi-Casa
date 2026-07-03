import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

@Entity('emergency_funds')
export class EmergencyFund {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'int', default: 6 }) targetMonths: number;
  @Column({ type: 'int', default: 3 }) minimumMonths: number;
  @Column({ type: 'int', default: 24 }) savingPeriodMonths: number;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) currentBalance: number;
  @OneToMany(() => ExpenseCategory, cat => cat.fund, { cascade: true, eager: true }) categories: ExpenseCategory[];
  @Index() @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) monthlyAmount: number;
  @Column({ default: 0 }) sortOrder: number;
  @ManyToOne(() => EmergencyFund, fund => fund.categories, { onDelete: 'CASCADE' }) fund: EmergencyFund;
}
