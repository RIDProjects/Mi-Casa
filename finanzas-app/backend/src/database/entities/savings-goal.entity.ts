import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

@Entity('savings_goals')
export class SavingsGoal {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) goalAmount: number;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) currentSavings: number;
  @Column({ default: 12 }) months: number;
  @Column('decimal', { precision: 5, scale: 4, default: 0 }) annualInterestRate: number;
  @Column({ nullable: true }) emoji: string;
  @Index() @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
