import dotenv from 'dotenv';
dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'nomic-embed-text';

/**
 * Check connection to Ollama and return configured settings & available models.
 */
export async function checkOllamaConnection() {
  const host = OLLAMA_HOST.replace(/\/$/, '');
  try {
    const response = await fetch(`${host}/api/tags`);
    if (!response.ok) {
      return { online: false, error: `HTTP ${response.status}`, host };
    }
    const data = await response.json();
    return {
      online: true,
      models: data.models ? data.models.map((m) => m.name) : [],
      currentModel: OLLAMA_MODEL,
      host,
    };
  } catch (error) {
    return { online: false, error: error.message, host };
  }
}

/**
 * Generate embedding vector for a given text prompt.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  const host = OLLAMA_HOST.replace(/\/$/, '');

  // Try the newer /api/embed endpoint first
  try {
    const response = await fetch(`${host}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        input: text,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.embeddings && data.embeddings.length > 0) {
        return data.embeddings[0];
      }
    }
  } catch (e) {
    console.warn('Fallback to /api/embeddings because /api/embed failed:', e.message);
  }

  // Fallback to traditional /api/embeddings
  const response = await fetch(`${host}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama embedding failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data.embedding) {
    throw new Error('No embedding returned from Ollama');
  }
  return data.embedding;
}
