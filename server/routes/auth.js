const express = require('express')
const { sendVerificationCode, verifyCode, createAccount, sendResetCode, resetPassword } = require('../controllers/authController')
const router = express.Router()

router.post('/send-verification', sendVerificationCode)
router.post('/verify-code', verifyCode)
router.post('/create-account', createAccount)
router.post('/send-reset-code', sendResetCode)
router.post('/reset-password', resetPassword)

module.exports = router
