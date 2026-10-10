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
@Index('IDX_exchange_rates_house_pair_date', ['house', 'fromCurrency', 'toCurrency', 'date'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() fromCurrency: string;
  @Column() toCurrency: string;
  @Column('decimal', { precision: 15, scale: 4 }) rate: number;
  @Column({ type: 'date' }) date: string;
  @Column({ nullable: true }) source: string | null;
  @Column({ default: 'oficial' }) rateType: string; // 'oficial' | 'informal' | 'cadeca'

  @ManyToOne(() => House, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn() createdAt: Date;
}
