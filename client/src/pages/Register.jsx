import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RiMailLine, RiLockLine, RiUserLine, RiArrowRightLine } from 'react-icons/ri'
import { Button, Input } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { setUser, setProfile } = useAuthStore()
  const navigate = useNavigate()

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (form.username.length < 3) e.username = 'Min 3 characters'
    if (!form.email.trim()) e.email = 'Email is required'
    if (form.password.length < 8) e.password = 'Min 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async e => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { username: form.username } },
      })
      if (error) throw error

      // Auto login after signup
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
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start with 50 free tokens</p>
        </div>

        <div className="card">
          <div className="card-inset flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">50</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">50 starter tokens on signup</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unlock your first content for free</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
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
              Create Account <RiArrowRightLine size={16} />
            </Button>
          </form>

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
