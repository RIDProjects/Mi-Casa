import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { House } from './house.entity';
import { User } from './user.entity';

export type HouseInvitationStatus = 'pending' | 'accepted' | 'expired';

@Entity('house_invitations')
export class HouseInvitation {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() email: string;

  @Column({ default: 'user' }) role: string;

  @Column({ unique: true }) token: string;

  @Column({ default: 'pending' }) status: HouseInvitationStatus;

  @Column({ type: 'timestamp', name: 'expires_at' }) expiresAt: Date;

  @ManyToOne(() => House, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'house_id' })
  house: House;

  @Column({ name: 'house_id' }) houseId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User | null;

  @Column({ name: 'invited_by_id', nullable: true }) invitedById: string | null;

  @CreateDateColumn() createdAt: Date;
}
