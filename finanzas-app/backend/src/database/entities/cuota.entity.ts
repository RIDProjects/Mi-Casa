import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { House } from './house.entity';

@Entity('cuotas')
export class Cuota {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() description: string;

  @Column('decimal', { precision: 12, scale: 2 }) totalAmount: number;

  @Column() totalInstallments: number;

  @Column() paidInstallments: number;

  @Column('decimal', { precision: 12, scale: 2 }) installmentAmount: number;

  @Column({ nullable: true }) store: string;

  @Column({ nullable: true }) cardLast4: string;

  @Column({ type: 'date' }) startDate: Date;

  @Column({ default: false }) withInterest: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0 }) interestRate: number;

  @Index()
  @ManyToOne(() => House)
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn() createdAt: Date;

  @UpdateDateColumn() updatedAt: Date;
}
