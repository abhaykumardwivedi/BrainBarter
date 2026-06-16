const express = require('express')
const { sendVerificationCode, verifyCode, createAccount } = require('../controllers/authController')
const router = express.Router()

router.post('/send-verification', sendVerificationCode)
router.post('/verify-code', verifyCode)
router.post('/create-account', createAccount)

module.exports = router
