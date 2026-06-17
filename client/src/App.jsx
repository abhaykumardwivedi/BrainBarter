import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import Navbar           from './components/layout/Navbar'
import Footer           from './components/layout/Footer'
import { ProtectedRoute } from './components/common'
import Home             from './pages/Home'
import Browse           from './pages/Browse'
import ContentPage      from './pages/ContentPage'
import ExamMode         from './pages/ExamMode'
import Leaderboard      from './pages/Leaderboard'
import Wallet           from './pages/Wallet'
import Upload           from './pages/Upload'
import Login            from './pages/Login'
import Register         from './pages/Register'
import Profile          from './pages/Profile'
import CreatorDashboard from './pages/CreatorDashboard'
import AdminPanel       from './pages/AdminPanel'
import NotFound         from './pages/NotFound'
import useThemeStore    from './store/themeStore'
import useAuthStore     from './store/authStore'
import { supabase }     from './lib/supabase'
import FeedbackButton   from './components/FeedbackButton'

export default function App() {
  const { init } = useThemeStore()
  const { setUser, setProfile, setLoading, logout } = useAuthStore()

  useEffect(() => {
    init()

    const fetchAndSetProfile = async (user) => {
      let { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()

      // Profile missing (registered before trigger was added) — create it now
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email.split('@')[0],
          token_balance: 50,
        })
        const { data: fresh } = await supabase
          .from('profiles').select('*').eq('id', user.id).maybeSingle()
        profile = fresh
      }

      setProfile(profile)
    }

    // Restore session on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        await fetchAndSetProfile(session.user)
      }
      setLoading(false)
    })

    // Keep auth in sync (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchAndSetProfile(session.user) // no await — don't block
      } else {
        logout()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public */}
            <Route path="/"            element={<Home />} />
            <Route path="/login"       element={<Login />} />
            <Route path="/register"    element={<Register />} />

            {/* Protected — must be signed in */}
            <Route path="/browse"      element={<ProtectedRoute><Browse /></ProtectedRoute>} />
            <Route path="/content/:id" element={<ProtectedRoute><ContentPage /></ProtectedRoute>} />
            <Route path="/exam-mode"   element={<ProtectedRoute><ExamMode /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/wallet"    element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/upload"    element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
            <Route path="/admin"     element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <FeedbackButton />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'card text-sm',
            style: { borderRadius: '12px', padding: '12px 16px' },
            success: { iconTheme: { primary: '#9d4edd', secondary: '#fff' } },
          }}
        />
      </div>
    </BrowserRouter>
  )
}
