const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// apiVersion MUST go in the 2nd arg of getGenerativeModel() — the constructor ignores it.
// gemini-2.0-flash has limit:0 on the free tier; 1.5-flash has real free quota.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
const API_VERSION   = process.env.GEMINI_API_VERSION || 'v1beta'

// Tried in order on 429/quota errors so the app keeps working on the free tier.
const FALLBACK_MODELS = [PRIMARY_MODEL, 'gemini-1.5-flash-8b', 'gemini-1.0-pro']

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

async function callGemini(taskType, contentText, userMessage = '') {
  const systemPrompt = systemPrompts[taskType] || systemPrompts.summarize
  const prompt = `${systemPrompt}\n\nContent:\n${contentText}${userMessage ? `\n\nStudent's question: ${userMessage}` : ''}`

  let lastError
  for (const modelName of FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel(
        { model: modelName },
        { apiVersion: API_VERSION }
      )
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err) {
      const msg = err.message || ''
      // Retry with next model only on quota / rate-limit errors
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('limit: 0')) {
        lastError = err
        console.warn(`[Gemini] ${modelName} quota hit, trying next fallback…`)
        continue
      }
      throw err
    }
  }
  throw lastError
}

module.exports = { callGemini }
