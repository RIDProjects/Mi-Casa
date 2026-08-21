import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() module: string;
  @Column() action: string;
  @Column({ nullable: true }) description: string | null;
}

export enum PermissionAction { VIEW = 'view', CREATE = 'create', EDIT = 'edit', DELETE = 'delete' }
export enum PermissionModule {
  USERS = 'users', ROLES = 'roles', DEBTS = 'debts',
  PURCHASES = 'purchases', EMERGENCY_FUND = 'emergency_fund',
}