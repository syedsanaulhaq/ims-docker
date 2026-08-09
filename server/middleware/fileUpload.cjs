// File upload configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env.cjs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', '..', config.UPLOAD_DIR);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter: function (req, file, cb) {
    if (config.ALLOWED_FILE_TYPES.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, jpg, jpeg, png, gif'));
    }
  }
});

module.exports = upload;
