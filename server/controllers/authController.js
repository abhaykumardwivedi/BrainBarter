const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

// Service-role client — can write to auth_codes without RLS interference
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM    = process.env.SENDGRID_FROM

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' })

    // Cryptographically secure 6-digit code
    const code = (crypto.randomInt(0, 1000000)).toString().padStart(6, '0')
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Upsert into Supabase so codes survive server restarts
    const { error: dbErr } = await supabase
      .from('email_verification_codes')
      .upsert({ email, code, expires_at: expires }, { onConflict: 'email' })

    if (dbErr) {
      console.error('DB write error:', dbErr)
      return res.status(500).json({ error: 'Failed to save code' })
    }

    const { default: axios } = require('axios')
    await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{ to: [{ email }] }],
      from: { email: SENDGRID_FROM, name: 'BrainBarter' },
      subject: 'BrainBarter - Verify Your Email',
      content: [{
        type: 'text/html',
        value: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #9d4edd;">Verify Your Email</h2>
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

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' })

  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('code, expires_at')
    .eq('email', email)
    .maybeSingle()

  if (error || !data) return res.status(400).json({ error: 'No code found for this email' })
  if (new Date() > new Date(data.expires_at)) {
    await supabase.from('email_verification_codes').delete().eq('email', email)
    return res.status(400).json({ error: 'Code expired' })
  }
  if (data.code !== code) return res.status(400).json({ error: 'Invalid code' })

  // Delete immediately — single use
  await supabase.from('email_verification_codes').delete().eq('email', email)
  res.json({ success: true })
}
