import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

export enum HouseholdCategory {
  COMIDA      = 'Comida',
  TRANSPORTE  = 'Transporte',
  HOGAR       = 'Hogar',
  SALUD       = 'Salud',
  OCIO        = 'Ocio',
  SALIDAS     = 'Salidas',
  SHOPPER     = 'Shopper',
  OTROS       = 'Otros',
}

@Entity('household_expenses')
export class HouseholdExpense {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index()
  @Column({ type: 'date' }) date: string;
  @Column() description: string;
  @Column({ type: 'enum', enum: HouseholdCategory, default: HouseholdCategory.OTROS }) category: HouseholdCategory;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) amountCUP: number;
  @Column({ nullable: true }) place: string;
  @Index()
  @Column() month: string;
  @Index() @ManyToOne(() => House, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
