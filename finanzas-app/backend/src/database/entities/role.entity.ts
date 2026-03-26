import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ nullable: true }) description: string;
  @ManyToMany(() => Permission, { eager: true }) @JoinTable({ name: 'role_permissions' }) permissions: Permission[];
}