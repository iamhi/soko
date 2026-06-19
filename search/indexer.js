import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

async function getEmbedding(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: text
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

export async function indexFile(filename) {
  try {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Chunk into 4-line paragraphs (roughly 2-6 lines as requested)
    const chunks = [];
    for (let i = 0; i < lines.length; i += 4) {
      chunks.push(lines.slice(i, i + 4).join('\n'));
    }
    
    const insertFile = db.prepare('INSERT OR REPLACE INTO files (filename) VALUES (?)');
    const getFile = db.prepare('SELECT id FROM files WHERE filename = ?');
    const deleteOldChunks = db.prepare('DELETE FROM chunks WHERE file_id = ?');
    const insertChunk = db.prepare('INSERT INTO chunks (file_id, text, embedding) VALUES (?, ?, ?)');
    const deleteFailed = db.prepare('DELETE FROM failed_attempts WHERE filename = ?');

    // Generate embeddings via Ollama
    const embeddings = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      embeddings.push(embedding);
    }

    // Insert everything into DB synchronously
    db.transaction(() => {
      insertFile.run(filename);
      const fileId = getFile.get(filename).id;
      deleteOldChunks.run(fileId);

      for (let i = 0; i < chunks.length; i++) {
        insertChunk.run(fileId, chunks[i], JSON.stringify(embeddings[i]));
      }

      deleteFailed.run(filename);
    })();

    console.log(`Successfully indexed ${filename}`);
  } catch (error) {
    console.error(`Failed to index ${filename}:`, error.message);
    const insertFailed = db.prepare('INSERT OR REPLACE INTO failed_attempts (filename, error_message) VALUES (?, ?)');
    insertFailed.run(filename, error.message);
  }
}

export async function clearDatabase() {
  db.exec('DELETE FROM chunks; DELETE FROM files; DELETE FROM failed_attempts;');
}

export async function indexAllFiles() {
  await clearDatabase();
  const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    await indexFile(file);
  }
}

export async function retryFailed() {
  const getFailed = db.prepare('SELECT filename FROM failed_attempts').all();
  for (const { filename } of getFailed) {
    await indexFile(filename);
  }
}

function cosineSimilarity(vecA, vecB) {
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

export async function searchChunks(query, limit = 5) {
  const queryVec = await getEmbedding(query);

  const getChunks = db.prepare(`
    SELECT chunks.text, chunks.embedding, files.filename 
    FROM chunks
    JOIN files ON chunks.file_id = files.id
  `).all();

  const results = getChunks.map(chunk => {
    const chunkVec = JSON.parse(chunk.embedding);
    const score = cosineSimilarity(queryVec, chunkVec);
    return {
      text: chunk.text,
      filename: chunk.filename,
      score
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
