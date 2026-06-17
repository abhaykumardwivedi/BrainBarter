import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RiMailLine, RiLockLine, RiArrowRightLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri'
import { Button, Input } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetCode, setResetCode] = useState('')
  const { setUser, setProfile } = useAuthStore()
  const navigate = useNavigate()

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Step 1: email a reset code (via our SendGrid backend, since Supabase SMTP isn't set up)
  const handleForgotPassword = async () => {
    if (!form.email) return toast.error('Enter your email above first')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/send-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not send reset code')
      toast.success('Reset code sent! Check your email.')
      setResetMode(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify the code and set the new password
  const handleResetPassword = async e => {
    e.preventDefault()
    if (!resetCode.trim()) return toast.error('Enter the code from your email')
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: resetCode, password: newPassword }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not reset password')
      toast.success('Password updated! Please sign in.')
      setResetMode(false)
      setResetCode('')
      setNewPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (error) throw error

      setUser(data.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      setProfile(profile)
      toast.success(`Welcome back, ${profile?.username || 'there'}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (resetMode) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0a1e] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-mark.svg" alt="BrainBarter"
            className="w-14 h-14 mx-auto mb-3 drop-shadow-[0_0_16px_rgba(157,78,221,0.55)]" />
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Set New Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the code sent to {form.email} and a new password</p>
        </div>
        <div className="card">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="Reset Code" name="resetCode" placeholder="000000"
              icon={RiLockLine} value={resetCode} onChange={e => setResetCode(e.target.value)}
              maxLength={6} required
            />
            <div className="relative">
              <Input
                label="New Password" name="newPassword"
                type={show ? 'text' : 'password'}
                placeholder="8+ chars, A-z, 0-9, symbol"
                icon={RiLockLine}
                value={newPassword} onChange={e => setNewPassword(e.target.value)} required
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                {show ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Update Password <RiArrowRightLine size={16} />
            </Button>
            <button type="button" onClick={() => { setResetMode(false); setResetCode(''); setNewPassword('') }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              ← Back to sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0a1e] p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-200/20 dark:bg-brand-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-8">
          <img src="/logo-mark.svg" alt="BrainBarter"
            className="w-14 h-14 mx-auto mb-3 drop-shadow-[0_0_16px_rgba(157,78,221,0.55)]" />
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to continue learning</p>
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email" name="email" type="email"
              placeholder="you@example.com" icon={RiMailLine}
              value={form.email} onChange={handle} required
            />
            <div className="relative">
              <Input
                label="Password" name="password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••" icon={RiLockLine}
                value={form.password} onChange={handle} required
              />
              <button
                type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {show ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
              </button>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleForgotPassword}
                className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                Forgot password?
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign In <RiArrowRightLine size={16} />
            </Button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline dark:text-brand-400">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
