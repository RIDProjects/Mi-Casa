import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
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
  @Column({ nullable: true, name: 'active_house_id' }) activeHouseId: string;
  @ManyToMany(() => Role, { eager: true }) @JoinTable({ name: 'user_roles' }) roles: Role[];
  @ManyToMany(() => House, house => house.members)
  @JoinTable({
    name: 'user_houses',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'house_id', referencedColumnName: 'id' },
  })
  houses: House[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
