import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export const createSheet = async (req, res) => {
  try {
    const { name, columns } = req.body;
    const userId = req.user.userId; // Get the current user's ID
    const userRole = req.user.role;

    // Check if user is SuperAdmin
    if (userRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can create sheets' });
    }

    // Validate input
    if (!name || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Name and columns array are required' });
    }

    // Validate userId
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Verify that the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create sheet, default row, and user-sheet relationship in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the sheet
      const sheet = await tx.sheet.create({
        data: {
          name,
          columns,
          userSheets: {
            create: {
              userId: Number(userId),
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
      const defaultRow = await tx.sheetData.create({
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
      const sheets = await prisma.sheet.findMany({
        where: {
          ...searchCondition
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
              },
              permissions: true,
              columnLocks: true // Include column permissions
            }
          }
        }
      });
      return res.json(sheets);
    }

    // For regular users, return only sheets they have access to
    const sheets = await prisma.sheet.findMany({
      where: {
        userSheets: {
          some: {
            userId: userId
          }
        },
        ...searchCondition
      },
      include: {
        sheetData: true,
        userSheets: {
          where: { userId: userId },
          select: {
            role: true,
            permissions: true,
            columnLocks: true, // Include column permissions
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

    // Add frozenColumns property to each sheet
    const sheetsWithFrozenColumns = sheets.map(sheet => {
      const frozenColumns = sheet.userSheets.length > 0
        ? sheet.userSheets[0].columnLocks.map(cl => cl.columnName)
        : [];
      
      return {
        ...sheet,
        frozenColumns
      };
    });

    res.json(sheetsWithFrozenColumns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheets' });
  }
};

export const getSheetsWithoutGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Sheets not linked to any group (sheetGroupId is null)
    const baseWhere = { sheetGroupId: null };

    if (userRole === 'SuperAdmin') {
      const sheets = await prisma.sheet.findMany({
        where: baseWhere,
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
              },
              permissions: true,
              columnLocks: true // Include column permissions
            }
          }
        }
      });
      return res.json(sheets);
    }

    // For regular users, only sheets they have access to
    const sheets = await prisma.sheet.findMany({
      where: {
        ...baseWhere,
        userSheets: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        sheetData: true,
        userSheets: {
          where: { userId: userId },
          select: {
            role: true,
            permissions: true,
            columnLocks: true, // Include column permissions
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

    // Add frozenColumns property to each sheet
    const sheetsWithFrozenColumns = sheets.map(sheet => {
      const frozenColumns = sheet.userSheets.length > 0
        ? sheet.userSheets[0].columnLocks.map(cl => cl.columnName)
        : [];
      
      return {
        ...sheet,
        frozenColumns
      };
    });

    res.json(sheetsWithFrozenColumns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheets without group' });
  }
};

export const getSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has access to this sheet
    if (userRole !== 'SuperAdmin') {
      // Check if user has access to this specific sheet
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(id)
        }
      });

      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }
    }

    const sheet = await prisma.sheet.findFirst({
      where: {
        id: Number(id)
      },
      include: {
        sheetData: true,
        columnDropdowns: {
          include: {
            valueSet: true,
          },
        },
        userSheets: {
          where: { userId: userId },
          select: {
            role: true,
            permissions: true,
            columnLocks: true, // Include column permissions
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

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    // Add frozenColumns property
    const frozenColumns = sheet.userSheets.length > 0
      ? sheet.userSheets[0].columnLocks.map(cl => cl.columnName)
      : [];

    // Add the frozenColumns property to the response
    const responseSheet = {
      ...sheet,
      frozenColumns
    };

    res.json(responseSheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching sheet' });
  }
};
export const updateSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userRole = req.user.role;

    // Check if user is SuperAdmin
    if (userRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        error: true, 
        message: 'Only SuperAdmin can update sheet name' 
      });
    }

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

    res.json(updatedSheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating sheet' });
  }
};

export const updateSheetColumns = async (req, res) => {
  try {
    const { id } = req.params;
    const { newColumnName, insertAtIndex, deleteAtIndex, updateAtIndex } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has access to this sheet
    if (userRole !== 'SuperAdmin') {
      // Check if user has access to this specific sheet
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(id)
        },
        include: {
          permissions: true
        }
      });

      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }

      // Check specific permissions based on operation
      if (typeof insertAtIndex === "number") {
        const hasAddPermission = userSheet.permissions.some(p => p.type === 'addColumn');
        if (!hasAddPermission) {
          return res.status(403).json({ message: "You do not have permission to add columns" });
        }
      }

      if (typeof deleteAtIndex === "number") {
        const hasDeletePermission = userSheet.permissions.some(p => p.type === 'deleteColumn');
        if (!hasDeletePermission) {
          return res.status(403).json({ message: "You do not have permission to delete columns" });
        }
      }

      if (typeof updateAtIndex === "number") {
        const hasUpdatePermission = userSheet.permissions.some(p => p.type === 'updateColumn');
        if (!hasUpdatePermission) {
          return res.status(403).json({ message: "You do not have permission to update columns" });
        }
      }
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

    const sheet = await prisma.sheet.findUnique({
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

    // Store old column name if we're updating a column
    let oldColumnName = null;
    if (typeof updateAtIndex === "number" && newColumnName) {
      oldColumnName = updatedColumns[updateAtIndex];
    }

    // Store deleted column name if we're deleting a column
    let deletedColumnName = null;
    if (typeof deleteAtIndex === "number") {
      deletedColumnName = updatedColumns[deleteAtIndex];
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

    const updatedSheet = await prisma.$transaction(async (tx) => {
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

      // If a column was renamed, update any column permissions that reference it
      if (oldColumnName && typeof updateAtIndex === "number" && newColumnName) {
        await tx.columnPermission.updateMany({
          where: {
            userSheet: {
              sheetId: Number(id)
            },
            columnName: oldColumnName
          },
          data: {
            columnName: newColumnName
          }
        });
      }

      // If a column was deleted, remove any column permissions for it
      if (deletedColumnName) {
        await tx.columnPermission.deleteMany({
          where: {
            userSheet: {
              sheetId: Number(id)
            },
            columnName: deletedColumnName
          }
        });
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
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has access to this sheet
    if (userRole !== 'SuperAdmin') {
      // Check if user has access to this specific sheet
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(id)
        },
        include: {
          permissions: true
        }
      });

      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }

      // Check if user has column update permissions
      const hasColumnPermission = userSheet.permissions.some(
        p => p.type === 'updateColumn'
      );

      if (!hasColumnPermission) {
        return res.status(403).json({ message: "You do not have permission to move columns" });
      }
    }

    const sheet = await prisma.sheet.findUnique({
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

    const updatedSheet = await prisma.$transaction(async (tx) => {
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

export const attachFileType = async (req, res) => {
  try {
    const { id: sheetId } = req.params;
    const { columnName, fileType, action = 'attach' } = req.body; // action can be 'attach' or 'remove'
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has update column permission
    if (userRole !== 'SuperAdmin') {
      // Check if user has access to this specific sheet
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(sheetId)
        },
        include: {
          permissions: true
        }
      });

      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }

      // Check if user has column update permission
      const hasUpdatePermission = userSheet.permissions.some(p => p.type === 'updateColumn');

      if (!hasUpdatePermission) {
        return res.status(403).json({ message: "You do not have permission to update columns" });
      }
    }

    // Get the current sheet
    const sheet = await prisma.sheet.findUnique({
      where: { id: Number(sheetId) },
      select: {
        columns: true,
        columnsMeta: true
      }
    });

    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    // Get current columnsMeta or initialize if empty
    let columnsMeta = sheet.columnsMeta || {};

    if (action === 'attach') {
      if (!fileType) {
        return res.status(400).json({ message: "fileType is required for attach action" });
      }
      // Update the columnsMeta for the specified column
      columnsMeta[columnName] = {
        ...columnsMeta[columnName],
        fileType: fileType
      };
    } else if (action === 'remove') {
      // Remove the entire column metadata when removing file type
      if (columnName in columnsMeta) {
        delete columnsMeta[columnName];
      }
    }

    // Update the sheet with new columnsMeta
    const updatedSheet = await prisma.sheet.update({
      where: { id: Number(sheetId) },
      data: {
        columnsMeta
      }
    });

    res.json({
      error: false,
      data: updatedSheet,
      message: action === 'attach' ? "File type attached successfully" : "File type removed successfully"
    });

  } catch (error) {
    console.error("Error attaching file type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const attachCalendar = async (req, res) => {
  try {
    const { id: sheetId } = req.params;
    const { columnName, action = 'attach' } = req.body; // action can be 'attach' or 'remove'
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has update column permission
    if (userRole !== 'SuperAdmin') {
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(sheetId)
        },
        include: {
          permissions: true
        }
      });
      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }
      const hasUpdatePermission = userSheet.permissions.some(p => p.type === 'updateColumn');
      if (!hasUpdatePermission) {
        return res.status(403).json({ message: "You do not have permission to update columns" });
      }
    }

    // Get the current sheet
    const sheet = await prisma.sheet.findUnique({
      where: { id: Number(sheetId) },
      select: {
        columns: true,
        columnsMeta: true
      }
    });
    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }
    let columnsMeta = sheet.columnsMeta || {};
    if (action === 'attach') {
      // Attach calendar to the column
      columnsMeta[columnName] = {
        ...columnsMeta[columnName],
        calendar: true
      };
    } else if (action === 'remove') {
      // Remove calendar from the column
      if (columnsMeta[columnName]) {
        delete columnsMeta[columnName].calendar;
        // If the column meta is now empty, remove the column meta entirely
        if (Object.keys(columnsMeta[columnName]).length === 0) {
          delete columnsMeta[columnName];
        }
      }
    }
    // Update the sheet with new columnsMeta
    const updatedSheet = await prisma.sheet.update({
      where: { id: Number(sheetId) },
      data: { columnsMeta }
    });
    res.json({
      error: false,
      data: updatedSheet,
      message: action === 'attach' ? "Calendar attached successfully" : "Calendar removed successfully"
    });
  } catch (error) {
    console.error("Error attaching calendar:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const attachDropdown = async (req, res) => {
  try {
    const { id: sheetId } = req.params;
    const { valueSetId, columnName } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has update column permission
    if (userRole !== 'SuperAdmin') {
      // Check if user has access to this specific sheet
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(sheetId)
        },
        include: {
          permissions: true
        }
      });

      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }

      // Check if user has column update permission
      const hasUpdatePermission = userSheet.permissions.some(p => p.type === 'updateColumn');

      if (!hasUpdatePermission) {
        return res.status(403).json({ message: "You do not have permission to update columns" });
      }
    }

    const dropdown = await prisma.columnDropdown.upsert({
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

export const removeDropdown = async (req, res) => {
  try {
    const { id: sheetId } = req.params;
    const { columnName } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is SuperAdmin or has update column permission
    if (userRole !== 'SuperAdmin') {
      // Check if user has access to this specific sheet
      const userSheet = await prisma.userSheet.findFirst({
        where: {
          userId: userId,
          sheetId: Number(sheetId)
        },
        include: {
          permissions: true
        }
      });

      if (!userSheet) {
        return res.status(403).json({ message: "You do not have access to this sheet" });
      }

      // Check if user has column update permission
      const hasUpdatePermission = userSheet.permissions.some(p => p.type === 'updateColumn');

      if (!hasUpdatePermission) {
        return res.status(403).json({ message: "You do not have permission to update columns" });
      }
    }

    // Check if the dropdown exists
    const existingDropdown = await prisma.columnDropdown.findUnique({
      where: {
        sheetId_columnName: {
          sheetId: Number(sheetId),
          columnName
        }
      }
    });

    if (!existingDropdown) {
      return res.status(404).json({
        error: true,
        message: 'No dropdown found for this column'
      });
    }

    // Delete the dropdown
    await prisma.columnDropdown.delete({
      where: {
        sheetId_columnName: {
          sheetId: Number(sheetId),
          columnName
        }
      }
    });

    res.json({
      error: false,
      message: 'Column dropdown removed successfully'
    });
  } catch (error) {
    console.error('Error removing dropdown:', error);
    res.status(500).json({ error: true, message: 'Error removing dropdown from column' });
  }
};

export const deleteSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Only SuperAdmin can delete sheets
    if (userRole !== 'SuperAdmin') {
      return res.status(403).json({
        error: true,
        message: 'Only SuperAdmin can delete sheets'
      });
    }

    // Check if sheet exists
    const existingSheet = await prisma.sheet.findUnique({
      where: { id: Number(id) }
    });

    if (!existingSheet) {
      return res.status(404).json({
        error: true,
        message: 'Sheet not found'
      });
    }

    // Delete all related records in a transaction to maintain referential integrity
    await prisma.$transaction([
      // Delete column permissions that reference userSheets for this sheet
      prisma.columnPermission.deleteMany({
        where: {
          userSheet: {
            sheetId: Number(id)
          }
        }
      }),
      
      // Delete sheet permissions that reference userSheets for this sheet
      prisma.sheetPermission.deleteMany({
        where: {
          userSheet: {
            sheetId: Number(id)
          }
        }
      }),
      
      // Delete userSheets relationships
      prisma.userSheet.deleteMany({
        where: { sheetId: Number(id) }
      }),
      
      // Delete sheet data (rows)
      prisma.sheetData.deleteMany({
        where: { spreadsheetId: Number(id) }
      }),
      
      // Delete column dropdowns
      prisma.columnDropdown.deleteMany({
        where: { sheetId: Number(id) }
      }),
      
      // Finally delete the sheet itself
      prisma.sheet.delete({
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


export const shareSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { users, permissions, frozenColumns } = req.body;
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can manage sheet access.' });
    }

    // Validate users array
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: true, message: 'Users array is required.' });
    }

    // Validate permissions if provided
    if (permissions) {
      const validPermissions = [
        'addColumn',
        'deleteColumn',
        'updateColumn', 
        'addRow',
        'deleteRow',
        'updateRow'
      ];

      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: true,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`
        });
      }
    }

    // Get sheet to validate column names if frozen columns are provided
    const sheet = frozenColumns ? await prisma.sheet.findUnique({
      where: { id: Number(id) },
      select: { columns: true }
    }) : null;

    // Track skipped columns for each user
    const skippedColumnsByUser = {};

    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        if (!user.userId || !user.role) continue;

        // Create or update userSheet
        await tx.userSheet.upsert({
          where: {
            userId_sheetId: {
              userId: Number(user.userId),
              sheetId: Number(id)
            }
          },
          update: { 
            role: user.role
          },
          create: {
            userId: Number(user.userId),
            sheetId: Number(id),
            role: user.role
          }
        });

        // Always fetch the latest userSheet after upsert
        const userSheet = await tx.userSheet.findUnique({
          where: {
            userId_sheetId: {
              userId: Number(user.userId),
              sheetId: Number(id)
            }
          }
        });

        // If permissions are provided, update them
        if (permissions && permissions.length > 0) {
          // Delete existing permissions for this userSheet
          await tx.sheetPermission.deleteMany({
            where: { userSheetId: userSheet.id }
          });

          // Create new permissions
          for (const permissionType of permissions) {
            await tx.sheetPermission.create({
              data: {
                userSheetId: userSheet.id,
                type: permissionType
              }
            });
          }
        }

        // If frozen columns are provided for this user, update them
        if (frozenColumns && frozenColumns[user.userId] && sheet) {
          const userFrozenColumns = frozenColumns[user.userId];
          skippedColumnsByUser[user.userId] = [];
          
          // Filter to valid columns
          const validUserFrozenColumns = userFrozenColumns.filter(columnName => {
            const isValid = sheet.columns.includes(columnName);
            if (!isValid) {
              skippedColumnsByUser[user.userId].push(columnName);
            }
            return isValid;
          });
          
          // Delete existing column permissions for this userSheet
          await tx.columnPermission.deleteMany({
            where: { userSheetId: userSheet.id }
          });

          // Create new column permissions for valid frozen columns
          for (const columnName of validUserFrozenColumns) {
            await tx.columnPermission.create({
              data: {
                userSheetId: userSheet.id,
                columnName: columnName,
                canEdit: false // Set to false for frozen columns
              }
            });
          }
        }
      }
    });

        // Return updated user access list with permissions
        const userSheets = await prisma.userSheet.findMany({
          where: { sheetId: Number(id) },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            permissions: true,
            columnLocks: true // Include column permissions
          }
        });
    
        // Clean up skippedColumnsByUser to only include users with skipped columns
        Object.keys(skippedColumnsByUser).forEach(userId => {
          if (skippedColumnsByUser[userId].length === 0) {
            delete skippedColumnsByUser[userId];
          }
        });
    
        const hasSkippedColumns = Object.keys(skippedColumnsByUser).length > 0;
    
        res.json({ 
          error: false, 
          userSheets,
          skippedColumnsByUser: hasSkippedColumns ? skippedColumnsByUser : undefined,
          message: hasSkippedColumns
            ? 'Sheet access and permissions updated successfully, but some column names were invalid and skipped.'
            : 'Sheet access and permissions updated successfully.'
        });
    
      } catch (error) {
        console.error('Error managing sheet access:', error);
        res.status(500).json({ 
          error: true, 
          message: 'Error managing sheet access and permissions.' 
        });
      }
    };




export const updateSheetPermissions = async (req, res) => {
  try {
    const { id } = req.params; // sheetId
    const { userId, permissions, frozenColumns } = req.body;
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can update permissions.' });
    }

    // Validate input
    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required.' });
    }

    // Validate permissions if provided
    if (permissions && !Array.isArray(permissions)) {
      return res.status(400).json({ error: true, message: 'permissions must be an array.' });
    }

    if (permissions && permissions.length > 0) {
      const validPermissions = [
        'addColumn',
        'deleteColumn',
        'updateColumn', 
        'addRow',
        'deleteRow',
        'updateRow'
      ];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: true,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`
        });
      }
    }

    // Find the userSheet
    const userSheet = await prisma.userSheet.findUnique({
      where: {
        userId_sheetId: {
          userId: Number(userId),
          sheetId: Number(id)
        }
      }
    });

    if (!userSheet) {
      return res.status(404).json({ error: true, message: 'User does not have access to this sheet.' });
    }

    // Get sheet to validate column names if frozen columns are provided
    let sheet = null;
    let validFrozenColumns = [];
    let skippedColumns = [];
    
    if (frozenColumns && Array.isArray(frozenColumns) && frozenColumns.length > 0) {
      sheet = await prisma.sheet.findUnique({
        where: { id: Number(id) },
        select: { columns: true }
      });
      
      if (!sheet) {
        return res.status(404).json({ error: true, message: 'Sheet not found.' });
      }

      // Filter frozenColumns to only include columns that exist in the sheet
      frozenColumns.forEach(columnName => {
        if (sheet.columns.includes(columnName)) {
          validFrozenColumns.push(columnName);
        } else {
          skippedColumns.push(columnName);
        }
      });
    }

    // Update permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Update sheet permissions if provided
      if (permissions && permissions.length > 0) {
        // Delete existing permissions
        await tx.sheetPermission.deleteMany({
          where: { userSheetId: userSheet.id }
        });

        // Create new permissions
        for (const permissionType of permissions) {
          await tx.sheetPermission.create({
            data: {
              userSheetId: userSheet.id,
              type: permissionType
            }
          });
        }
      }

      // Update column permissions if provided
      if (frozenColumns && Array.isArray(frozenColumns)) {
        // Delete existing column permissions
        await tx.columnPermission.deleteMany({
          where: { userSheetId: userSheet.id }
        });

        // Create new column permissions for valid frozen columns
        for (const columnName of validFrozenColumns) {
          await tx.columnPermission.create({
            data: {
              userSheetId: userSheet.id,
              columnName: columnName,
              canEdit: false // Frozen columns are not editable
            }
          });
        }
      }
    });

    // Get updated permissions to return
    const updatedPermissions = await prisma.sheetPermission.findMany({
      where: { userSheetId: userSheet.id }
    });

    const frozenColumnPermissions = await prisma.columnPermission.findMany({
      where: { userSheetId: userSheet.id }
    });

    res.json({
      error: false,
      permissions: updatedPermissions,
      frozenColumns: frozenColumnPermissions.map(cp => cp.columnName),
      skippedColumns: skippedColumns.length > 0 ? skippedColumns : undefined,
      message: skippedColumns.length > 0 
        ? 'Permissions updated successfully. Some column names were invalid and skipped.'
        : 'Permissions updated successfully.'
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: true, message: 'Error updating permissions.' });
  }
};

export const removeUserFromSheet = async (req, res) => {
  try {
    const { id } = req.params; // sheetId
    const { userId } = req.body;
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'SuperAdmin') {
      return res.status(403).json({ error: true, message: 'Only SuperAdmin can remove user access.' });
    }

    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required.' });
    }

    // Find the userSheet
    const userSheet = await prisma.userSheet.findUnique({
      where: {
        userId_sheetId: {
          userId: Number(userId),
          sheetId: Number(id)
        }
      }
    });

    if (!userSheet) {
      return res.status(404).json({ error: true, message: 'User does not have access to this sheet.' });
    }

    // Remove permissions, column permissions and userSheet in a transaction
    await prisma.$transaction([
      // Delete sheet permissions
      prisma.sheetPermission.deleteMany({
        where: { userSheetId: userSheet.id }
      }),
      // Delete column permissions
      prisma.columnPermission.deleteMany({
        where: { userSheetId: userSheet.id }
      }),
      // Delete the userSheet record
      prisma.userSheet.delete({
        where: { id: userSheet.id }
      })
    ]);

    res.json({
      error: false,
      message: 'User access removed from sheet successfully.'
    });
  } catch (error) {
    console.error('Error removing user from sheet:', error);
    res.status(500).json({ error: true, message: 'Error removing user from sheet.' });
  }
};




