import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { PurchaseItem } from './purchase-item.entity';
import { User } from './user.entity';

@Entity('purchase_lists')
export class PurchaseList {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) budgetCUP: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) budgetUSD: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 515 }) exchangeRate: number;
  @OneToMany(() => PurchaseItem, item => item.list, { cascade: true, eager: true }) items: PurchaseItem[];
  @ManyToOne(() => User, { nullable: true }) createdBy: User;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}