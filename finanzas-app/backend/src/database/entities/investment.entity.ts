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

export enum InvestmentType {
  PLAZO_FIJO = 'plazo_fijo',
  FCI = 'fci',
  ACCIONES = 'acciones',
  CRYPTO = 'crypto',
  DOLAR = 'dolar',
  PROPIEDADES = 'propiedades',
  OTROS = 'otros',
}

export enum Currency {
  ARS = 'ARS',
  USD = 'USD',
  CUP = 'CUP',
}

@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: InvestmentType, default: InvestmentType.OTROS }) type: InvestmentType;
  @Column('decimal', { precision: 15, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: Currency, default: Currency.ARS }) currency: Currency;
  @Column('decimal', { precision: 8, scale: 4, default: 0 }) annualRate: number;
  @Column({ type: 'date', nullable: true }) startDate: string | null;
  @Column({ type: 'date', nullable: true }) endDate: string | null;
  @Column({ nullable: true }) notes: string | null;
  @Column({ default: true }) isActive: boolean;

  @Index()
  @ManyToOne(() => House, { nullable: false })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
