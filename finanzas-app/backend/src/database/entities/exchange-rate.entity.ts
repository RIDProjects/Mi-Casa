import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() fromCurrency: string;
  @Column() toCurrency: string;
  @Column('decimal', { precision: 15, scale: 4 }) rate: number;
  @Column({ type: 'date' }) date: string;
  @Column({ nullable: true }) source: string;
  @CreateDateColumn() createdAt: Date;
}
