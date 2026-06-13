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
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    init()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        setProfile(profile)
      }
      setLoading(false)
    })
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public */}
            <Route path="/"            element={<Home />} />
            <Route path="/browse"      element={<Browse />} />
            <Route path="/content/:id" element={<ContentPage />} />
            <Route path="/exam-mode"   element={<ExamMode />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/login"       element={<Login />} />
            <Route path="/register"    element={<Register />} />

            {/* Protected */}
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
