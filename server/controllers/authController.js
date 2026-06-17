const axios = require('axios')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

// Service-role client — can write to auth_codes without RLS interference
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM    = process.env.SENDGRID_FROM

// Generates a 6-digit code, stores it (10-min expiry), and emails it via SendGrid.
// Shared by signup verification and password reset so both use the same working
// email path (Supabase's own SMTP isn't configured).
async function issueCode(email, { subject, heading }) {
  const code = (crypto.randomInt(0, 1000000)).toString().padStart(6, '0')
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: dbErr } = await supabase
    .from('email_verification_codes')
    .upsert({ email, code, expires_at: expires }, { onConflict: 'email' })
  if (dbErr) throw new Error('Failed to save code')

  await axios.post('https://api.sendgrid.com/v3/mail/send', {
    personalizations: [{ to: [{ email }] }],
    from: { email: SENDGRID_FROM, name: 'BrainBarter' },
    subject,
    content: [{
      type: 'text/html',
      value: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9d4edd;">${heading}</h2>
          <p>Your code is:</p>
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
}

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' })

    // Stop early if an account with this email already exists — no point emailing
    // a code for an account they can't create. Tells them to sign in instead.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' })
    }

    await issueCode(email, { subject: 'BrainBarter - Verify Your Email', heading: 'Verify Your Email' })
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

// Create the Supabase user from the backend using the service-role admin API
// with email_confirm:true so Supabase never tries to send its own confirmation
// email (which 500s when Supabase SMTP isn't configured). Email was already
// verified by us via SendGrid before this endpoint is called.
exports.createAccount = async (req, res) => {
  const { email, password, username } = req.body
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password, and username are required' })
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true,   // skip Supabase's email flow — we already verified
    })

    if (error) {
      // Log the full error so the real cause is visible in Render logs
      console.error('admin.createUser failed:', {
        status: error.status, code: error.code, message: error.message,
      })

      // Duplicate email → treat as success-ish so the user can just log in.
      // Match the specific duplicate signals only — NOT status 422 alone,
      // since Supabase also uses 422 for weak-password/validation errors.
      const dup =
        error.code === 'email_exists' ||
        error.code === 'user_already_exists' ||
        /already.*(registered|exists)|already been registered|email.*exists/i.test(error.message || '')
      if (dup) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' })
      }
      // Surface the real reason to the client instead of a generic 400
      return res.status(400).json({ error: error.message || 'Could not create account', code: error.code })
    }

    res.json({ user: data.user })
  } catch (err) {
    console.error('createAccount error:', err.message)
    res.status(500).json({ error: 'Failed to create account' })
  }
}

// Password reset, step 1: email a code — but only if an account actually exists.
exports.sendResetCode = async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' })

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (!existing) {
      return res.status(404).json({ error: 'No account found with this email.' })
    }

    await issueCode(email, { subject: 'BrainBarter - Reset Your Password', heading: 'Reset Your Password' })
    res.json({ success: true })
  } catch (err) {
    console.error('sendResetCode error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to send reset code' })
  }
}

// Password reset, step 2: verify the code and set the new password via admin API.
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'email, code, and password are required' })
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Validate the code (same single-use scheme as signup)
    const { data: rec } = await supabase
      .from('email_verification_codes')
      .select('code, expires_at')
      .eq('email', email)
      .maybeSingle()
    if (!rec) return res.status(400).json({ error: 'No code found. Request a new one.' })
    if (new Date() > new Date(rec.expires_at)) {
      await supabase.from('email_verification_codes').delete().eq('email', email)
      return res.status(400).json({ error: 'Code expired. Request a new one.' })
    }
    if (rec.code !== code) return res.status(400).json({ error: 'Invalid code' })

    // Find the auth user id via their profile, then update the password.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (!profile) return res.status(404).json({ error: 'No account found with this email.' })

    const { error } = await supabase.auth.admin.updateUserById(profile.id, { password })
    if (error) {
      console.error('resetPassword updateUser failed:', error.message)
      return res.status(400).json({ error: error.message || 'Could not update password' })
    }

    await supabase.from('email_verification_codes').delete().eq('email', email)
    res.json({ success: true })
  } catch (err) {
    console.error('resetPassword error:', err.message)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}
