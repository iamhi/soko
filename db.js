import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEmbedding } from './ollama.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, 'db');
const DB_FILE = path.join(DB_DIR, 'embeddings.json');

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = { files: {} };

try {
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(data);
    if (!db.files) {
      db.files = {};
    }
  } else {
    saveDatabaseSync();
  }
} catch (error) {
  console.error('Error loading embeddings database, starting with empty:', error);
}

function saveDatabaseSync() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving embeddings database:', error);
  }
}

/**
 * Text chunking function.
 * Splits markdown text into semantic chunks of about maxChunkSize characters,
 * respecting paragraph boundaries where possible.
 */
export function chunkText(text, maxChunkSize = 800, overlap = 150) {
  if (!text) return [];

  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n');

  // Split by double newlines to find paragraphs
  const paragraphs = normalizedText.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';

  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim();
    if (!paragraph) continue;

    // If paragraph fits in current chunk
    if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    } else {
      // Chunk is full, save currentChunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If paragraph itself is larger than maxChunkSize, split it by characters/sentences
      if (paragraph.length > maxChunkSize) {
        let start = 0;
        while (start < paragraph.length) {
          const end = Math.min(start + maxChunkSize, paragraph.length);
          chunks.push(paragraph.slice(start, end));
          start += maxChunkSize - overlap;
        }
        currentChunk = '';
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Computes the cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns all documents and their status.
 */
export function listIndexedFiles() {
  const result = [];
  for (const [filename, info] of Object.entries(db.files)) {
    result.push({
      filename,
      status: info.status,
      chunkCount: info.chunks ? info.chunks.length : 0,
      error: info.error || null,
      indexedAt: info.indexedAt || null,
    });
  }
  return result;
}

/**
 * Index a markdown document.
 */
export async function indexFile(filename, filePath) {
  // Initialize in DB as indexing
  db.files[filename] = {
    status: 'indexing',
    indexedAt: new Date().toISOString(),
    chunks: [],
  };
  saveDatabaseSync();

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const chunks = chunkText(content);

    if (chunks.length === 0) {
      db.files[filename] = {
        status: 'indexed',
        indexedAt: new Date().toISOString(),
        chunks: [],
      };
      saveDatabaseSync();
      return;
    }

    const indexedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkTextContent = chunks[i];
      console.log(`Generating embedding for ${filename} chunk ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunkTextContent);
      indexedChunks.push({
        text: chunkTextContent,
        embedding,
      });
    }

    db.files[filename] = {
      status: 'indexed',
      indexedAt: new Date().toISOString(),
      chunks: indexedChunks,
    };
    saveDatabaseSync();
    console.log(`Successfully indexed ${filename} (${chunks.length} chunks)`);
  } catch (error) {
    console.error(`Failed to index file ${filename}:`, error);
    db.files[filename] = {
      status: 'failed',
      indexedAt: new Date().toISOString(),
      error: error.message,
      chunks: [],
    };
    saveDatabaseSync();
  }
}

/**
 * Removes file embeddings from database.
 */
export function removeFileFromIndex(filename) {
  if (db.files[filename]) {
    delete db.files[filename];
    saveDatabaseSync();
    console.log(`Removed ${filename} from embeddings database.`);
  }
}

/**
 * Search the index for the top matching chunks based on semantic similarity.
 */
export function searchIndex(queryEmbedding, limit = 5, minSimilarity = 0.1) {
  const matches = [];

  for (const [filename, info] of Object.entries(db.files)) {
    if (info.status !== 'indexed' || !info.chunks) continue;

    for (const chunk of info.chunks) {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (similarity >= minSimilarity) {
        matches.push({
          filename,
          text: chunk.text,
          similarity,
        });
      }
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches.slice(0, limit);
}
