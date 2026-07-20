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

@Entity('recurring_transactions')
export class RecurringTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ nullable: true })
  category: string | null;

  @Column({ type: 'int', default: 1 })
  dayOfMonth: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  lastGeneratedAt: string | null;

  @Index()
  @ManyToOne(() => House, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
