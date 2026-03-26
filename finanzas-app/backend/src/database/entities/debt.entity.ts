import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

export enum DebtType { THEY_OWE_ME = 'they_owe_me', I_OWE = 'i_owe' }

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() personName: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ nullable: true }) note: string;
  @Column({ type: 'enum', enum: DebtType }) type: DebtType;
  @Column({ default: false }) isPaid: boolean;
  @Column({ nullable: true }) paidAt: Date;
  @ManyToOne(() => User, { nullable: true, eager: true }) createdBy: User;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}