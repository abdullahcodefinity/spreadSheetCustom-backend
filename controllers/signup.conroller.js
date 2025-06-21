import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';

export async function signup(req, res) {
  const { name, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      permissions: {
        create: [
          { permission: { connect: { action: 'read', subject: 'Sheet' } } },
          { permission: { connect: { action: 'create', subject: 'Sheet' } } },
        ],
      },
    },
  });

  res.json({ message: 'User created', user })}