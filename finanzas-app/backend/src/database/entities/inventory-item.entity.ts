import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { House } from './house.entity';

export enum InventoryLocation { NEVERA = 'nevera', FRIO = 'frio', ALACENA = 'alacena', VIANDERO = 'viandero', OTRO = 'otro' }
export enum InventoryStatus { OK = 'ok', LAST = 'last', OUT_OF_STOCK = 'out_of_stock' }

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'int', default: 0 }) quantity: number;
  @Column({ type: 'enum', enum: InventoryLocation, default: InventoryLocation.ALACENA }) location: InventoryLocation;
  @Column({ nullable: true }) notes: string | null;
  @Column({ default: false }) alertSent: boolean;
  @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  get status(): InventoryStatus {
    if (this.quantity === 0) return InventoryStatus.OUT_OF_STOCK;
    if (this.quantity === 1) return InventoryStatus.LAST;
    return InventoryStatus.OK;
  }
}
