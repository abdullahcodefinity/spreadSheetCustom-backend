import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: true, 
        message: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: true, 
        message: 'User with this email already exists' 
      });
    }

    const hash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: 'User' // Default role for new users
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ 
      error: false,
      message: 'User created successfully', 
      data: user 
    });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error creating user' 
    });
  }
}