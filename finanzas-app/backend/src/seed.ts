import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './database/entities/user.entity';
import { Role } from './database/entities/role.entity';
import { Permission, PermissionModule, PermissionAction } from './database/entities/permission.entity';

export async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepo = app.get(getRepositoryToken(User));
  const roleRepo = app.get(getRepositoryToken(Role));
  const permRepo = app.get(getRepositoryToken(Permission));

  // Create permissions for all modules and actions
  const modules = Object.values(PermissionModule);
  const actions = Object.values(PermissionAction);

  const permissions: Permission[] = [];
  for (const mod of modules) {
    for (const action of actions) {
      const existing = await permRepo.findOne({ where: { module: mod, action } });
      if (!existing) {
        const perm = permRepo.create({ module: mod, action, description: `${action} ${mod}` });
        permissions.push(await permRepo.save(perm));
      } else {
        permissions.push(existing);
      }
    }
  }

  // Create admin role with all permissions
  let adminRole = await roleRepo.findOne({ where: { name: 'admin' }, relations: ['permissions'] });
  if (!adminRole) {
    adminRole = roleRepo.create({ name: 'admin', description: 'Administrador del sistema', permissions });
    adminRole = await roleRepo.save(adminRole);
    console.log('✅ Admin role created');
  }

  // Create viewer role
  let viewerRole = await roleRepo.findOne({ where: { name: 'viewer' } });
  if (!viewerRole) {
    const viewPerms = permissions.filter(p => p.action === PermissionAction.VIEW);
    viewerRole = roleRepo.create({ name: 'viewer', description: 'Solo lectura', permissions: viewPerms });
    viewerRole = await roleRepo.save(viewerRole);
    console.log('✅ Viewer role created');
  }

  // Create admin user
  const adminExists = await userRepo.findOne({ where: { email: 'admin@finanzas.com' } });
  if (!adminExists) {
    const password = await bcrypt.hash('Admin123!', 12);
    const admin = userRepo.create({
      name: 'Administrador',
      email: 'admin@finanzas.com',
      password,
      roles: [adminRole],
      isActive: true,
    });
    await userRepo.save(admin);
    console.log('✅ Admin user created: admin@finanzas.com / Admin123!');
  }

  await app.close();
  console.log('🌱 Seed completed!');
}

seed().catch(console.error);