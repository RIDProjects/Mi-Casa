import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() loanType: string;
  @Column() institution: string;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) initialDebt: number;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) currentDebt: number;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) monthlyPayment: number;
  @Column({ nullable: true }) notes: string;
  @Index() @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
