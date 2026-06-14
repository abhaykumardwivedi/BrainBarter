const pdfParse = require('pdf-parse')
const { callGemini } = require('../utils/gemini')
const { embedText, chunkText } = require('../utils/embeddings')
const { supabase }   = require('../middleware/verifyToken')

// Tasks that benefit from semantic retrieval of a specific question.
const RETRIEVAL_TASKS = new Set(['doubt'])

// ---------------------------------------------------------------------------
// INGESTION: extract text from an uploaded file, chunk it, embed each chunk,
// and store the vectors. Called once after a successful upload (idempotent).
// ---------------------------------------------------------------------------
async function ingestContent(req, res) {
  const { contentId } = req.body
  if (!contentId) return res.status(400).json({ error: 'contentId is required' })

  try {
    const { data: content } = await supabase
      .from('content')
      .select('id, creator_id, title, description, type, file_url')
      .eq('id', contentId)
      .maybeSingle()

    if (!content) return res.status(404).json({ error: 'Content not found' })
    // Only the creator may trigger ingestion for their own content
    if (content.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your content' })
    }

    // Always index title + description so every item is at least minimally searchable
    let fullText = `${content.title}\n${content.description || ''}`

    // For notes/PDFs, download the file and extract its text
    const looksLikePdf = content.file_url && /\.pdf(\?|$)/i.test(content.file_url)
    if (looksLikePdf) {
      try {
        const resp = await fetch(content.file_url)
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer())
          const parsed = await pdfParse(buf)
          if (parsed.text?.trim()) fullText += `\n\n${parsed.text}`
        }
      } catch (e) {
        console.error('PDF extract failed (indexing title/description only):', e.message)
      }
    }

    const chunks = chunkText(fullText)
    if (chunks.length === 0) return res.json({ chunks: 0 })

    // Re-ingest cleanly: drop any previous chunks for this content
    await supabase.from('content_chunks').delete().eq('content_id', contentId)

    // Embed + insert chunk by chunk
    let inserted = 0
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i])
      const { error } = await supabase.from('content_chunks').insert({
        content_id: contentId,
        chunk_index: i,
        chunk_text: chunks[i],
        embedding,
      })
      if (!error) inserted++
    }

    res.json({ chunks: inserted })
  } catch (err) {
    console.error('Ingestion error:', err.message)
    res.status(500).json({ error: 'Ingestion failed' })
  }
}

// ---------------------------------------------------------------------------
// ASSIST: now Retrieval-Augmented. For a doubt, we semantically retrieve the
// most relevant chunks of the actual uploaded material and answer grounded in
// them (returning citations). For other tasks, we feed the full indexed text.
// ---------------------------------------------------------------------------
async function assist(req, res) {
  const { taskType, contentId, userMessage } = req.body
  if (!taskType) return res.status(400).json({ error: 'taskType is required' })

  try {
    let contentText = ''
    let citations = []

    if (contentId && RETRIEVAL_TASKS.has(taskType) && userMessage) {
      // 1. Embed the student's question
      const queryEmbedding = await embedText(userMessage)
      // 2. Semantic search over THIS content's chunks
      const { data: matches } = await supabase.rpc('match_content_chunks', {
        p_content_id: contentId,
        query_embedding: queryEmbedding,
        match_count: 6,
      })
      if (matches?.length) {
        contentText = matches.map((m, i) => `[${i + 1}] ${m.chunk_text}`).join('\n\n')
        citations = matches.map((m, i) => ({
          ref: i + 1,
          snippet: m.chunk_text.slice(0, 180),
          similarity: Number(m.similarity?.toFixed(3)),
        }))
      }
    } else if (contentId) {
      // Non-doubt tasks: use the full indexed text (ordered chunks)
      const { data: chunks } = await supabase
        .from('content_chunks')
        .select('chunk_text, chunk_index')
        .eq('content_id', contentId)
        .order('chunk_index')
        .limit(40)
      if (chunks?.length) {
        contentText = chunks.map(c => c.chunk_text).join('\n\n')
      }
    }

    // Fallback: not indexed yet → use title/description (old behavior)
    if (!contentText && contentId) {
      const { data } = await supabase
        .from('content').select('title, description').eq('id', contentId).maybeSingle()
      if (data) contentText = `Title: ${data.title}\n${data.description || ''}`
    }
    if (!contentText) contentText = userMessage || 'No content provided'

    const response = await callGemini(
      taskType,
      contentText,
      taskType === 'doubt' ? userMessage : ''
    )

    await supabase.from('ai_logs').insert({
      user_id: req.user.id,
      content_id: contentId || null,
      task_type: taskType,
      prompt: contentText.slice(0, 4000),
      response,
    })

    res.json({ response, citations })
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

    if (topic) {
      context += `Topic: ${topic}\n`
    } else if (topicId) {
      const { data: topicRow } = await supabase.from('topics').select('name').eq('id', topicId).maybeSingle()
      if (topicRow) context += `Topic: ${topicRow.name}\n`
    }
    if (subject) {
      context += `Subject: ${subject}\n`
    } else if (subjectId) {
      const { data: subjectRow } = await supabase.from('subjects').select('name').eq('id', subjectId).maybeSingle()
      if (subjectRow) context += `Subject: ${subjectRow.name}\n`
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

module.exports = { assist, examMode, ingestContent }
