const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, TXT files allowed'));
    }
  }
});

// Get all documents
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user._id }).sort({ uploadedAt: -1 });
    res.json({ documents: docs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload document
router.post('/upload', auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const doc = await Document.create({
      user: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: path.extname(req.file.originalname),
      fileSize: req.file.size,
      isResume: req.body.isResume === 'true',
      content: `[Content of ${req.file.originalname}]`, // In production: extract with pdf-parse
    });

    if (req.body.isResume === 'true') {
      await User.findByIdAndUpdate(req.user._id, {
        resume: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          uploadedAt: new Date(),
        }
      });
    }

    res.status(201).json({ document: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Delete file from disk
    const filePath = path.join(uploadDir, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
