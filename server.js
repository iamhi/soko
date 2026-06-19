import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { indexFile, searchChunks } from './search/indexer.js';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "upgrade-insecure-requests": null,
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
      },
    },
  })
);
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
});
app.use('/api', limiter);

const uploadDir = path.join(__dirname, 'uploads');
const deletedDir = path.join(__dirname, 'deleted');
const tempDir = path.join(__dirname, 'temp');

// Ensure directories exist
[uploadDir, deletedDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.md') {
      return cb(new Error('Only .md files are allowed'));
    }
    cb(null, true);
  },
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const tempPath = req.file.path;
  const originalName = req.file.originalname.replace(/[<>:"/\\|?*]/g, '_');

  try {
    const fd = fs.openSync(tempPath, 'r');
    const buffer = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    const first4KB = buffer.subarray(0, bytesRead);
    if (first4KB.includes(0x00)) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({ error: 'Binary payload detected. Null byte found.' });
    }

    let finalFilename = originalName;
    let counter = 1;
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);

    while (fs.existsSync(path.join(uploadDir, finalFilename))) {
      finalFilename = `${base}-${counter}${ext}`;
      counter++;
    }



    const finalPath = path.join(uploadDir, finalFilename);
    fs.renameSync(tempPath, finalPath);

    // Fire and forget indexing
    indexFile(finalFilename).catch(err => console.error('Background indexing error:', err));

    res.status(201).json({ filename: finalFilename });
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const deletedFilename = `${base}_${timestamp}${ext}`;



    fs.renameSync(filePath, path.join(deletedDir, deletedFilename));

    res.json({ message: 'File deleted successfully', filename: deletedFilename });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/search', async (req, res) => {
  const { q, limit } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const limitNum = parseInt(limit, 10) || 5;
    const results = await searchChunks(q, limitNum);
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
