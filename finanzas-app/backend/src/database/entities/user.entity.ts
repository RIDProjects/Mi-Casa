import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { House } from './house.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  @Column({ select: false }) password: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) whatsappNumber: string;
  @ManyToMany(() => Role, { eager: true }) @JoinTable({ name: 'user_roles' }) roles: Role[];
  @ManyToOne(() => House, house => house.members, { nullable: true }) @JoinColumn({ name: 'house_id' }) house: House;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
