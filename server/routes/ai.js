const express = require('express')
const router  = express.Router()
const { verifyToken }    = require('../middleware/verifyToken')
const { assist, examMode, ingestContent } = require('../controllers/aiController')
const { getAvailableModels } = require('../utils/gemini')

router.post('/assist',    verifyToken, assist)
router.post('/exam',      verifyToken, examMode)
router.post('/ingest',    verifyToken, ingestContent)

// Diagnostic: which Gemini models does the configured API key actually support?
router.get('/models', async (_req, res) => {
  try {
    const models = await getAvailableModels()
    res.json({ models: models || [], note: models ? null : 'discovery failed — check API key' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
