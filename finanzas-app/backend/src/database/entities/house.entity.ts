import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('houses')
export class House {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() name: string;

  @Column({ select: false }) password: string;

  /** Keep USD/EUR → CUP rates in sync with elToque (daily job). */
  @Column({ default: true }) autoExchangeRates: boolean;

  @CreateDateColumn() createdAt: Date;

  @ManyToMany(() => User, user => user.houses)
  members: User[];
}
