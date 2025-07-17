import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new SheetGroup
export const createSheetGroup = async (req, res) => {
  try {
    const { name, description, sheetIds } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can create sheet groups' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }


    // Check if a sheet group with the same name already exists
    const existingGroup = await prisma.sheetGroup.findFirst({
        where: { name }
      });
  
      if (existingGroup) {
        return res.status(400).json({error:true, message: 'A sheet group with this name already exists' });
      }



    if (!Array.isArray(sheetIds) || sheetIds.length === 0) {
      return res.status(400).json({ error: 'At least one sheet must be assigned to create a group' });
    }


    const sheetGroup = await prisma.sheetGroup.create({
      data: { name, description },
    });

    // Assign selected sheets to this group
    await prisma.sheet.updateMany({
      where: { id: { in: sheetIds } },
      data: { sheetGroupId: sheetGroup.id }
    });

    res.status(201).json({ data: sheetGroup, message: 'Sheet group created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating sheet group' });
  }
};

// Get all SheetGroups
export const getSheetGroups = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;
    if (userRole === 'SuperAdmin') {
      const sheetGroups = await prisma.sheetGroup.findMany({
        include: { sheets: true },
      });
      return res.json(sheetGroups);
    }
    // For regular users, find groups that have at least one sheet the user has access to
    const sheetGroups = await prisma.sheetGroup.findMany({
      where: {
        sheets: {
          some: {
            userSheets: {
              some: {
                userId: userId
              }
            }
          }
        }
      },
      include: {
        sheets: {
          where: {
            userSheets: {
              some: {
                userId: userId
              }
            }
          }
        }
      }
    });
    res.json(sheetGroups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheet groups' });
  }
};

// Get a single SheetGroup by ID
export const getSheetGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;
    if (userRole === 'SuperAdmin') {
      const sheetGroup = await prisma.sheetGroup.findUnique({
        where: { id: Number(id) },
        include: { sheets: true },
      });
      if (!sheetGroup) {
        return res.status(404).json({ error: 'Sheet group not found' });
      }
      return res.json(sheetGroup);
    }
    // For regular users, only return the group if it contains sheets the user can access
    const sheetGroup = await prisma.sheetGroup.findUnique({
      where: { id: Number(id) },
      include: {
        sheets: {
          where: {
            userSheets: {
              some: {
                userId: userId
              }
            }
          },
          include: {
            sheetData: true,
            userSheets: {
              include: {
                user: true,
                permissions: true
              }
            }
          }
        }
      }
    });
    if (!sheetGroup || !sheetGroup.sheets || sheetGroup.sheets.length === 0) {
      return res.status(404).json({ error: 'Sheet group not found or you do not have access' });
    }
    res.json(sheetGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheet group' });
  }
};

// Update a SheetGroup
export const updateSheetGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sheetIds } = req.body;
    const userRole = req.user.role;
    if (userRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can update sheet groups' });
    }
    const updatedSheetGroup = await prisma.sheetGroup.update({
      where: { id: Number(id) },
      data: { name, description },
    });
    // Remove all sheets from this group
    await prisma.sheet.updateMany({
      where: { sheetGroupId: Number(id) },
      data: { sheetGroupId: null }
    });
    // Add selected sheets to this group
    if (Array.isArray(sheetIds) && sheetIds.length > 0) {
      await prisma.sheet.updateMany({
        where: { id: { in: sheetIds } },
        data: { sheetGroupId: Number(id) }
      });
    }
    res.json({ data: updatedSheetGroup, message: 'Sheet group updated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating sheet group' });
  }
};

// Delete a SheetGroup
export const deleteSheetGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    if (userRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can delete sheet groups' });
    }
    // Optionally, handle deletion of related sheets if needed
    await prisma.sheetGroup.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Sheet group deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting sheet group' });
  }
};

export default {
  createSheetGroup,
  getSheetGroups,
  getSheetGroup,
  updateSheetGroup,
  deleteSheetGroup
}; 