import { useState } from 'react'
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
  const { setUser, setProfile } = useAuthStore()
  const navigate = useNavigate()

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const sendCode = async e => {
    e.preventDefault()
    
    // Validate
    const newErrors = {}
    if (form.username.length < 3) newErrors.username = 'Min 3 characters'
    if (!form.email.includes('@')) newErrors.email = 'Invalid email'
    if (form.password.length < 8) newErrors.password = 'Min 8 characters'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      if (!res.ok) throw new Error('Failed to send verification code')
      toast.success('Verification code sent to your email!')
      setStep(2)
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

      // Create account
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { username: form.username } },
      })
      if (error) throw error

      // Auto login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (loginError) throw loginError

      setUser(loginData.user)
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', loginData.user.id).single()
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow mx-auto mb-3">
            <span className="text-white font-display font-bold text-lg">B</span>
          </div>
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
                  label="Password" name="password" type="password" placeholder="Min 8 characters"
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enter the 6-digit code we sent</p>
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
