const { GoogleGenerativeAI } = require('@google/generative-ai')

const API_KEY     = process.env.GEMINI_API_KEY
const API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta'
const genAI       = new GoogleGenerativeAI(API_KEY)

const EMBED_DIM = 768

// Preferred embedding models (current 2026 lineup first). We only call ones
// the key supports; the working model name is cached after the first success.
const PREFERRED_EMBED = [
  process.env.GEMINI_EMBED_MODEL,  // explicit override always wins
  'gemini-embedding-001',
  'text-embedding-004',
].filter(Boolean)

let _embedChain = null

// Discover embedding-capable models for this key (REST ListModels), cached.
async function buildEmbedChain() {
  if (_embedChain) return _embedChain
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}&pageSize=200`
    )
    const data = await res.json()
    const available = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('embedContent'))
      .map(m => m.name.replace(/^models\//, ''))
    const chain = PREFERRED_EMBED.filter(m => available.includes(m))
    for (const m of available) if (!chain.includes(m)) chain.push(m)
    _embedChain = chain.length ? chain : PREFERRED_EMBED
  } catch {
    _embedChain = PREFERRED_EMBED
  }
  return _embedChain
}

function isRetryable(msg) {
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') ||
         msg.includes('limit: 0') || msg.includes('404') || msg.includes('not found') ||
         msg.includes('not supported')
}

// Embed a single string → number[]
async function embedText(text) {
  const chain = await buildEmbedChain()
  let lastError
  for (const modelName of chain) {
    try {
      const model = genAI.getGenerativeModel(
        { model: modelName },
        { apiVersion: API_VERSION }
      )
      const result = await model.embedContent(text)
      return result.embedding.values
    } catch (err) {
      const msg = err.message || ''
      if (isRetryable(msg)) {
        lastError = err
        console.warn(`[Embed] ${modelName} unavailable, trying next…`)
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('No usable embedding model found for this API key')
}

// Embed many strings sequentially (free tier is rate-limited; keep it simple).
async function embedBatch(texts) {
  const out = []
  for (const t of texts) out.push(await embedText(t))
  return out
}

// Split long text into overlapping word-windows so each chunk is small enough
// to embed and retrieve precisely. ~220 words/chunk with 40-word overlap.
function chunkText(text, size = 220, overlap = 40) {
  if (overlap >= size) throw new Error('Chunk overlap must be less than chunk size')
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  if (words.length === 0) return []
  const chunks = []
  for (let i = 0; i < words.length; i += size - overlap) {
    const slice = words.slice(i, i + size).join(' ').trim()
    if (slice) chunks.push(slice)
    if (i + size >= words.length) break
  }
  return chunks
}

module.exports = { embedText, embedBatch, chunkText, EMBED_DIM }
