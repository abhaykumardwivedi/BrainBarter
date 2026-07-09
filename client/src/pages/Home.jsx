import { Link } from 'react-router-dom'
import {
  RiFlashlightLine, RiCompassLine, RiUploadCloud2Line,
  RiStarLine, RiShieldCheckLine, RiGroupLine,
  RiArrowRightLine, RiPlayCircleLine, RiFileTextLine,
} from 'react-icons/ri'
import { Button, Badge, TokenChip } from '../components/common'
import useAuthStore from '../store/authStore'

// Honest capability pills (no fabricated user metrics)
const highlights = [
  { icon: RiFlashlightLine,  text: 'AI revision & mock exams' },
  { icon: RiGroupLine,       text: 'Notes by real students' },
  { icon: RiShieldCheckLine, text: 'Secure payments' },
  { icon: RiStarLine,        text: '50 free tokens on signup' },
]

const features = [
  {
    icon: RiGroupLine,
    title: 'Peer-First Learning',
    desc: 'Learn from toppers and smart peers who explain in relatable, campus-specific language.',
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  },
  {
    icon: RiFlashlightLine,
    title: 'AI Exam Mode',
    desc: 'Generate expected questions, mock tests, and revision sheets powered by Gemini AI.',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  },
  {
    icon: RiShieldCheckLine,
    title: 'Token Economy',
    desc: 'Earn tokens by sharing knowledge. Spend tokens to unlock premium peer content.',
    color: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  },
]

const sampleContent = [
  { title: 'DBMS — Normalization Explained Simply', creator: 'Aryan S.', type: 'video', cost: 5, difficulty: 'medium', rating: 4.8 },
  { title: 'OS — Process Scheduling Notes', creator: 'Priya M.', type: 'notes', cost: 3, difficulty: 'beginner', rating: 4.6 },
  { title: 'CN — TCP/IP Deep Dive', creator: 'Rahul K.', type: 'video', cost: 8, difficulty: 'advanced', rating: 4.9 },
]

const difficultyColor = { beginner: 'green', medium: 'amber', advanced: 'red' }

export default function Home() {
  const { user } = useAuthStore()
  return (
    <div className="page">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-200/30 dark:bg-brand-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-32 w-80 h-80 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container-app pt-20 pb-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6 animate-fade-in">
            <RiFlashlightLine size={14} />
            AI-Assisted Peer Learning Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-display font-extrabold text-gray-900 dark:text-white leading-tight mb-6 animate-slide-up">
            Learn from peers.<br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">Ace your exams.</span>
          </h1>

          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8 animate-slide-up">
            BrainBarter connects you with campus toppers who explain topics the way you understand.
            Unlock content with tokens. Use AI for revision and mock exams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up">
            <Link to={user ? '/browse' : '/register'}>
              <Button size="lg" className="shadow-glow-lg">
                {user ? 'Browse Topics' : 'Start Learning Free'}
                <RiArrowRightLine size={18} />
              </Button>
            </Link>
            <Link to="/exam-mode">
              <Button variant="secondary" size="lg">
                <RiFlashlightLine size={18} />
                Exam Mode
              </Button>
            </Link>
          </div>

          {/* Capability pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-14 max-w-2xl mx-auto">
            {highlights.map(({ icon: Icon, text }) => (
              <span key={text}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full card-inset text-sm text-gray-600 dark:text-gray-300">
                <Icon size={15} className="text-brand-500 dark:text-brand-400" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="container-app py-16">
        <div className="text-center mb-10">
          <h2 className="section-title">Why BrainBarter?</h2>
          <p className="section-sub">Everything you need to prepare smarter, not harder.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card-hover group">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-neu-sm dark:shadow-neu-dark-sm group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
              </div>
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample Content ── */}
      <section className="container-app py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">Trending Content</h2>
            <p className="section-sub">Most unlocked this week</p>
          </div>
          <Link to="/browse" className="btn-ghost btn-sm flex items-center gap-1">
            View all <RiArrowRightLine size={14} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {sampleContent.map((c) => (
            <Link key={c.title} to="/browse" className="card-hover group cursor-pointer block">
              {/* Thumbnail placeholder */}
              <div className="h-36 rounded-xl bg-gradient-soft dark:bg-gradient-dark flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-brand opacity-10 group-hover:opacity-20 transition-opacity" />
                {c.type === 'video'
                  ? <RiPlayCircleLine size={40} className="text-brand-400 group-hover:scale-110 transition-transform" />
                  : <RiFileTextLine size={40} className="text-brand-400 group-hover:scale-110 transition-transform" />
                }
                <span className="absolute top-2 right-2">
                  <Badge variant={c.type === 'video' ? 'purple' : 'green'}>
                    {c.type}
                  </Badge>
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-snug mb-2">{c.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">by {c.creator}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={difficultyColor[c.difficulty]}>{c.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-xs text-amber-500">
                    <RiStarLine size={12} /> {c.rating}
                  </span>
                  <TokenChip amount={c.cost} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="container-app py-16">
        <div className="relative rounded-3xl bg-gradient-brand p-10 text-center overflow-hidden shadow-glow-lg">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <h2 className="text-3xl font-display font-bold text-white mb-3 relative">
            Ready to barter your brain?
          </h2>
          <p className="text-brand-200 mb-6 relative">Join thousands of students already learning smarter.</p>
          <Link to={user ? '/browse' : '/register'}>
            <Button variant="secondary" size="lg" className="relative">
              {user ? 'Browse Content' : 'Get Started — It\'s Free'}
              <RiArrowRightLine size={18} />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  )
}
