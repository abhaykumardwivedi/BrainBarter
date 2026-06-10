import { useState, useEffect } from 'react'
import {
  RiDashboardLine, RiUploadCloud2Line, RiEyeLine,
  RiLockUnlockLine, RiCopperCoinLine, RiStarLine,
  RiEditLine, RiDeleteBinLine, RiToggleLine,
} from 'react-icons/ri'
import { Badge, TokenChip, Button } from '../components/common'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function CreatorDashboard() {
  const { user, profile } = useAuthStore()
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadContent()
  }, [user])

  const loadContent = async () => {
    const { data } = await supabase
      .from('content')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
    
    setUploads(data || [])
    setLoading(false)
  }

  const togglePublish = async (id) => {
    const content = uploads.find(c => c.id === id)
    const { error } = await supabase
      .from('content')
      .update({ is_published: !content.is_published })
      .eq('id', id)
    
    if (error) {
      toast.error('Failed to update')
      return
    }
    
    setUploads(u => u.map(c => c.id === id ? { ...c, is_published: !c.is_published } : c))
    toast.success(content.is_published ? 'Unpublished' : 'Published!')
  }

  const deleteContent = async (id) => {
    if (!confirm('Delete this content? This cannot be undone.')) return
    
    const { error } = await supabase.from('content').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    
    setUploads(u => u.filter(c => c.id !== id))
    toast.success('Content deleted')
  }

  const totalViews   = uploads.reduce((a, c) => a + (c.views || 0), 0)
  
  if (loading) {
    return (
      <div className="page">
        <div className="container-app py-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container-app py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
              <RiDashboardLine size={22} className="text-white" />
            </div>
            <div>
              <h1 className="section-title">Creator Dashboard</h1>
              <p className="section-sub">Welcome back, {profile?.username}</p>
            </div>
          </div>
          <Link to="/upload" className="btn-primary btn-sm">
            <RiUploadCloud2Line size={14} /> Upload New
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: RiCopperCoinLine,  label: 'Token Balance', value: profile?.token_balance || 0,  color: 'text-brand-500'  },
            { icon: RiEyeLine,         label: 'Total Views',   value: totalViews,   color: 'text-blue-500'   },
            { icon: RiUploadCloud2Line,label: 'Total Uploads', value: uploads.length, color: 'text-amber-500'},
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card-inset text-center py-5">
              <Icon size={20} className={`${color} mx-auto mb-2`} />
              <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Content List */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Your Content</h3>
          {uploads.length === 0 ? (
            <div className="text-center py-12">
              <RiUploadCloud2Line size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No content uploaded yet</p>
              <Link to="/upload" className="btn-primary btn-sm">Upload Your First Content</Link>
            </div>
          ) : (
            <div className="space-y-3">
            {uploads.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    <Badge variant={c.type === 'video' ? 'purple' : 'green'}>{c.type}</Badge>
                    <Badge variant={c.is_published ? 'green' : 'gray'}>{c.is_published ? 'Live' : 'Draft'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><RiEyeLine size={11} /> {c.views || 0} views</span>
                    <span className="flex items-center gap-1"><TokenChip amount={c.token_cost} /></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublish(c.id)}
                    className={`btn-sm ${c.is_published ? 'btn-secondary' : 'btn-primary'}`}>
                    <RiToggleLine size={14} />
                    {c.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link to={`/content/${c.id}`} className="btn-ghost btn-icon" title="View">
                    <RiEyeLine size={16} />
                  </Link>
                  <button onClick={() => deleteContent(c.id)} className="btn-ghost btn-icon text-red-400" title="Delete">
                    <RiDeleteBinLine size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

      </div>
    </div>
  )
}
