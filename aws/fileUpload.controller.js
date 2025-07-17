import multer from "multer";
import path from "path";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import * as awsService from "./awsService.js";

// Set up multer storage (memory storage for direct S3 upload)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to use in routes
export const fileUploadMiddleware = upload.single("file");

// Controller to handle file upload and save URL in row
export const uploadFileAndSaveUrl = async (req, res) => {
 try {
  const { spreadsheetId } = req.params;
  const { columnIndex, fileType,position} = req.body;
  const userId = req.user.userId;
  const userRole = req.user.role;
  const file = req.file;

  if (
   !spreadsheetId ||
   typeof position === "undefined" ||
   typeof columnIndex === "undefined" ||
   !file
  ) {
   return res.status(400).json({
    error: "spreadsheetId, position, columnIndex, and file are required.",
   });
  }

  // // Check if user has access to this sheet (reuse addRow permission for upload)
  // if (userRole !== "SuperAdmin") {
  //  const { checkSheetPermission } = await import("../lib/ability.js");
  //  const hasAccess = await checkSheetPermission(
  //   prisma,
  //   userId,
  //   parseInt(spreadsheetId),
  //   "addRow"
  //  );
  //  if (!hasAccess) {
  //   return res.status(403).json({
  //    error: "You do not have permission to upload files to this sheet.",
  //   });
  //  }
  // }

  // Generate a unique file name
  const ext = path.extname(file.originalname);
  const fileName = `sheet_${spreadsheetId}/row_${position}/col_${columnIndex}_${Date.now()}${ext}`;

  // Upload to S3
  const uploadResult = await awsService.uploadFileToAws(fileName, file.buffer);
  if (uploadResult === "error") {
   return res.status(500).json({ error: "Failed to upload file to S3." });
  }

  // Get the file URL (CloudFront or S3)
//   const fileUrl = awsService.getCloudFrontDownloadUrl(fileName);
// console.log(fileUrl,'LLKKJJHH::::><')
//   // Find the row
  const rowRecord = await prisma.sheetData.findFirst({
   where: {
    spreadsheetId: parseInt(spreadsheetId),
    position: parseInt(position),
   },
  });
  if (!rowRecord) {
   return res
    .status(404)
    .json({ error: "Row not found at the specified position." });
  }

  // Update the row's cell with the file URL
  let rowData = rowRecord.row;
  if (!Array.isArray(rowData)) rowData = [];
  rowData[columnIndex] = { fileUrl: uploadResult, type: fileType };

  const updatedRow = await prisma.sheetData.update({
   where: { id: rowRecord.id },
   data: { row: rowData },
  });

  res.status(200).json({ uploadResult, updatedRow });
 } catch (error) {
console.log('kkkkk')    
  console.error(error);
  res.status(500).json({ error: error.message });
 }
};

export const removeFileFromCell = async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const { position, columnIndex } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find the row
    const rowRecord = await prisma.sheetData.findFirst({
      where: {
        spreadsheetId: parseInt(spreadsheetId),
        position: parseInt(position),
      },
    });
    if (!rowRecord) {
      return res.status(404).json({ error: "Row not found at the specified position." });
    }

    // Get the row data
    let rowData = rowRecord.row;
    if (!Array.isArray(rowData)) rowData = [];
    const cellValue = rowData[columnIndex];

    // Only proceed if there is a file reference to remove
    if (!cellValue || !cellValue.fileUrl) {
      return res.status(400).json({ error: "No file found in the specified cell." });
    }

    // Update the cell to be empty
    rowData[columnIndex] = "";

    const updatedRow = await prisma.sheetData.update({
      where: { id: rowRecord.id },
      data: { row: rowData },
    });

    res.status(200).json({ message: "File  removed successfully.", updatedRow });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
