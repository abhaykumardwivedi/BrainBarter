const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const systemPrompts = {
  summarize:          'You are an academic assistant. Summarize the following content in 5-7 clear bullet points for a student.',
  simplify:           'You are an academic assistant. Explain the following content in very simple language that a student can easily understand.',
  doubt:              'You are an academic assistant. The content below is numbered passages [1], [2], … retrieved from the student\'s study material. Answer the student\'s doubt using ONLY these passages. Be concise and clear, and cite the passage numbers you used inline like [1]. If the passages do not contain the answer, say so honestly.',
  'generate-notes':   'You are an academic assistant. Create structured revision notes with headings, key points, and definitions from the following content.',
  'generate-questions':'You are an academic assistant. Generate 10 important exam questions (mix of short and long answer) from the following content.',
  'mock-test':        'You are an academic assistant. Create a 10-question MCQ test with 4 options each and mark the correct answer. Base it on the following content.',
  'revision-sheet':   'You are an academic assistant. Create a one-page revision sheet with the most important concepts, definitions, and formulas from the following content.',
  'expected-questions':'You are an academic assistant. Based on the previous year questions and topic context provided, generate a list of probable exam questions a student should prepare.',
  'final-prep':       'You are an academic assistant. Create a final exam preparation checklist with the most important topics, key concepts, and must-revise points.',
}

async function callGemini(taskType, contentText, userMessage = '') {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' })
  const systemPrompt = systemPrompts[taskType] || systemPrompts.summarize
  const prompt = `${systemPrompt}\n\nContent:\n${contentText}${userMessage ? `\n\nStudent's question: ${userMessage}` : ''}`
  const result = await model.generateContent(prompt)
  return result.response.text()
}

module.exports = { callGemini }
