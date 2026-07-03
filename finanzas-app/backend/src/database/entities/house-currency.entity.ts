import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { House } from './house.entity';

@Entity('house_currencies')
export class HouseCurrency {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() currencyCode: string;   // 'USD', 'EUR', 'CUP', 'MLC', 'ARS', 'MXN', etc.
  @Column() currencyName: string;   // 'Dólar estadounidense', 'Euro', 'Peso Cubano'
  @Column() symbol: string;         // '$', '€', 'CUP$', 'MLC$'
  @Column({ default: 'en-US' }) locale: string; // for Intl.NumberFormat

  @Column({ default: false }) isBase: boolean;   // exactly ONE per house is base
  @Column({ default: true }) isActive: boolean;

  @Index()
  @ManyToOne(() => House, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn() createdAt: Date;
}
