const axios = require('axios')

const codes = new Map() // In-memory store: email -> {code, expires}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM = process.env.SENDGRID_FROM // verified sender email

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    codes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 }) // 10 min

    await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{ to: [{ email }] }],
      from: { email: SENDGRID_FROM, name: 'BrainBarter' },
      subject: 'BrainBarter - Verify Your Email',
      content: [{
        type: 'text/html',
        value: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Verify Your Email</h2>
            <p>Your verification code is:</p>
            <h1 style="background: #f3f4f6; padding: 20px; text-align: center; letter-spacing: 8px;">${code}</h1>
            <p style="color: #6b7280;">This code expires in 10 minutes.</p>
          </div>
        `
      }]
    }, {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Email send error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to send code' })
  }
}

exports.verifyCode = (req, res) => {
  const { email, code } = req.body
  const stored = codes.get(email)

  if (!stored) return res.status(400).json({ error: 'No code found' })
  if (Date.now() > stored.expires) {
    codes.delete(email)
    return res.status(400).json({ error: 'Code expired' })
  }
  if (stored.code !== code) return res.status(400).json({ error: 'Invalid code' })

  codes.delete(email)
  res.json({ success: true })
}
