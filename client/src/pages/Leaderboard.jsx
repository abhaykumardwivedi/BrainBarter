import { useEffect, useState } from 'react'
import { RiTrophyLine, RiMedalLine, RiUploadCloud2Line, RiStarLine } from 'react-icons/ri'
import { Avatar, TokenChip } from '../components/common'
import { supabase } from '../lib/supabase'

const rankStyle = {
  1: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  2: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  3: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
}

export default function Leaderboard() {
  const [period, setPeriod]   = useState('all')
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('profiles')
      .select('id, username, avatar_url, token_balance, is_verified')
      .order('token_balance', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setLeaders(data || [])
        setLoading(false)
      })
  }, [period])

  const top3 = leaders.slice(0, 3)
  const rest  = leaders.slice(3)

  if (loading) {
    return (
      <div className="page">
        <div className="container-app py-8 max-w-3xl">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container-app py-8 max-w-3xl">

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow mx-auto mb-4">
            <RiTrophyLine size={26} className="text-white" />
          </div>
          <h1 className="section-title text-3xl">Leaderboard</h1>
          <p className="section-sub">Top creators ranked by tokens earned</p>
        </div>

        <div className="tab-bar mb-8 max-w-xs mx-auto">
          {['week', 'month', 'all'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={period === p ? 'tab-item-active' : 'tab-item'}>
              {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8 items-end">
            {[top3[1], top3[0], top3[2]].map((u, i) => {
              const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3
              const heights = ['h-28', 'h-36', 'h-24']
              return (
                <div key={u.id} className={`card text-center flex flex-col items-center justify-end ${heights[i]} pb-4 relative`}>
                  {actualRank === 1 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>}
                  <Avatar name={u.username} src={u.avatar_url} size={actualRank === 1 ? 'lg' : 'md'} />
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-2 truncate w-full px-1">{u.username}</p>
                  <TokenChip amount={u.token_balance} className="mt-1 text-xs" />
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rankStyle[actualRank]}`}>
                    {actualRank}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Rest */}
        <div className="card space-y-1 p-2">
          {rest.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="w-6 text-center text-sm font-semibold text-gray-400">{i + 4}</span>
              <Avatar name={u.username} src={u.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.username}</p>
                  {u.is_verified && <RiMedalLine size={14} className="text-brand-500 shrink-0" />}
                </div>
              </div>
              <TokenChip amount={u.token_balance} />
            </div>
          ))}
          {leaders.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No creators yet. Be the first to upload!</p>
          )}
        </div>

      </div>
    </div>
  )
}
