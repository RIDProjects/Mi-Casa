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

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() fromCurrency: string;
  @Column() toCurrency: string;
  @Column('decimal', { precision: 15, scale: 4 }) rate: number;
  @Column({ type: 'date' }) date: string;
  @Column({ nullable: true }) source: string;
  @Column({ default: 'oficial' }) rateType: string; // 'oficial' | 'informal' | 'cadeca'
  @CreateDateColumn() createdAt: Date;

  @Index()
  @ManyToOne(() => House, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;
}
