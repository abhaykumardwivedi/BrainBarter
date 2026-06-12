const { callGemini } = require('../utils/gemini')
const { supabase }   = require('../middleware/verifyToken')

async function assist(req, res) {
  const { taskType, contentId, userMessage } = req.body
  if (!taskType) return res.status(400).json({ error: 'taskType is required' })

  try {
    let contentText = ''
    if (contentId) {
      const { data } = await supabase.from('content').select('title, description').eq('id', contentId).single()
      if (data) contentText = `Title: ${data.title}\n${data.description || ''}`
    }
    if (!contentText) contentText = userMessage || 'No content provided'

    const response = await callGemini(taskType, contentText, taskType === 'doubt' ? userMessage : '')

    // Log to ai_logs
    await supabase.from('ai_logs').insert({
      user_id: req.user.id,
      content_id: contentId || null,
      task_type: taskType,
      prompt: contentText,
      response,
    })

    res.json({ response })
  } catch (err) {
    console.error('AI assist error:', err.message)
    res.status(500).json({ error: 'AI generation failed' })
  }
}

async function examMode(req, res) {
  const { taskType, subjectId, topicId, subject, topic } = req.body
  if (!taskType) return res.status(400).json({ error: 'taskType is required' })

  try {
    let context = ''

    // Prefer free-text subject/topic sent from the client; fall back to DB lookups by id
    if (topic) {
      context += `Topic: ${topic}\n`
    } else if (topicId) {
      const { data: topicRow } = await supabase.from('topics').select('name').eq('id', topicId).single()
      if (topicRow) context += `Topic: ${topicRow.name}\n`
    }
    if (subject) {
      context += `Subject: ${subject}\n`
    } else if (subjectId) {
      const { data: subjectRow } = await supabase.from('subjects').select('name').eq('id', subjectId).single()
      if (subjectRow) context += `Subject: ${subjectRow.name}\n`
      // Fetch PYQ context
      const { data: pyqs } = await supabase.from('pyqs').select('text_dump').eq('subject_id', subjectId).limit(3)
      if (pyqs?.length) context += `\nPrevious Year Questions Context:\n${pyqs.map(p => p.text_dump).join('\n')}`
    }
    if (!context) context = 'General academic content'

    const examTaskMap = {
      'expected':           'expected-questions',
      'expected-questions': 'expected-questions',
      'mock':               'mock-test',
      'revision':           'revision-sheet',
      'finalprep':          'final-prep',
    }

    const response = await callGemini(examTaskMap[taskType] || taskType, context)

    await supabase.from('ai_logs').insert({
      user_id: req.user.id,
      task_type: taskType,
      prompt: context,
      response,
    })

    res.json({ response })
  } catch (err) {
    console.error('Exam mode error:', err.message)
    res.status(500).json({ error: 'AI generation failed' })
  }
}

module.exports = { assist, examMode }
