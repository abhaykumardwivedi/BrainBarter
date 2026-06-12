import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  RiPlayCircleLine, RiFileTextLine, RiStarFill,
  RiBookmarkLine, RiBookmarkFill, RiShareLine,
  RiFlagLine, RiLockLine, RiSparklingLine,
  RiCheckLine, RiArrowLeftLine,
} from 'react-icons/ri'
import { Button, Badge, TokenChip, Avatar, Modal } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const aiTabs = [
  { id: 'summarize',        label: 'Summarize' },
  { id: 'simplify',         label: 'Simplify'  },
  { id: 'doubt',            label: 'Ask Doubt' },
  { id: 'generate-notes',   label: 'Gen Notes' },
  { id: 'generate-questions',label: 'Questions'},
]

const reportReasons = ['Incorrect content','Duplicate content','Misleading tags','Low quality','Other']

export default function ContentPage() {
  const { id } = useParams()
  const { user, profile, setProfile } = useAuthStore()

  const [content, setContent]         = useState(null)
  const [unlocked, setUnlocked]       = useState(false)
  const [bookmarked, setBookmarked]   = useState(false)
  const [userRating, setUserRating]   = useState(0)
  const [marked, setMarked]           = useState(false)
  const [loading, setLoading]         = useState(true)
  const [unlocking, setUnlocking]     = useState(false)
  const [reportOpen, setReportOpen]   = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting]     = useState(false)
  const [aiTab, setAiTab]             = useState('summarize')
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiResponse, setAiResponse]   = useState('')
  const [doubt, setDoubt]             = useState('')

  useEffect(() => {
    if (!id) return
    // Fetch content
    supabase.from('content')
      .select('*, creator:profiles(id, username, avatar_url, is_verified)')
      .eq('id', id).single()
      .then(({ data }) => { setContent(data); setLoading(false) })

    // Increment views atomically (counts anonymous views too)
    supabase.rpc('increment_views', { content_id: id }).then(() => {})

    if (!user) return
    // Check unlock
    supabase.from('unlocks').select('id').eq('user_id', user.id).eq('content_id', id).single()
      .then(({ data }) => { if (data) setUnlocked(true) })
    // Check bookmark
    supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('content_id', id).single()
      .then(({ data }) => { if (data) setBookmarked(true) })
    // Check rating
    supabase.from('ratings').select('stars').eq('user_id', user.id).eq('content_id', id).single()
      .then(({ data }) => { if (data) setUserRating(data.stars) })
  }, [id, user])

  // Check progress once content (and its topic_id) is loaded
  useEffect(() => {
    if (!user || !content?.topic_id) return
    supabase.from('progress').select('completed_at')
      .eq('user_id', user.id).eq('topic_id', content.topic_id)
      .then(({ data }) => { if (data?.[0]?.completed_at) setMarked(true) })
  }, [user, content?.topic_id])

  const handleUnlock = async () => {
    if (!user) return toast.error('Please login to unlock')
    if (profile.token_balance < content.token_cost) return toast.error('Insufficient tokens')
    setUnlocking(true)
    const { error } = await supabase.rpc('unlock_content', {
      p_user_id:    user.id,
      p_content_id: content.id,
      p_cost:       content.token_cost,
      p_creator_id: content.creator.id,
    })
    if (error) { toast.error(error.message); setUnlocking(false); return }
    // Refresh profile balance
    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(updatedProfile)
    setUnlocked(true)
    setUnlocking(false)
    toast.success('Content unlocked!')
  }

  const handleBookmark = async () => {
    if (!user) return toast.error('Please login')
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('content_id', id)
      setBookmarked(false)
      toast.success('Bookmark removed')
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, content_id: id })
      setBookmarked(true)
      toast.success('Bookmarked!')
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied!')
  }

  const handleRating = async (stars) => {
    if (!user) return toast.error('Please login')
    await supabase.from('ratings').upsert({ user_id: user.id, content_id: id, stars })
    setUserRating(stars)
    // Give +2 tokens for rating
    await supabase.from('token_transactions').insert({ user_id: user.id, type: 'earn', amount: 2, reason: 'Rated content', ref_id: id })
    await supabase.from('profiles').update({ token_balance: (profile.token_balance || 0) + 2 }).eq('id', user.id)
    const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(updatedProfile)
    toast.success(`Rated ${stars} stars! +2 tokens`)
  }

  const handleMarkComplete = async () => {
    if (!user || !content?.topic_id) return
    await supabase.from('progress').upsert({ user_id: user.id, topic_id: content.topic_id, completed_at: new Date().toISOString() })
    setMarked(true)
    toast.success('Marked as complete!')
  }

  const handleReport = async () => {
    if (!reportReason) return toast.error('Please select a reason')
    setReporting(true)
    await supabase.from('reports').insert({ user_id: user.id, content_id: id, reason: reportReason })
    setReporting(false)
    setReportOpen(false)
    setReportReason('')
    toast.success('Report submitted. Thank you!')
  }

  const runAI = async () => {
    if (!user) return toast.error('Please login')
    setAiLoading(true)
    setAiResponse('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ taskType: aiTab, contentId: id, userMessage: doubt }),
      })
      const data = await res.json()
      setAiResponse(data.response || data.error)
    } catch {
      setAiResponse('AI service unavailable. Make sure the server is running.')
    }
    setAiLoading(false)
  }

  if (loading) return (
    <div className="page"><div className="container-app py-6">
      <div className="skeleton h-80 rounded-2xl mb-4" />
      <div className="skeleton h-8 w-2/3 mb-2" />
      <div className="skeleton h-4 w-1/3" />
    </div></div>
  )

  if (!content) return (
    <div className="page flex items-center justify-center">
      <p className="text-gray-500">Content not found.</p>
    </div>
  )

  const diffColor = { beginner: 'green', medium: 'amber', advanced: 'red' }

  return (
    <div className="page">
      <div className="container-app py-6">
        <Link to="/browse" className="btn-ghost btn-sm inline-flex mb-4">
          <RiArrowLeftLine size={14} /> Back to Browse
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Main */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className="card p-0 overflow-hidden">
              <div className="relative bg-gradient-dark h-64 sm:h-80 flex items-center justify-center">
                {unlocked ? (
                  content.type === 'video'
                    ? <video src={content.file_url} controls className="w-full h-full object-contain animate-fade-in" />
                    : <div className="text-center animate-fade-in p-4">
                        <RiFileTextLine size={48} className="text-brand-400 mx-auto mb-3" />
                        <a href={content.file_url} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
                          Open Notes / PDF
                        </a>
                      </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <RiLockLine size={28} className="text-white" />
                    </div>
                    <p className="text-white font-medium mb-1">Preview ends here</p>
                    <p className="text-gray-400 text-sm mb-4">Unlock to access full content</p>
                    <Button onClick={handleUnlock} loading={unlocking} className="shadow-glow">
                      Unlock for <TokenChip amount={content.token_cost} className="ml-1 bg-white/20 text-white" />
                    </Button>
                  </div>
                )}
                <span className="absolute top-3 left-3">
                  <Badge variant={content.type === 'video' ? 'purple' : 'green'}>{content.type}</Badge>
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white leading-snug">{content.title}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar name={content.creator?.username} src={content.creator?.avatar_url} size="sm" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">@{content.creator?.username}</span>
                      {content.creator?.is_verified && <Badge variant="purple" className="text-xs">✓ Verified</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={handleBookmark} className="btn-ghost btn-icon">
                      {bookmarked ? <RiBookmarkFill size={18} className="text-brand-600" /> : <RiBookmarkLine size={18} />}
                    </button>
                    <button onClick={handleShare} className="btn-ghost btn-icon"><RiShareLine size={18} /></button>
                    <button onClick={() => setReportOpen(true)} className="btn-ghost btn-icon text-red-400"><RiFlagLine size={18} /></button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant={diffColor[content.difficulty] || 'gray'}>{content.difficulty}</Badge>
                  {content.tags?.map(t => <Badge key={t} variant="gray">{t}</Badge>)}
                </div>

                {content.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">{content.description}</p>
                )}

                {unlocked && !marked && (
                  <button onClick={handleMarkComplete} className="btn-secondary btn-sm mt-4">
                    <RiCheckLine size={14} /> Mark as Complete
                  </button>
                )}
                {marked && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-4">
                    <RiCheckLine size={14} /> Completed
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            {unlocked && (
              <div className="card animate-fade-in">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Rate this content</h3>
                <div className="flex gap-1 items-center">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => handleRating(s)}>
                      <RiStarFill size={24} className={s <= userRating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'} />
                    </button>
                  ))}
                  {userRating > 0 && <span className="text-xs text-gray-500 ml-2">+2 tokens earned!</span>}
                </div>
              </div>
            )}
          </div>

          {/* AI Panel */}
          <div className="lg:w-80 shrink-0">
            <div className="card sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <RiSparklingLine size={18} className="text-brand-500" />
                <h3 className="font-display font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                {!unlocked && <Badge variant="gray" className="ml-auto text-xs">Unlock to use</Badge>}
              </div>

              {!unlocked ? (
                <div className="card-inset text-center py-8">
                  <RiLockLine size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Unlock content to access AI features</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 mb-4 p-1 bg-gray-100 dark:bg-[#130d24] rounded-xl">
                    {aiTabs.map(({ id: tid, label }) => (
                      <button key={tid} onClick={() => { setAiTab(tid); setAiResponse('') }}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all
                          ${aiTab === tid
                            ? 'bg-white dark:bg-[#1a1030] text-brand-700 dark:text-brand-300 shadow-neu-sm dark:shadow-neu-dark-sm'
                            : 'text-gray-500 hover:text-brand-600 dark:text-gray-400'
                          }`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {aiTab === 'doubt' && (
                    <textarea rows={2} placeholder="Type your doubt..."
                      className="input resize-none mb-3 text-xs"
                      value={doubt} onChange={e => setDoubt(e.target.value)} />
                  )}

                  <Button onClick={runAI} loading={aiLoading} className="w-full mb-3" size="sm">
                    <RiSparklingLine size={14} />
                    {aiLoading ? 'Generating...' : 'Generate'}
                  </Button>

                  {aiLoading ? (
                    <div className="card-inset flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    </div>
                  ) : aiResponse ? (
                    <div className="card-inset animate-fade-in">
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{aiResponse}</pre>
                      <button onClick={() => navigator.clipboard.writeText(aiResponse).then(() => toast.success('Copied!'))}
                        className="btn-ghost btn-sm mt-2 w-full">Copy</button>
                    </div>
                  ) : (
                    <div className="card-inset text-center py-6">
                      <RiSparklingLine size={20} className="text-brand-300 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Click Generate to get AI help</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report Content">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a reason for reporting:</p>
        <div className="space-y-2 mb-5">
          {reportReasons.map(r => (
            <button key={r} onClick={() => setReportReason(r)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border-2 transition-all
                ${reportReason === r
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-300'
                }`}>
              {r}
            </button>
          ))}
        </div>
        <Button onClick={handleReport} loading={reporting} className="w-full">Submit Report</Button>
      </Modal>
    </div>
  )
}
