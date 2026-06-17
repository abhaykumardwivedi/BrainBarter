const { GoogleGenerativeAI } = require('@google/generative-ai')

const API_KEY     = process.env.GEMINI_API_KEY
const API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta'
const genAI       = new GoogleGenerativeAI(API_KEY)

// Preference order. We only ever call models the key actually supports
// (discovered at runtime), but among those we prefer cheap/high-free-quota
// flash + lite variants first. gemini-2.0-flash often shows limit:0 on the
// free tier, so the lite variants (separate quota) come first.
const PREFERRED = [
  process.env.GEMINI_MODEL,        // explicit override always wins
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
].filter(Boolean)

// Cache of model names this API key can use with generateContent.
let _availableModels = null

// Ask Google which models this key supports (REST ListModels). Cached.
async function getAvailableModels() {
  if (_availableModels) return _availableModels
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}&pageSize=200`
    )
    const data = await res.json()
    const names = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
    _availableModels = names.length ? names : null
    if (_availableModels) console.log('[Gemini] available generateContent models:', _availableModels.join(', '))
    return _availableModels
  } catch (err) {
    console.warn('[Gemini] ListModels failed, falling back to static list:', err.message)
    return null
  }
}

// Build the ordered list of model names to try for this key.
async function buildModelChain() {
  const available = await getAvailableModels()
  if (!available) return PREFERRED // discovery failed — try our best guesses
  // Preferred-and-available first, then any remaining available flash models.
  const chain = PREFERRED.filter(m => available.includes(m))
  for (const m of available) {
    if (!chain.includes(m) && m.includes('flash')) chain.push(m)
  }
  for (const m of available) {
    if (!chain.includes(m)) chain.push(m)
  }
  return chain.length ? chain : available
}

const systemPrompts = {
  summarize:           'You are an academic assistant. Summarize the following content in 5-7 clear bullet points for a student.',
  simplify:            'You are an academic assistant. Explain the following content in very simple language that a student can easily understand.',
  doubt:               'You are an academic assistant. The content below is numbered passages [1], [2], … retrieved from the student\'s study material. Answer the student\'s doubt using ONLY these passages. Be concise and clear, and cite the passage numbers you used inline like [1]. If the passages do not contain the answer, say so honestly.',
  'generate-notes':    'You are an academic assistant. Create structured revision notes with headings, key points, and definitions from the following content.',
  'generate-questions':'You are an academic assistant. Generate 10 important exam questions (mix of short and long answer) from the following content.',
  'mock-test':         'You are an academic assistant. Create a 10-question MCQ test with 4 options each and mark the correct answer. Base it on the following content.',
  'revision-sheet':    'You are an academic assistant. Create a one-page revision sheet with the most important concepts, definitions, and formulas from the following content.',
  'expected-questions':'You are an academic assistant. Based on the previous year questions and topic context provided, generate a list of probable exam questions a student should prepare.',
  'final-prep':        'You are an academic assistant. Create a final exam preparation checklist with the most important topics, key concepts, and must-revise points.',
  'study-plan':        'You are an academic assistant. Create a detailed day-by-day study plan based on the subject and number of days provided.',
}

// Retry on errors that mean "this model won't work right now, try another" —
// quota exhaustion (429), model-not-found/unsupported (404), or a transient
// overload (503 / UNAVAILABLE / overloaded), which a different model may dodge.
function isRetryable(msg) {
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') ||
         msg.includes('limit: 0') || msg.includes('404') || msg.includes('not found') ||
         msg.includes('not supported') ||
         msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded') ||
         msg.includes('Service Unavailable') || msg.includes('high demand')
}

async function callGemini(taskType, contentText, userMessage = '') {
  const systemPrompt = systemPrompts[taskType] || systemPrompts.summarize
  const prompt = `${systemPrompt}\n\nContent:\n${contentText}${userMessage ? `\n\nStudent's question: ${userMessage}` : ''}`

  const chain = await buildModelChain()
  let lastError
  for (const modelName of chain) {
    try {
      const model = genAI.getGenerativeModel(
        { model: modelName },
        { apiVersion: API_VERSION }
      )
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err) {
      const msg = err.message || ''
      if (isRetryable(msg)) {
        lastError = err
        console.warn(`[Gemini] ${modelName} unavailable (${msg.slice(0, 80)}…), trying next…`)
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('No usable Gemini model found for this API key')
}

module.exports = { callGemini, getAvailableModels }
