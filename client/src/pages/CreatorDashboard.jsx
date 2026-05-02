import { useState } from 'react'
import {
  RiDashboardLine, RiUploadCloud2Line, RiEyeLine,
  RiLockUnlockLine, RiCopperCoinLine, RiStarLine,
  RiEditLine, RiDeleteBinLine, RiToggleLine,
} from 'react-icons/ri'
import { Badge, TokenChip, Button } from '../components/common'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const mockUploads = [
  { id: 1, title: 'Normalization — 1NF to BCNF', type: 'video', views: 320, unlocks: 48, rating: 4.8, tokens: 240, published: true  },
  { id: 2, title: 'ER Diagram Complete Notes',   type: 'notes', views: 210, unlocks: 32, rating: 4.5, tokens: 96,  published: true  },
  { id: 3, title: 'SQL Queries Cheatsheet',      type: 'notes', views: 0,   unlocks: 0,  rating: 0,   tokens: 0,   published: false },
]

export default function CreatorDashboard() {
  const { profile } = useAuthStore()
  const [uploads, setUploads] = useState(mockUploads)

  const togglePublish = (id) => {
    setUploads(u => u.map(c => c.id === id ? { ...c, published: !c.published } : c))
  }

  const totalTokens  = uploads.reduce((a, c) => a + c.tokens, 0)
  const totalViews   = uploads.reduce((a, c) => a + c.views, 0)
  const totalUnlocks = uploads.reduce((a, c) => a + c.unlocks, 0)

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: RiCopperCoinLine,  label: 'Tokens Earned', value: totalTokens,  color: 'text-brand-500'  },
            { icon: RiEyeLine,         label: 'Total Views',   value: totalViews,   color: 'text-blue-500'   },
            { icon: RiLockUnlockLine,  label: 'Total Unlocks', value: totalUnlocks, color: 'text-green-500'  },
            { icon: RiUploadCloud2Line,label: 'Uploads',       value: uploads.length, color: 'text-amber-500'},
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
          <div className="space-y-3">
            {uploads.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    <Badge variant={c.type === 'video' ? 'purple' : 'green'}>{c.type}</Badge>
                    <Badge variant={c.published ? 'green' : 'gray'}>{c.published ? 'Live' : 'Draft'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><RiEyeLine size={11} /> {c.views} views</span>
                    <span className="flex items-center gap-1"><RiLockUnlockLine size={11} /> {c.unlocks} unlocks</span>
                    {c.rating > 0 && <span className="flex items-center gap-1"><RiStarLine size={11} /> {c.rating}</span>}
                    <span className="flex items-center gap-1"><RiCopperCoinLine size={11} className="text-brand-500" /> {c.tokens} earned</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublish(c.id)}
                    className={`btn-sm ${c.published ? 'btn-secondary' : 'btn-primary'}`}>
                    <RiToggleLine size={14} />
                    {c.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link to={`/content/${c.id}`} className="btn-ghost btn-icon" title="View">
                    <RiEyeLine size={16} />
                  </Link>
                  <button className="btn-ghost btn-icon text-red-400" title="Delete">
                    <RiDeleteBinLine size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
