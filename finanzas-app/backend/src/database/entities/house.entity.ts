import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('houses')
export class House {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column() name: string;
  
  @Column() password: string;
  
  @CreateDateColumn() createdAt: Date;
  
  @OneToMany(() => User, user => user.house)
  members: User[];
}
