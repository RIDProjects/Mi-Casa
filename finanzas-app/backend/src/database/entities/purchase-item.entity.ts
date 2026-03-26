import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { PurchaseList } from './purchase-list.entity';

export enum PurchaseStatus { PENDING = 'pending', PURCHASED = 'purchased', CANCELLED = 'cancelled' }

@Entity('purchase_items')
export class PurchaseItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) quantity: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) unitPrice: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) realPriceCUP: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) realPriceUSD: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) plannedPriceCUP: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) plannedPriceUSD: number;
  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.PENDING }) status: PurchaseStatus;
  @ManyToOne(() => PurchaseList, list => list.items, { onDelete: 'CASCADE' }) list: PurchaseList;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}