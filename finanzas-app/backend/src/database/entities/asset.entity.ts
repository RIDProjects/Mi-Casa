import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { House } from './house.entity';

export enum AssetType {
  PHYSICAL = 'physical',
  CASH = 'cash',
}

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) value: number;
  @Column({ type: 'enum', enum: AssetType, default: AssetType.PHYSICAL }) assetType: AssetType;
  @Column({ nullable: true }) notes: string;
  @Index() @ManyToOne(() => House, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
