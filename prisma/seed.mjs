import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client'; // Removed SheetPermissionType since not used

const prisma = new PrismaClient();

async function main() {
  // 🔄 Reset database
  await prisma.sheetPermission.deleteMany();
  await prisma.columnDropdown.deleteMany();
  await prisma.valueSet.deleteMany();
  await prisma.userSheet.deleteMany();
  await prisma.sheetData.deleteMany();
  await prisma.sheet.deleteMany();
  await prisma.user.deleteMany();

  // 🧑‍💼 Create Super Admin
  const hashedPassword = await bcrypt.hash('12345678', 10);
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'SuperAdmin',
    },
  });

  // 🌈 Seed ValueSet
  await prisma.valueSet.create({
    data: {
      name: "Status Options",
      values: ["Active", "Inactive", "Pending"],
    },
  });

  console.log('✅ Super Admin and ValueSet created without seeding any Sheet or SheetPermissions');
}

main()
  .catch((e) => {
    console.error('❌ Seeder error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });