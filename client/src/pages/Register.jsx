import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RiMailLine, RiLockLine, RiUserLine, RiArrowRightLine, RiShieldCheckLine } from 'react-icons/ri'
import { Button, Input } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState(1) // 1: form, 2: verify code
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0) // seconds until resend allowed
  const { setUser, setProfile } = useAuthStore()
  const navigate = useNavigate()

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Countdown timer for the resend button
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  // Password policy: 8+ chars, upper, lower, number, special character
  const validatePassword = pw => {
    if (pw.length < 8) return 'Min 8 characters'
    if (!/[A-Z]/.test(pw)) return 'Add an uppercase letter'
    if (!/[a-z]/.test(pw)) return 'Add a lowercase letter'
    if (!/[0-9]/.test(pw)) return 'Add a number'
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Add a special character'
    return null
  }

  // Sends/resends the verification email. Skips form validation when resending.
  const sendCode = async (e, isResend = false) => {
    if (e) e.preventDefault()

    if (!isResend) {
      // Validate
      const newErrors = {}
      if (form.username.length < 3) newErrors.username = 'Min 3 characters'
      if (!form.email.includes('@')) newErrors.email = 'Invalid email'
      const pwError = validatePassword(form.password)
      if (pwError) newErrors.password = pwError

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      setErrors({})
    }

    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      if (!res.ok) throw new Error('Failed to send verification code')
      toast.success(isResend ? 'New code sent!' : 'Verification code sent to your email!')
      setStep(2)
      setResendIn(30) // 30s cooldown before allowing another resend
    } catch (err) {
      toast.error(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const submit = async e => {
    e.preventDefault()
    if (!code.trim()) return toast.error('Enter verification code')
    setLoading(true)
    try {
      // Verify code
      const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      })
      if (!verifyRes.ok) throw new Error('Invalid or expired code')

      // Create account via backend (service-role admin API with email_confirm:true
      // so Supabase never tries to send its own confirmation email)
      const createRes = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, username: form.username }),
      })
      if (!createRes.ok) {
        const body = await createRes.json()
        throw new Error(body.error || 'Failed to create account')
      }

      // Auto login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (loginError) throw loginError

      setUser(loginData.user)
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', loginData.user.id).maybeSingle()
      setProfile(profile)

      toast.success(`Welcome to BrainBarter, ${profile?.username || form.username}! 🎉`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0a1e] p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-200/20 dark:bg-brand-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-8">
          <img src="/logo-mark.svg" alt="BrainBarter"
            className="w-14 h-14 mx-auto mb-3 drop-shadow-[0_0_16px_rgba(157,78,221,0.55)]" />
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {step === 1 ? 'Create your account' : 'Verify your email'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {step === 1 ? 'Start with 50 free tokens' : `Code sent to ${form.email}`}
          </p>
        </div>

        <div className="card">
          {step === 1 ? (
            <>
              <div className="card-inset flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">50</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">50 starter tokens on signup</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unlock your first content for free</p>
                </div>
              </div>

              <form onSubmit={sendCode} className="space-y-4">
                <Input
                  label="Username" name="username" placeholder="yourname"
                  icon={RiUserLine} value={form.username} onChange={handle}
                  error={errors.username} required
                />
                <Input
                  label="Email" name="email" type="email" placeholder="you@example.com"
                  icon={RiMailLine} value={form.email} onChange={handle}
                  error={errors.email} required
                />
                <Input
                  label="Password" name="password" type="password" placeholder="8+ chars, A-z, 0-9, symbol"
                  icon={RiLockLine} value={form.password} onChange={handle}
                  error={errors.password} required
                />
                <Button type="submit" loading={loading} className="w-full">
                  Send Verification Code <RiArrowRightLine size={16} />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="card-inset flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                  <RiShieldCheckLine className="text-white" size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Check your email</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enter the 6-digit code we sent. If you don't see it, check your spam folder.</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Verification Code" name="code" placeholder="000000"
                  icon={RiShieldCheckLine} value={code} onChange={e => setCode(e.target.value)}
                  maxLength={6} required
                />
                <Button type="submit" loading={loading} className="w-full">
                  Verify & Create Account <RiArrowRightLine size={16} />
                </Button>
                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  onClick={() => sendCode(null, true)}
                  className="w-full text-sm font-medium text-brand-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed dark:text-brand-400 dark:disabled:text-gray-500"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  ← Back to form
                </button>
              </form>
            </>
          )}

          <div className="divider" />

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline dark:text-brand-400">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
