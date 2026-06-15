import { useState, useEffect } from 'react'
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
  const { setUser, setProfile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setResetMode(true)
    }
  }, [])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleForgotPassword = async () => {
    if (!form.email) return toast.error('Enter your email above first')
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) return toast.error(error.message)
    toast.success('Password reset link sent! Check your email.')
  }

  const handleResetPassword = async e => {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated! Please sign in.')
    setResetMode(false)
    window.history.replaceState(null, '', '/login')
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter a new password for your account</p>
        </div>
        <div className="card">
          <form onSubmit={handleResetPassword} className="space-y-4">
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
