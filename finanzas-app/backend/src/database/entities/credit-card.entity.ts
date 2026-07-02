import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

export enum CardPaymentType {
  FULL = 'full',
  MINIMUM = 'minimum',
  STOPPED = 'stopped',
  PARTIAL = 'partial',
}

@Entity('credit_cards')
export class CreditCard {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() bankName: string;
  @Column() cardName: string;
  @Column('decimal', { precision: 5, scale: 4, default: 0 }) annualRate: number;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) currentBalance: number;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) creditLimit: number;
  @Column({ nullable: true }) cutDate: string;
  @Column({ nullable: true }) paymentDate: string;
  @Column({ type: 'enum', enum: CardPaymentType, default: CardPaymentType.FULL }) paymentType: CardPaymentType;
  @Index() @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
