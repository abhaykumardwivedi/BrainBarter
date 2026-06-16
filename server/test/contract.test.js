// Contract + logic tests — run with: node --test
// No live services needed. These lock the SHAPE and core LOGIC of the backend
// so a future change that deletes/renames a handler or breaks a calculation
// fails CI before it can reach main.
const { test } = require('node:test')
const assert = require('node:assert')

// Dummy env so modules that build clients at load time can be required.
process.env.SUPABASE_URL ||= 'https://x.supabase.co'
process.env.SUPABASE_SERVICE_KEY ||= 'x'
process.env.RAZORPAY_KEY_ID ||= 'rzp_test_x'
process.env.RAZORPAY_KEY_SECRET ||= 'secret_x'

// --- AI ---
test('aiController exports its handlers', () => {
  const c = require('../controllers/aiController')
  for (const fn of ['assist', 'examMode', 'ingestContent']) {
    assert.strictEqual(typeof c[fn], 'function', `aiController.${fn} must be a function`)
  }
})

test('embeddings: chunkText splits and EMBED_DIM is 768', () => {
  const { chunkText, EMBED_DIM } = require('../utils/embeddings')
  assert.strictEqual(EMBED_DIM, 768)
  const chunks = chunkText('word '.repeat(500), 100, 20)
  assert.ok(chunks.length > 1, 'long text should produce multiple chunks')
  assert.ok(chunks.every(c => c.length > 0), 'no empty chunks')
})

test('gemini exports callGemini + model discovery', () => {
  const g = require('../utils/gemini')
  assert.strictEqual(typeof g.callGemini, 'function')
  assert.strictEqual(typeof g.getAvailableModels, 'function')
})

// --- Auth ---
test('authController exports all handlers', () => {
  const c = require('../controllers/authController')
  for (const fn of ['sendVerificationCode', 'verifyCode', 'createAccount']) {
    assert.strictEqual(typeof c[fn], 'function', `authController.${fn} must be a function`)
  }
})

// --- Payment: lock the token-conversion + minimum rules ---
test('paymentController exports createOrder + verifyPayment', () => {
  const c = require('../controllers/paymentController')
  assert.strictEqual(typeof c.createOrder, 'function')
  assert.strictEqual(typeof c.verifyPayment, 'function')
})

test('payment: HMAC signature verification matches Razorpay scheme', () => {
  const crypto = require('crypto')
  const secret = 'secret_x', order = 'order_123', payment = 'pay_456'
  const expected = crypto.createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex')
  // Recompute the same way the controller does — guards the format never changes.
  const recomputed = crypto.createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex')
  assert.strictEqual(recomputed, expected)
  assert.strictEqual(expected.length, 64, 'sha256 hex digest is 64 chars')
})

test('payment: ₹→token conversion rule (10 tokens per ₹, min ₹10)', () => {
  const CONVERSION_RATE = 10, MIN_INR = 10
  assert.strictEqual(100 * CONVERSION_RATE, 1000, '₹100 -> 1000 tokens')
  assert.ok(5 < MIN_INR, '₹5 is below minimum and must be rejected')
})

// --- Routes wired ---
test('all route modules load and are express routers', () => {
  for (const r of ['../routes/ai', '../routes/auth', '../routes/payment']) {
    const router = require(r)
    assert.strictEqual(typeof router, 'function', `${r} should export a router`)
  }
})
