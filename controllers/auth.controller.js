import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'User' // Default role for new users
      }
    });

    res.json({ message: 'User created', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating user' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during login' });
  }
};

export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: true, message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: true, message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role || 'User',
        password: hashedPassword
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User created successfully',
      error: false,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Error creating user' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    // If current user is not a super admin, exclude super admins from results
    const whereClause = currentUserRole === 'SuperAdmin' 
      ? { id: { not: currentUserId } } // Only exclude current user for super admin
      : { 
          id: { not: currentUserId },
          role: { not: 'SuperAdmin' } // Exclude both current user and super admins
        };

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        userSheets: {
          include: {
            sheet: {
              select: {
                id: true,
                name: true,
                columns: true
              }
            },
            permissions: true,
            columnLocks: true // Include column permissions
          }
        }
      }
    });

    // Remove password from each user object and format response
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        sheets: user.userSheets.map(us => ({
          sheetId: us.sheet.id,
          sheetName: us.sheet.name,
          permissions: us.permissions.map(p => p.type),
          frozenColumns: us.columnLocks.map(cl => cl.columnName) // Add frozen columns
        }))
      };
    });

    res.json({
      error: false,
      users: usersWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Error fetching users' });
  }
};

export const getAllUserEmails = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    res.json({
      error: false,
      emails: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Error fetching user emails' });
  }
};
// Add update user function
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    // Validate input
    if (!name && !email && !role && !password) {
      return res.status(400).json({ error: true, message: 'At least one field to update is required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    // If email is being updated, check if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({ error: true, message: 'Email already in use' });
      }
    }

    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && { role })
    };

    // If password is provided, hash it before updating
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'User updated successfully',
      error: false,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Error updating user' });
  }
};

// Add delete user function
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        error: true, 
        message: 'Only SuperAdmin can delete users' 
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ 
        error: true, 
        message: 'User not found' 
      });
    }

    // Delete user and all related records in a transaction
    await prisma.$transaction([
      // Delete column permissions for this user
      prisma.columnPermission.deleteMany({
        where: {
          userSheet: {
            userId: parseInt(id)
          }
        }
      }),
      
      // Delete sheet permissions for this user
      prisma.sheetPermission.deleteMany({
        where: {
          userSheet: {
            userId: parseInt(id)
          }
        }
      }),
      
      // Delete userSheet relationships
      prisma.userSheet.deleteMany({
        where: { userId: parseInt(id) }
      }),
      
      // Finally delete the user
      prisma.user.delete({
        where: { id: parseInt(id) }
      })
    ]);

    res.json({
      message: 'User deleted successfully', 
      error: false
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: true, 
      message: 'Error deleting user' 
    });
  }
};
export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ 
        error: true, 
        message: 'User not found' 
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      error: false,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Error fetching user' });
  }
};