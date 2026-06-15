const crypto = require('crypto')
const Razorpay = require('razorpay')
const { supabase } = require('../middleware/verifyToken')

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const CONVERSION_RATE = 10 // ₹1 = 10 tokens (must match client)
const MIN_INR = 10

// Create a Razorpay order. The token amount is computed here and stored in the
// order notes so the client can never tamper with how many tokens a payment buys.
async function createOrder(req, res) {
  try {
    const inr = parseInt(req.body.amount, 10)
    if (!inr || inr < MIN_INR) {
      return res.status(400).json({ error: `Minimum purchase is ₹${MIN_INR}` })
    }

    const tokens = inr * CONVERSION_RATE
    const order = await razorpay.orders.create({
      amount: inr * 100, // paise
      currency: 'INR',
      receipt: `bb_${Date.now()}`,
      notes: { user_id: req.user.id, tokens: String(tokens), inr: String(inr) },
    })

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key — safe to send to client
    })
  } catch (err) {
    console.error('createOrder error:', err.message)
    res.status(500).json({ error: 'Failed to create payment order' })
  }
}

// Verify the payment signature, then credit tokens server-side. The token count
// comes from the order we created — never from the client.
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment fields' })
    }

    // 1. Verify the HMAC signature — proves the payment is authentic and unmodified
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' })
    }

    // 2. Load the order we created and confirm it belongs to this user
    const order = await razorpay.orders.fetch(razorpay_order_id)
    if (order.notes?.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Order does not belong to this user' })
    }

    const tokens = parseInt(order.notes?.tokens, 10)
    const inr = parseFloat(order.notes?.inr || 0)

    // 3. Credit atomically + idempotently (RPC ignores a repeated payment id)
    const { data: balance, error } = await supabase.rpc('credit_purchase', {
      p_user_id: req.user.id,
      p_tokens: tokens,
      p_inr: inr,
      p_payment_id: razorpay_payment_id,
    })
    if (error) throw error

    res.json({ success: true, tokens, token_balance: balance })
  } catch (err) {
    console.error('verifyPayment error:', err.message)
    res.status(500).json({ error: 'Payment verification failed' })
  }
}

module.exports = { createOrder, verifyPayment }
