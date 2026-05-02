import { useEffect, useState } from 'react'
import { RiArrowUpLine, RiArrowDownLine, RiGiftLine, RiUploadCloud2Line, RiLockUnlockLine } from 'react-icons/ri'
import { TokenChip } from '../components/common'
import { CardSkeleton } from '../components/common/Skeleton'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

const iconMap = {
  earn:  { icon: RiArrowUpLine,   color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-950' },
  spend: { icon: RiArrowDownLine, color: 'text-red-500',   bg: 'bg-red-100 dark:bg-red-950'    },
}

export default function Wallet() {
  const { profile } = useAuthStore()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTransactions(data || [])
        setLoading(false)
      })
  }, [profile])

  const totalEarned = transactions.filter(t => t.type === 'earn').reduce((a, t) => a + t.amount, 0)
  const totalSpent  = transactions.filter(t => t.type === 'spend').reduce((a, t) => a + t.amount, 0)

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="page">
      <div className="container-app py-8 max-w-2xl">

        {/* Balance Card */}
        <div className="relative rounded-3xl bg-gradient-brand p-8 mb-6 overflow-hidden shadow-glow-lg">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <p className="text-brand-200 text-sm font-medium mb-1 relative">Token Balance</p>
          <div className="flex items-end gap-2 relative">
            <span className="text-5xl font-display font-bold text-white">{profile?.token_balance ?? 0}</span>
            <span className="text-brand-200 mb-1">tokens</span>
          </div>
          <div className="flex gap-4 mt-4 relative">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalEarned}</p>
              <p className="text-xs text-brand-200">Total Earned</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalSpent}</p>
              <p className="text-xs text-brand-200">Total Spent</p>
            </div>
          </div>
        </div>

        {/* How to earn */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: RiUploadCloud2Line, label: 'Upload content', desc: 'Earn when unlocked' },
            { icon: RiGiftLine,         label: 'Rate content',   desc: '+2 tokens each'     },
            { icon: RiLockUnlockLine,   label: 'Get unlocked',   desc: 'Earn per unlock'    },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card-inset text-center py-4">
              <Icon size={20} className="text-brand-500 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Transaction History</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet. Unlock content to get started!</p>
          ) : (
            <div className="space-y-1">
              {transactions.map(t => {
                const { icon: Icon, color, bg } = iconMap[t.type]
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.reason}</p>
                      <p className="text-xs text-gray-400">{timeAgo(t.created_at)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{t.amount}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
