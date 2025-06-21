import bcrypt from 'bcrypt'

import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
  // Reset database
  await prisma.userPermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.userSheet.deleteMany();
  await prisma.sheetData.deleteMany();
  await prisma.sheet.deleteMany();
  await prisma.user.deleteMany();

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('12345678', 10);
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'SuperAdmin',
    },
  });

  // Permissions
  const permissions = [
    { action: 'manage', subject: 'all' },
    { action: 'create', subject: 'sheet' },
    { action: 'read', subject: 'sheet' },
    { action: 'update', subject: 'sheet' },
    { action: 'delete', subject: 'sheet' },
    { action: 'create', subject: 'sheetData' },
    { action: 'update', subject: 'sheetData' },
    { action: 'delete', subject: 'sheetData' },
    { action: 'read', subject: 'sheetData' },
    { action: 'manage', subject: 'user' },
  ];

  for (const perm of permissions) {
    const permission = await prisma.permission.create({
      data: perm,
    });

    await prisma.userPermission.create({
      data: {
        userId: superAdmin.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`🌱 Super Admin seeded with ${permissions.length} permissions`);
}

main()
  .catch((e) => {
    console.error('❌ Seeder error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });