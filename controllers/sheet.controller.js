import { PrismaClient } from '@prisma/client';
import { defineAbilityFor, hasPermission } from '../lib/ability.js';


const prismaClient = new PrismaClient();

export const createSheet = async (req, res) => {
  try {
    const { name, columns } = req.body;
    const userId = req.user.userId; // Get the current user's ID
    const userPermissions = req.user.permissions;

    // Check if user has create permission for sheets
    const hasCreatePermission = hasPermission(userPermissions, 'create', 'sheet');



    if (!hasCreatePermission) {
      return res.status(403).json({ error: true, message: 'You do not have permission to create sheets' });
    }

    // Validate input
    if (!name || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Name and columns array are required' });
    }

    // Create sheet, default row, and user-sheet relationship in a transaction
    const result = await prismaClient.$transaction(async (prisma) => {
      // Create the sheet
      const sheet = await prisma.sheet.create({
        data: {
          name,
          columns,
          userSheets: {
            create: {
              userId: userId,
              role: 'OWNER' // or whatever role you want to assign to the creator
            }
          }
        },
        include: {
          userSheets: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Create default row with N/A
      const defaultRow = await prisma.sheetData.create({
        data: {
          position: 0,
          row: Array(columns.length).fill('N/A'),
          sheet: {
            connect: {
              id: sheet.id
            }
          }
        }
      });

      return { sheet, defaultRow };
    });

    res.json({ data: result.sheet, message: "Sheet created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating sheet' });
  }
};

export const getSheets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userPermissions = req.user.permissions;
    const { search } = req.query; // Get search query from request

    // Build search condition if search query exists
    const searchCondition = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { userSheets: { some: { user: { name: { contains: search, mode: 'insensitive' } } } } }
      ]
    } : {};

    // If user is super admin, return all sheets
    if (userRole === 'SuperAdmin') {
      const sheets = await prismaClient.sheet.findMany({
        where: searchCondition,
        include: {
          sheetData: true,
          userSheets: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      return res.json(sheets);
    }

    // Check if user has read permission for sheets
    const hasReadPermission = userPermissions.some(
      p => p.action === 'read' && p.subject === 'Sheet'
    );

    if (!hasReadPermission) {
      return res.status(403).json({ error: true, message: 'You do not have permission to view sheets' });
    }

    // For regular users, return only their own sheets
    const sheets = await prismaClient.sheet.findMany({
      where: {
        AND: [
          { userSheets: { some: { userId: userId } } },
          searchCondition
        ]
      },
      include: {
        sheetData: true,
        userSheets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json(sheets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheets' });
  }
};

export const getSheet = async (req, res) => {
  try {
    const { id } = req.params;

    const sheet = await prismaClient.sheet.findFirst({
      where: {
        id: Number(id)
      },
      include: {
        sheetData: true,
        columnDropdowns: {
          include: {
            valueSet: true,
          },
        }
      }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    res.json(sheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheet' });
  }
};

export const updateSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ownerId } = req.body;
    const currentUserId = req.user.userId; // Assumes you have auth middleware

    // Start a transaction
    const result = await prismaClient.$transaction(async (prisma) => {
      // Update the sheet name if provided
      const updatedSheet = await prisma.sheet.update({
        where: { id: Number(id) },
        data: name ? { name } : {},
        include: {
          sheetData: true,
          userSheets: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // If ownerId is provided and is different from the current owner
      if (ownerId && Number(ownerId) !== currentUserId) {
        // Remove current user's access to the sheet
        await prisma.userSheet.deleteMany({
          where: {
            sheetId: Number(id),
            userId: currentUserId
          }
        });

        // Upsert (add or update) the new owner
        await prisma.userSheet.upsert({
          where: {
            userId_sheetId: {
              userId: Number(ownerId),
              sheetId: Number(id)
            }
          },
          update: { role: 'OWNER' },
          create: {
            userId: Number(ownerId),
            sheetId: Number(id),
            role: 'OWNER'
          }
        });
      }

      return updatedSheet;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating sheet' });
  }
};
export const updateSheetColumns = async (req, res) => {
  try {
    const { id } = req.params;
    const { newColumnName, insertAtIndex, deleteAtIndex, updateAtIndex } = req.body;

    const { permissions } = req.user;
    const ability = defineAbilityFor({ permissions });

    if (!ability.can("update", "Sheet")) {
      return res.status(403).json({ message: "You do not have permission to update sheets" });
    }

    // Validate inputs
    if (typeof insertAtIndex === "number" && !newColumnName) {
      return res.status(400).json({ message: "Missing newColumnName for column insertion" });
    }

    if (typeof updateAtIndex === "number" && !newColumnName) {
      return res.status(400).json({ message: "Missing newColumnName for column update" });
    }

    if (typeof insertAtIndex === "number" && insertAtIndex < 0) {
      return res.status(400).json({ message: "Invalid insertAtIndex: must be non-negative" });
    }

    const sheet = await prismaClient.sheet.findUnique({
      where: { id: Number(id) },
      include: { sheetData: true }
    });

    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    let updatedColumns = [...sheet.columns];

    // Validate deleteAtIndex before processing
    if (typeof deleteAtIndex === "number") {
      if (deleteAtIndex < 0 || deleteAtIndex >= updatedColumns.length) {
        return res.status(400).json({ message: "Invalid deleteAtIndex" });
      }
    }

    // Validate updateAtIndex before processing
    if (typeof updateAtIndex === "number") {
      if (updateAtIndex < 0 || updateAtIndex >= updatedColumns.length) {
        return res.status(400).json({ message: "Invalid updateAtIndex" });
      }
    }

    // Validate insertAtIndex
    if (typeof insertAtIndex === "number" && insertAtIndex > updatedColumns.length) {
      return res.status(400).json({ message: "Invalid insertAtIndex: exceeds column count" });
    }

    // Only allow one operation at a time to avoid complexity
    const operationCount = [
      insertAtIndex,
      deleteAtIndex,
      updateAtIndex
    ].filter(idx => typeof idx === "number").length;

    if (operationCount > 1) {
      return res.status(400).json({
        message: "Cannot perform multiple operations simultaneously. Please perform one at a time."
      });
    }

    if (operationCount === 0) {
      return res.status(400).json({
        message: "No operation specified. Provide insertAtIndex, deleteAtIndex, or updateAtIndex."
      });
    }

    // Insert logic
    if (typeof insertAtIndex === "number" && newColumnName) {
      updatedColumns.splice(insertAtIndex, 0, newColumnName);
    }

    // Delete logic
    if (typeof deleteAtIndex === "number") {
      updatedColumns.splice(deleteAtIndex, 1);
    }

    // Update logic (rename existing column)
    if (typeof updateAtIndex === "number" && newColumnName) {
      updatedColumns[updateAtIndex] = newColumnName;
    }

    const updatedSheet = await prismaClient.$transaction(async (tx) => {
      // Update columns array
      const updated = await tx.sheet.update({
        where: { id: Number(id) },
        data: { columns: updatedColumns },
        include: { sheetData: true }
      });

      // Update all existing rows
      for (const row of sheet.sheetData) {
        let updatedRow = [...row.row];

        // Apply same operations to row data
        if (typeof insertAtIndex === "number" && newColumnName) {
          updatedRow.splice(insertAtIndex, 0, "");
        }

        if (typeof deleteAtIndex === "number") {
          updatedRow.splice(deleteAtIndex, 1);
        }

        if (typeof insertAtIndex === "number" || typeof deleteAtIndex === "number") {
          await tx.sheetData.update({
            where: { id: row.id },
            data: { row: updatedRow }
          });
        }
      }

      return updated;
    });

    res.json(updatedSheet);
  } catch (error) {
    console.error("Error updating sheet columns:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const moveSheetColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceIndex, targetIndex } = req.body;

    const { permissions } = req.user;
    const ability = defineAbilityFor({ permissions });

    if (!ability.can("update", "Sheet")) {
      return res.status(403).json({ message: "You do not have permission to update sheets" });
    }

    const sheet = await prismaClient.sheet.findUnique({
      where: { id: Number(id) },
      include: { sheetData: true }
    });

    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    let updatedColumns = [...sheet.columns];

    // Validate sourceIndex and targetIndex
    if (sourceIndex < 0 || sourceIndex >= updatedColumns.length ||
      targetIndex < 0 || targetIndex >= updatedColumns.length) {
      return res.status(400).json({ message: "Invalid source or target index" });
    }

    // Remove column from source position
    const [columnToMove] = updatedColumns.splice(sourceIndex, 1);

    // Insert at target position
    updatedColumns.splice(targetIndex, 0, columnToMove);

    const updatedSheet = await prismaClient.$transaction(async (tx) => {
      // Update columns array
      const updated = await tx.sheet.update({
        where: { id: Number(id) },
        data: { columns: updatedColumns },
        include: { sheetData: true }
      });

      // Update all existing rows
      for (const row of sheet.sheetData) {
        let updatedRow = [...row.row];
        const [valueToMove] = updatedRow.splice(sourceIndex, 1);
        updatedRow.splice(targetIndex, 0, valueToMove);

        await tx.sheetData.update({
          where: { id: row.id },
          data: { row: updatedRow }
        });
      }

      return updated;
    });

    res.json(updatedSheet);
  } catch (error) {
    console.error("Error moving sheet column:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const attachDropdown = async (req, res) => {
  try {
    const { id: sheetId } = req.params;
    const { valueSetId,columnName } = req.body;
    // const { permissions } = req.user;

    // const ability = defineAbilityFor({ permissions });

    // if (!ability.can('update', 'Sheet')) {
    //   return res.status(403).json({
    //     error: true,
    //     message: 'You do not have permission to update sheets'
    //   });
    // }

    const dropdown = await prismaClient.columnDropdown.upsert({
      where: {
        sheetId_columnName: {
          sheetId: Number(sheetId),
          columnName
        }
      },
      update: { valueSetId },
      create: {
        columnName,
        sheetId: Number(sheetId),
        valueSetId,
      }
    });

    res.json({
      error: false,
      data: dropdown,
      message: 'Column dropdown updated successfully'
    });
  } catch (error) {
    console.error('Error attaching dropdown:', error);
    res.status(500).json({ error: true, message: 'Error attaching dropdown to column' });
  }
};


export const deleteSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.user; // Get permissions from JWT token

    // Create ability instance
    const ability = defineAbilityFor({ permissions });

    // Check if user has permission to delete sheets
    if (!ability.can('delete', 'Sheet')) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to delete sheets'
      });
    }

    // Check if sheet exists
    const existingSheet = await prismaClient.sheet.findUnique({
      where: { id: Number(id) }
    });

    if (!existingSheet) {
      return res.status(404).json({
        error: true,
        message: 'Sheet not found'
      });
    }

    // First delete related records in userSheets, sheetData and columnDropdowns
    await prismaClient.$transaction([
      prismaClient.userSheet.deleteMany({
        where: { sheetId: Number(id) }
      }),
      prismaClient.sheetData.deleteMany({
        where: { spreadsheetId: Number(id) }
      }),
      prismaClient.columnDropdown.deleteMany({
        where: { sheetId: Number(id) }
      }),
      // Then delete the sheet
      prismaClient.sheet.delete({
        where: { id: Number(id) }
      })
    ]);

    res.json({
      error: false,
      message: 'Sheet deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: true,
      message: 'Error deleting sheet'
    });
  }
};



