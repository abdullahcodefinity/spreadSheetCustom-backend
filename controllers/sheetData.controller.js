import { PrismaClient } from '@prisma/client';
import { checkSheetPermission } from '../lib/ability.js';

const prisma = new PrismaClient();

// Create a new row in a sheet
export const createSheetRow = async (req, res) => {
  try {
    const { spreadsheetId, position, row } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!spreadsheetId || !Array.isArray(row)) {
      return res.status(400).json({ error: 'spreadsheetId and row array are required.' });
    }

    // Check if user has access to this sheet
    if (userRole !== 'SuperAdmin') {
      const hasAccess = await checkSheetPermission(prisma, userId, parseInt(spreadsheetId), 'addRow');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to add rows to this sheet.' });
      }
    }

    // Fetch the target sheet
    const sheet = await prisma.sheet.findUnique({
      where: { id: parseInt(spreadsheetId) }
    });

    if (!sheet) return res.status(404).json({ error: 'Sheet not found.' });

    // Validate row length matches column length
    if (sheet.columns.length !== row.length) {
      return res.status(400).json({
        error: `Row must have exactly ${sheet.columns.length} values to match the columns.`
      });
    }

    // Get all existing rows
    const existingRows = await prisma.sheetData.findMany({
      where: {
        spreadsheetId: parseInt(spreadsheetId)
      },
      orderBy: {
        position: 'asc'
      }
    });

    // Determine position if not provided
    let finalPosition = position;
    if (typeof position !== 'number') {
      finalPosition = existingRows.length;
    }

    // If position already exists, shift all rows after it
    if (existingRows.some(row => row.position === finalPosition)) {
      // Shift rows one by one in descending order to avoid unique constraint violation
      const rowsToShift = existingRows
        .filter(r => r.position >= finalPosition)
        .sort((a, b) => b.position - a.position); // Descending order

      for (const rowToShift of rowsToShift) {
        await prisma.sheetData.update({
          where: { id: rowToShift.id },
          data: { position: rowToShift.position + 1 }
        });
      }
    }

    const newRow = await prisma.sheetData.create({
      data: {
        position: finalPosition,
        row,
        sheet: {
          connect: {
            id: parseInt(spreadsheetId)
          }
        }
      }
    });

    res.status(201).json(newRow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all rows for a sheet
export const getSheetRows = async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user has access to this sheet
    if (userRole !== 'SuperAdmin') {
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: parseInt(spreadsheetId)
        }
      });
      
      if (!userSheet) {
        return res.status(403).json({ error: 'You do not have access to this sheet.' });
      }
    }

    const rows = await prisma.sheetData.findMany({
      where: {
        spreadsheetId: parseInt(spreadsheetId)
      },
      orderBy: { position: 'asc' }
    });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a row by position
export const updateSheetRowByPosition = async (req, res) => {
  try {
    const { spreadsheetId, position } = req.params;
    const { row } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!Array.isArray(row)) {
      return res.status(400).json({ error: 'Row data must be an array.' });
    }

    // Check if user has access to this sheet
    if (userRole !== 'SuperAdmin') {
      const hasAccess = await checkSheetPermission(prisma, userId, parseInt(spreadsheetId), 'updateRow');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to update rows in this sheet.' });
      }
    }

    // First check if the row exists with given position
    const existingRow = await prisma.sheetData.findFirst({
      where: {
        spreadsheetId: parseInt(spreadsheetId),
        position: parseInt(position)
      }
    });

    console.log(existingRow, 'EXISTING::::');

    if (!existingRow) {
      return res.status(404).json({ error: 'Row not found at the specified position' });
    }

    // Get the sheet to validate row length
    const sheet = await prisma.sheet.findUnique({
      where: { id: parseInt(spreadsheetId) }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    // Validate row length matches column length
    if (sheet.columns.length !== row.length) {
      return res.status(400).json({
        error: `Row must have exactly ${sheet.columns.length} values to match the columns.`
      });
    }

    const updatedRow = await prisma.sheetData.update({
      where: { id: existingRow.id },
      data: { row }
    });

    res.json(updatedRow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Move a row to a new position
export const moveSheetRow = async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const { sourceIndex, targetIndex } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user has access to this sheet
    if (userRole !== 'SuperAdmin') {
      const hasAccess = await checkSheetPermission(prisma, userId, parseInt(spreadsheetId), 'updateRow');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to move rows in this sheet.' });
      }
    }

    // Validate indices
    if (sourceIndex < 0 || targetIndex < 0) {
      return res.status(400).json({ error: 'Source and target indices must be non-negative' });
    }

    // Find the row to move
    const sourceRow = await prisma.sheetData.findFirst({
      where: {
        spreadsheetId: parseInt(spreadsheetId),
        position: sourceIndex
      }
    });

    if (!sourceRow) {
      return res.status(404).json({ error: 'Source row not found' });
    }

    // Get all rows ordered by position
    const allRows = await prisma.sheetData.findMany({
      where: {
        spreadsheetId: parseInt(spreadsheetId)
      },
      orderBy: {
        position: 'asc'
      }
    });

    if (targetIndex >= allRows.length) {
      return res.status(400).json({ error: 'Target index exceeds number of rows' });
    }

    // Update positions in transaction
    const updatedRows = await prisma.$transaction(async (tx) => {
      // First move source row to a temporary position to avoid unique constraint conflicts
      await tx.sheetData.update({
        where: { id: sourceRow.id },
        data: { position: -1 } // Temporary position
      });

      // Shift rows between source and target
      if (sourceIndex < targetIndex) {
        // Moving down
        for (let i = sourceIndex + 1; i <= targetIndex; i++) {
          const rowToUpdate = allRows.find(row => row.position === i);
          if (rowToUpdate) {
            await tx.sheetData.update({
              where: { id: rowToUpdate.id },
              data: { position: i - 1 }
            });
          }
        }
      } else {
        // Moving up
        for (let i = sourceIndex - 1; i >= targetIndex; i--) {
          const rowToUpdate = allRows.find(row => row.position === i);
          if (rowToUpdate) {
            await tx.sheetData.update({
              where: { id: rowToUpdate.id },
              data: { position: i + 1 }
            });
          }
        }
      }

      // Finally move source row to target position
      const movedRow = await tx.sheetData.update({
        where: { id: sourceRow.id },
        data: { position: targetIndex }
      });

      return movedRow;
    });

    res.json(updatedRows);
  } catch (error) {
    console.error('Error moving row:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a row by position
export const deleteSheetRow = async (req, res) => {
  try {
    const { sheetId, position } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user has access to this sheet
    if (userRole !== 'SuperAdmin') {
      const hasAccess = await checkSheetPermission(prisma, userId, parseInt(sheetId), 'deleteRow');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to delete rows from this sheet.' });
      }
    }

    // Find the row to delete
    const rowToDelete = await prisma.sheetData.findFirst({
      where: {
        spreadsheetId: parseInt(sheetId),
        position: parseInt(position)
      }
    });

    if (!rowToDelete) {
      return res.status(404).json({ error: 'Row not found at the specified position' });
    }

    // Delete the row
    await prisma.sheetData.delete({
      where: { id: rowToDelete.id }
    });

    // Shift remaining rows up
    await prisma.sheetData.updateMany({
      where: {
        spreadsheetId: parseInt(sheetId),
        position: { gt: parseInt(position) }
      },
      data: {
        position: { decrement: 1 }
      }
    });

    res.json({ message: 'Row deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};