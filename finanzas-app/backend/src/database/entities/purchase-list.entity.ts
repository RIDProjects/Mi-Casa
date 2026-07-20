import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { PurchaseItem } from './purchase-item.entity';
import { House } from './house.entity';

@Entity('purchase_lists')
export class PurchaseList {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) budgetCUP: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) budgetUSD: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 515 }) exchangeRate: number;
  @OneToMany(() => PurchaseItem, item => item.list, { cascade: true, eager: true }) items: PurchaseItem[];
  @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
