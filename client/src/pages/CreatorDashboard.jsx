import { useState, useEffect, useRef } from 'react'
import {
  RiDashboardLine, RiUploadCloud2Line, RiEyeLine,
  RiCopperCoinLine, RiStarLine, RiEditLine, RiDeleteBinLine,
  RiToggleLine, RiBarChartLine, RiFileTextLine, RiVideoLine,
  RiLockLine, RiGlobalLine, RiTimeLine, RiDownloadLine,
  RiArrowUpLine, RiArrowDownLine, RiSearchLine, RiFilterLine,
  RiCloseLine, RiCheckLine, RiAlertLine, RiBookmarkLine,
  RiShareLine, RiMoreLine, RiCalendarLine, RiTrophyLine,
  RiMoneyDollarCircleLine, RiUserLine, RiThumbUpLine,
  RiRefreshLine,
} from 'react-icons/ri'
import { Badge, TokenChip } from '../components/common'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({ content, onClose, onSave }) {
  const [form, setForm] = useState({
    title: content.title || '',
    description: content.description || '',
    token_cost: content.token_cost || 20,
    difficulty: content.difficulty || 'medium',
    tags: (content.tags || []).join(', '),
    topic_name: content.topic_name || '',
  })
  const [saving, setSaving] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    const { error } = await supabase.from('content').update({
      title: form.title.trim(),
      description: form.description.trim(),
      token_cost: parseInt(form.token_cost),
      difficulty: form.difficulty,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      topic_name: form.topic_name.trim(),
    }).eq('id', content.id)
    setSaving(false)
    if (error) return toast.error('Failed to save')
    toast.success('Saved!')
    onSave({ ...content, ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-display font-bold text-gray-900 dark:text-white">Edit Content</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><RiCloseLine size={18} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="input-label">Title</label>
            <input name="title" className="input" value={form.title} onChange={handle} />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea name="description" rows={3} className="input resize-none" value={form.description} onChange={handle} />
          </div>
          <div>
            <label className="input-label">Topic</label>
            <input name="topic_name" className="input" placeholder="e.g. Normalization, Graph Theory" value={form.topic_name} onChange={handle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Token Cost</label>
              <input name="token_cost" type="number" min={1} max={500} className="input" value={form.token_cost} onChange={handle} />
            </div>
            <div>
              <label className="input-label">Difficulty</label>
              <select name="difficulty" className="input" value={form.difficulty} onChange={handle}>
                <option value="beginner">Beginner</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Tags (comma separated)</label>
            <input name="tags" className="input" placeholder="dbms, sql, exam" value={form.tags} onChange={handle} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Content Row ──────────────────────────────────────────────────────────────
function ContentRow({ c, ratings, unlockCounts, onTogglePublish, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avgRating = ratings[c.id] || 0
  const unlocks = unlockCounts[c.id] || 0
  const earned = Math.floor(unlocks * c.token_cost * 0.7)

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            c.type === 'video' ? 'bg-purple-100 dark:bg-purple-950' : 'bg-green-100 dark:bg-green-950'
          }`}>
            {c.type === 'video'
              ? <RiVideoLine size={18} className="text-purple-600 dark:text-purple-400" />
              : <RiFileTextLine size={18} className="text-green-600 dark:text-green-400" />
            }
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{c.description || 'No description'}</p>
              </div>
              {/* More menu */}
              <div className="relative shrink-0" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)} className="btn-ghost btn-icon">
                  <RiMoreLine size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <button onClick={() => { onEdit(c); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <RiEditLine size={14} /> Edit Details
                    </button>
                    <Link to={`/content/${c.id}`}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <RiEyeLine size={14} /> Preview
                    </Link>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/content/${c.id}`); toast.success('Link copied!'); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <RiShareLine size={14} /> Copy Link
                    </button>
                    <button onClick={() => { onTogglePublish(c.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {c.is_published ? <><RiLockLine size={14} /> Unpublish</> : <><RiGlobalLine size={14} /> Publish</>}
                    </button>
                    <button onClick={() => { onDelete(c.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <RiDeleteBinLine size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                c.is_published
                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {c.is_published ? <RiGlobalLine size={10} /> : <RiLockLine size={10} />}
                {c.is_published ? 'Live' : 'Draft'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {c.subject_name && `${c.subject_name}${c.topic_name ? ' · ' + c.topic_name : ''}`}
              </span>
              {(c.tags || []).slice(0, 2).map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 mb-1">
              <RiEyeLine size={11} /> Views
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{(c.views || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 mb-1">
              <RiUserLine size={11} /> Unlocks
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{unlocks}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 mb-1">
              <RiStarLine size={11} /> Rating
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 mb-1">
              <RiCopperCoinLine size={11} /> Earned
            </p>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{earned}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => onTogglePublish(c.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-colors ${
              c.is_published
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                : 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900'
            }`}>
            {c.is_published ? <><RiLockLine size={12} /> Unpublish</> : <><RiGlobalLine size={12} /> Publish</>}
          </button>
          <button onClick={() => onEdit(c)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <RiEditLine size={12} /> Edit
          </button>
          <Link to={`/content/${c.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <RiEyeLine size={12} /> Preview
          </Link>
        </div>
      </div>

      {/* Upload date footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <RiCalendarLine size={11} />
          Uploaded {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          <span className="mx-1">·</span>
          <TokenChip amount={c.token_cost} /> per unlock
        </p>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CreatorDashboard() {
  const { user, profile, loading: authLoading } = useAuthStore()
  const [uploads, setUploads] = useState([])
  const [ratings, setRatings] = useState({})
  const [unlockCounts, setUnlockCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')   // all | video | notes
  const [filterStatus, setFilterStatus] = useState('all') // all | live | draft
  const [sortBy, setSortBy] = useState('newest')
  const [editTarget, setEditTarget] = useState(null)
  const [activeTab, setActiveTab] = useState('content') // content | analytics | earnings

  useEffect(() => {
    if (authLoading) return   // wait for auth to resolve
    if (!user) { setLoading(false); return }
    loadAll()
  }, [user, authLoading])

  const loadAll = async () => {
    setLoading(true)
    const { data: contentData } = await supabase
      .from('content')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    const items = contentData || []
    setUploads(items)

    if (items.length > 0) {
      const ids = items.map(c => c.id)

      // Run ratings + unlocks in parallel
      const [{ data: ratingData }, { data: unlockData }] = await Promise.all([
        supabase.from('ratings').select('content_id, stars').in('content_id', ids),
        supabase.from('unlocks').select('content_id').in('content_id', ids),
      ])

      const ratingMap = {}
      if (ratingData) {
        const grouped = {}
        ratingData.forEach(r => {
          if (!grouped[r.content_id]) grouped[r.content_id] = []
          grouped[r.content_id].push(r.stars)
        })
        Object.entries(grouped).forEach(([id, stars]) => {
          ratingMap[id] = stars.reduce((a, b) => a + b, 0) / stars.length
        })
      }
      setRatings(ratingMap)

      const unlockMap = {}
      if (unlockData) {
        unlockData.forEach(u => {
          unlockMap[u.content_id] = (unlockMap[u.content_id] || 0) + 1
        })
      }
      setUnlockCounts(unlockMap)
    }

    setLoading(false)
  }

  const togglePublish = async (id) => {
    const c = uploads.find(x => x.id === id)
    const { error } = await supabase.from('content').update({ is_published: !c.is_published }).eq('id', id)
    if (error) return toast.error('Failed to update')
    setUploads(u => u.map(x => x.id === id ? { ...x, is_published: !x.is_published } : x))
    toast.success(c.is_published ? 'Unpublished' : 'Published! Students can now find it.')
  }

  const deleteContent = async (id) => {
    if (!confirm('Delete this content permanently? This cannot be undone.')) return
    const { error } = await supabase.from('content').delete().eq('id', id)
    if (error) return toast.error('Failed to delete')
    setUploads(u => u.filter(x => x.id !== id))
    toast.success('Content deleted')
  }

  const handleEditSave = (updated) => {
    setUploads(u => u.map(x => x.id === updated.id ? { ...x, ...updated } : x))
  }

  // ── Derived stats ──
  const totalViews    = uploads.reduce((a, c) => a + (c.views || 0), 0)
  const totalUnlocks  = Object.values(unlockCounts).reduce((a, b) => a + b, 0)
  const totalEarned   = uploads.reduce((a, c) => a + Math.floor((unlockCounts[c.id] || 0) * c.token_cost * 0.7), 0)
  const totalRatings  = Object.values(ratings)
  const avgRating     = totalRatings.length ? (totalRatings.reduce((a, b) => a + b, 0) / totalRatings.length) : 0
  const published     = uploads.filter(c => c.is_published).length
  const drafts        = uploads.length - published

  // ── Filtering + sorting ──
  const filtered = uploads
    .filter(c => {
      if (filterType !== 'all' && c.type !== filterType) return false
      if (filterStatus === 'live' && !c.is_published) return false
      if (filterStatus === 'draft' && c.is_published) return false
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
          !c.description?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0)
      if (sortBy === 'unlocks') return (unlockCounts[b.id] || 0) - (unlockCounts[a.id] || 0)
      if (sortBy === 'earned') return Math.floor((unlockCounts[b.id] || 0) * b.token_cost * 0.7) - Math.floor((unlockCounts[a.id] || 0) * a.token_cost * 0.7)
      if (sortBy === 'rating') return (ratings[b.id] || 0) - (ratings[a.id] || 0)
      return 0
    })

  // Top performers
  const topByViews   = [...uploads].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3)
  const topByEarned  = [...uploads].sort((a, b) =>
    Math.floor((unlockCounts[b.id] || 0) * b.token_cost * 0.7) -
    Math.floor((unlockCounts[a.id] || 0) * a.token_cost * 0.7)
  ).slice(0, 3)

  if (loading) {
    return (
      <div className="page">
        <div className="container-app py-8 max-w-5xl">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container-app py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
              <RiDashboardLine size={22} className="text-white" />
            </div>
            <div>
              <h1 className="section-title">Creator Studio</h1>
              <p className="section-sub">Welcome back, {profile?.username} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="btn-ghost btn-icon" title="Refresh">
              <RiRefreshLine size={16} />
            </button>
            <Link to="/upload" className="btn-primary btn-sm">
              <RiUploadCloud2Line size={14} /> Upload New
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: RiCopperCoinLine,   label: 'Token Balance',  value: (profile?.token_balance || 0).toLocaleString(), color: 'text-brand-500',  bg: 'bg-brand-50 dark:bg-brand-950' },
            { icon: RiEyeLine,           label: 'Total Views',    value: totalViews.toLocaleString(),                    color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950' },
            { icon: RiUserLine,          label: 'Total Unlocks',  value: totalUnlocks.toLocaleString(),                  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950' },
            { icon: RiMoneyDollarCircleLine, label: 'Tokens Earned', value: totalEarned.toLocaleString(),               color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl ${bg} border border-gray-100 dark:border-gray-800 p-4 text-center`}>
              <div className={`w-9 h-9 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-inset text-center py-3">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{uploads.length}</p>
            <p className="text-xs text-gray-500">Total Uploads</p>
          </div>
          <div className="card-inset text-center py-3">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{published}</p>
            <p className="text-xs text-gray-500">Published</p>
          </div>
          <div className="card-inset text-center py-3">
            <p className="text-lg font-bold text-gray-400">{drafts}</p>
            <p className="text-xs text-gray-500">Drafts</p>
          </div>
          <div className="card-inset text-center py-3">
            <p className="text-lg font-bold text-yellow-500">{avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—'}</p>
            <p className="text-xs text-gray-500">Avg Rating</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-6">
          {[
            { id: 'content', label: 'My Content', icon: RiFileTextLine },
            { id: 'analytics', label: 'Analytics', icon: RiBarChartLine },
            { id: 'earnings', label: 'Earnings', icon: RiCopperCoinLine },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── CONTENT TAB ── */}
        {activeTab === 'content' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-48">
                <RiSearchLine size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search your content…"
                  className="input pl-8 py-2 text-sm"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input py-2 text-sm w-auto">
                <option value="all">All Types</option>
                <option value="video">Video</option>
                <option value="notes">Notes</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input py-2 text-sm w-auto">
                <option value="all">All Status</option>
                <option value="live">Live</option>
                <option value="draft">Draft</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input py-2 text-sm w-auto">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="views">Most Views</option>
                <option value="unlocks">Most Unlocks</option>
                <option value="earned">Most Earned</option>
                <option value="rating">Best Rated</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="card text-center py-16">
                <RiUploadCloud2Line size={48} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {uploads.length === 0 ? 'No content uploaded yet' : 'No content matches your filters'}
                </p>
                {uploads.length === 0 && (
                  <Link to="/upload" className="btn-primary btn-sm">Upload Your First Content</Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
                {filtered.map(c => (
                  <ContentRow
                    key={c.id}
                    c={c}
                    ratings={ratings}
                    unlockCounts={unlockCounts}
                    onTogglePublish={togglePublish}
                    onDelete={deleteContent}
                    onEdit={setEditTarget}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {/* Top by views */}
            <div className="card">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <RiEyeLine size={16} className="text-blue-500" /> Top Content by Views
              </h3>
              {topByViews.length === 0
                ? <p className="text-sm text-gray-400">No views yet</p>
                : topByViews.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-600' :
                      i === 1 ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-600'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">{c.subject_name || c.type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{(c.views || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">views</p>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Top by unlocks */}
            <div className="card">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <RiUserLine size={16} className="text-amber-500" /> Top Content by Unlocks
              </h3>
              {uploads.filter(c => unlockCounts[c.id]).length === 0
                ? <p className="text-sm text-gray-400">No unlocks yet — publish your content to start earning</p>
                : [...uploads].sort((a, b) => (unlockCounts[b.id] || 0) - (unlockCounts[a.id] || 0)).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                      <p className="text-xs text-gray-400"><TokenChip amount={c.token_cost} /> per unlock · 70% goes to you</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{unlockCounts[c.id] || 0}</p>
                      <p className="text-xs text-gray-400">unlocks</p>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Ratings breakdown */}
            <div className="card">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <RiStarLine size={16} className="text-yellow-500" /> Ratings Overview
              </h3>
              {Object.keys(ratings).length === 0
                ? <p className="text-sm text-gray-400">No ratings yet</p>
                : uploads.filter(c => ratings[c.id]).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < Math.round(ratings[c.id]) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`}>★</span>
                      ))}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-1">{ratings[c.id].toFixed(1)}</span>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Content type breakdown */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Content Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Videos', count: uploads.filter(c => c.type === 'video').length, color: 'bg-purple-500' },
                    { label: 'Notes', count: uploads.filter(c => c.type === 'notes').length, color: 'bg-green-500' },
                    { label: 'Published', count: published, color: 'bg-brand-500' },
                    { label: 'Drafts', count: drafts, color: 'bg-gray-400' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{label}</span><span>{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`}
                          style={{ width: uploads.length ? `${(count / uploads.length) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Quick Tips</h3>
                <div className="space-y-2">
                  {drafts > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <RiAlertLine size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">You have {drafts} unpublished draft{drafts > 1 ? 's' : ''}. Publish to start earning.</p>
                    </div>
                  )}
                  {avgRating < 3 && avgRating > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                      <RiStarLine size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-400">Your average rating is below 3. Consider improving content quality.</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <RiCheckLine size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-400">You earn 70% of token cost every time a student unlocks your content.</p>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <RiThumbUpLine size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-400">Add tags and topics to your content so students can find it in Browse.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <div className="space-y-5">
            {/* Earnings summary */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Tokens Earned', value: totalEarned, icon: RiCopperCoinLine, color: 'text-brand-500', note: 'From content unlocks' },
                { label: 'Current Balance', value: profile?.token_balance || 0, icon: RiMoneyDollarCircleLine, color: 'text-green-500', note: 'Available to withdraw' },
                { label: 'Total Unlocks', value: totalUnlocks, icon: RiUserLine, color: 'text-amber-500', note: 'Students who paid to access' },
              ].map(({ label, value, icon: Icon, color, note }) => (
                <div key={label} className="card text-center">
                  <Icon size={24} className={`${color} mx-auto mb-2`} />
                  <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                </div>
              ))}
            </div>

            {/* Per-content earnings */}
            <div className="card">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-1">Earnings Per Content</h3>
              <p className="text-xs text-gray-400 mb-4">You receive 70% of the token cost each time a student unlocks your content</p>
              {uploads.length === 0
                ? <p className="text-sm text-gray-400">Upload content to start earning</p>
                : (
                  <div className="space-y-0">
                    <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800">
                      <div className="col-span-2">Content</div>
                      <div className="text-center">Cost</div>
                      <div className="text-center">Unlocks</div>
                      <div className="text-right">Earned</div>
                    </div>
                    {[...uploads]
                      .sort((a, b) => Math.floor((unlockCounts[b.id] || 0) * b.token_cost * 0.7) - Math.floor((unlockCounts[a.id] || 0) * a.token_cost * 0.7))
                      .map(c => {
                        const earned = Math.floor((unlockCounts[c.id] || 0) * c.token_cost * 0.7)
                        return (
                          <div key={c.id} className="grid grid-cols-5 gap-2 items-center py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <div className="col-span-2 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white truncate">{c.title}</p>
                              <p className="text-xs text-gray-400">{c.is_published ? 'Live' : 'Draft'}</p>
                            </div>
                            <div className="text-center">
                              <TokenChip amount={c.token_cost} />
                            </div>
                            <div className="text-center text-sm text-gray-700 dark:text-gray-300">
                              {unlockCounts[c.id] || 0}
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${earned > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                {earned > 0 ? `+${earned}` : '0'}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                )
              }
            </div>

            {/* Withdrawal CTA */}
            <div className="rounded-2xl bg-gradient-brand p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Ready to withdraw?</h3>
                  <p className="text-sm text-white/80 mt-0.5">Minimum 625 tokens · Convert to real money via UPI or bank transfer</p>
                </div>
                <Link to="/wallet" className="shrink-0 px-4 py-2 rounded-xl bg-white text-brand-700 font-semibold text-sm hover:bg-brand-50 transition-colors">
                  Go to Wallet
                </Link>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-white/70">Your current balance: <strong className="text-white">{(profile?.token_balance || 0).toLocaleString()} tokens</strong> · 625 tokens = ₹62.5</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          content={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
