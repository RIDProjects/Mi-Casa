import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

export enum DebtType { THEY_OWE_ME = 'they_owe_me', I_OWE = 'i_owe' }

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() personName: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ nullable: true }) note: string | null;
  @Column({ type: 'enum', enum: DebtType }) type: DebtType;
  @Column('decimal', { precision: 8, scale: 4, default: 0 })
  interestRate: number; // TNA %

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  minimumPayment: number | null;
  @Column({ default: false }) isPaid: boolean;
  @Column({ nullable: true }) paidAt: Date | null;
  @Index() @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
