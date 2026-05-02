import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RiEditLine, RiBookmarkLine, RiCheckboxCircleLine,
  RiCopperCoinLine, RiUploadCloud2Line, RiSaveLine,
} from 'react-icons/ri'
import { Avatar, Badge, Button, Input } from '../components/common'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'progress',  label: 'Progress'  },
]

export default function Profile() {
  const { profile, setProfile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({ username: profile?.username || '', bio: profile?.bio || '' })
  const [saving, setSaving]       = useState(false)
  const [bookmarks, setBookmarks] = useState([])
  const [progress, setProgress]   = useState([])
  const [stats, setStats]         = useState({ uploads: 0 })

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => {
    if (!profile) return
    // Fetch bookmarks
    supabase.from('bookmarks').select('*, content(id, title, type)')
      .eq('user_id', profile.id)
      .then(({ data }) => setBookmarks(data || []))
    // Fetch progress
    supabase.from('progress').select('*, topic:topics(name, unit:units(subject:subjects(name)))')
      .eq('user_id', profile.id)
      .then(({ data }) => setProgress(data || []))
    // Fetch upload count
    supabase.from('content').select('id', { count: 'exact' })
      .eq('creator_id', profile.id)
      .then(({ count }) => setStats(s => ({ ...s, uploads: count || 0 })))
  }, [profile])

  const saveProfile = async () => {
    setSaving(true)
    const { data, error } = await supabase
      .from('profiles').update({ username: form.username, bio: form.bio })
      .eq('id', profile.id).select().single()
    setSaving(false)
    if (error) return toast.error(error.message)
    setProfile(data)
    setEditing(false)
    toast.success('Profile updated!')
  }

  const completedCount = progress.filter(p => p.completed_at).length

  return (
    <div className="page">
      <div className="container-app py-8 max-w-4xl">

        {/* Header */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar name={profile?.username} src={profile?.avatar_url} size="xl" />
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <Input label="Username" name="username" value={form.username} onChange={handle} />
                  <div>
                    <label className="input-label">Bio</label>
                    <textarea name="bio" rows={2} className="input resize-none"
                      placeholder="Tell others about yourself..."
                      value={form.bio} onChange={handle} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={saving} onClick={saveProfile}>
                      <RiSaveLine size={14} /> Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{profile?.username}</h1>
                    {profile?.is_verified && <Badge variant="purple">✓ Verified</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{profile?.bio || 'No bio yet.'}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><RiCopperCoinLine size={14} className="text-brand-500" /> {profile?.token_balance} tokens</span>
                    <span className="flex items-center gap-1"><RiCheckboxCircleLine size={14} className="text-green-500" /> {completedCount} completed</span>
                    <span className="flex items-center gap-1"><RiBookmarkLine size={14} className="text-amber-500" /> {bookmarks.length} bookmarks</span>
                    <span className="flex items-center gap-1"><RiUploadCloud2Line size={14} className="text-blue-500" /> {stats.uploads} uploads</span>
                  </div>
                </>
              )}
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary btn-sm shrink-0">
                <RiEditLine size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar mb-6">
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={activeTab === id ? 'tab-item-active' : 'tab-item'}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid sm:grid-cols-3 gap-4 animate-fade-in">
            {[
              { icon: RiCopperCoinLine,     label: 'Token Balance',    value: profile?.token_balance ?? 0, color: 'text-brand-500' },
              { icon: RiCheckboxCircleLine, label: 'Topics Completed', value: completedCount,              color: 'text-green-500' },
              { icon: RiBookmarkLine,       label: 'Bookmarks',        value: bookmarks.length,            color: 'text-amber-500' },
              { icon: RiUploadCloud2Line,   label: 'Uploads',          value: stats.uploads,               color: 'text-blue-500'  },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card-inset text-center py-5">
                <Icon size={22} className={`${color} mx-auto mb-2`} />
                <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
            <div className="card-inset text-center py-5 flex items-center justify-center">
              <Link to="/dashboard" className="btn-primary btn-sm w-full">Go to Dashboard</Link>
            </div>
          </div>
        )}

        {/* Bookmarks */}
        {activeTab === 'bookmarks' && (
          <div className="card animate-fade-in space-y-1 p-2">
            {bookmarks.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No bookmarks yet.</p>
              : bookmarks.map(b => (
                  <Link key={b.id} to={`/content/${b.content?.id}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center shrink-0">
                      <RiBookmarkLine size={16} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.content?.title}</p>
                    </div>
                    <Badge variant={b.content?.type === 'video' ? 'purple' : 'green'}>{b.content?.type}</Badge>
                  </Link>
                ))
            }
          </div>
        )}

        {/* Progress */}
        {activeTab === 'progress' && (
          <div className="card animate-fade-in space-y-1 p-2">
            {progress.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No progress tracked yet.</p>
              : progress.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <RiCheckboxCircleLine size={18} className={p.completed_at ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{p.topic?.name}</p>
                      <p className="text-xs text-gray-400">{p.topic?.unit?.subject?.name}</p>
                    </div>
                    <Badge variant={p.completed_at ? 'green' : 'gray'}>{p.completed_at ? 'Done' : 'In Progress'}</Badge>
                  </div>
                ))
            }
          </div>
        )}

      </div>
    </div>
  )
}
