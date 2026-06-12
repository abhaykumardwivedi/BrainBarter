const { Resend } = require('resend')

const codes = new Map() // In-memory store: email -> {code, expires}
const resend = new Resend(process.env.RESEND_API_KEY)

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    codes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 }) // 10 min

    await resend.emails.send({
      from: 'BrainBarter <onboarding@resend.dev>',
      to: email,
      subject: 'BrainBarter - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Verify Your Email</h2>
          <p>Your verification code is:</p>
          <h1 style="background: #f3f4f6; padding: 20px; text-align: center; letter-spacing: 8px;">${code}</h1>
          <p style="color: #6b7280;">This code expires in 10 minutes.</p>
        </div>
      `,
    })

    res.json({ success: true })
  } catch (err) {
    console.error(err)
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
