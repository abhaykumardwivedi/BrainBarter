const express = require('express')
const router  = express.Router()
const { verifyToken }    = require('../middleware/verifyToken')
const { assist, examMode, ingestContent } = require('../controllers/aiController')

router.post('/assist',    verifyToken, assist)
router.post('/exam',      verifyToken, examMode)
router.post('/ingest',    verifyToken, ingestContent)

module.exports = router
