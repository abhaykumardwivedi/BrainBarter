const express = require('express')
const { sendVerificationCode, verifyCode } = require('../controllers/authController')
const router = express.Router()

router.post('/send-verification', sendVerificationCode)
router.post('/verify-code', verifyCode)

module.exports = router
