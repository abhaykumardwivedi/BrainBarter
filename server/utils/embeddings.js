const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Gemini's embedding model — 768 dimensions, free with the same API key.
const EMBED_MODEL = 'text-embedding-004'
const EMBED_DIM = 768

// Embed a single string → number[768]
async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL })
  const result = await model.embedContent(text)
  return result.embedding.values
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
