import { useState, useEffect } from 'react'
import {
  RiShieldLine, RiFlagLine, RiCheckLine,
  RiDeleteBinLine, RiMedalLine, RiUserLine, RiBankLine, RiCloseLine,
} from 'react-icons/ri'
import { Badge, Button, Avatar } from '../components/common'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'withdrawals', label: 'Withdrawal Requests' },
  { id: 'reports',     label: 'Reports'            },
  { id: 'creators',    label: 'Verify Creators'    },
  { id: 'content',     label: 'Content Moderation' },
]

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('withdrawals')
  const [withdrawals, setWithdrawals] = useState([])
  const [reports, setReports]     = useState([])
  const [creators, setCreators]   = useState([])
  const [content, setContent]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWithdrawals()
    loadReports()
    loadCreators()
    loadContent()
  }, [])

  const loadWithdrawals = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        profiles!withdrawal_requests_user_id_fkey(username, email)
      `)
      .order('created_at', { ascending: false })
    setWithdrawals(data || [])
    setLoading(false)
  }

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        content(title),
        reporter:profiles!reports_user_id_fkey(username)
      `)
      .order('created_at', { ascending: false })
    setReports(data || [])
  }

  const loadCreators = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, content(id)')
      .order('token_balance', { ascending: false })
      .limit(20)
    setCreators((data || []).map(p => ({
      ...p,
      uploads: p.content?.length || 0
    })))
  }

  const loadContent = async () => {
    const { data } = await supabase
      .from('content')
      .select('*, creator:profiles(username)')
      .order('created_at', { ascending: false })
      .limit(50)
    setContent(data || [])
  }

  const handleWithdrawal = async (id, action) => {
    const request = withdrawals.find(w => w.id === id)
    if (!request) return

    if (action === 'approve') {
      const txId = prompt('Enter transaction/reference ID:')
      if (!txId) return

      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          transaction_id: txId,
          admin_note: 'Approved and processed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (!error) {
        toast.success('Withdrawal approved!')
        loadWithdrawals()
      }
    } else if (action === 'reject') {
      // Guard against double-refund: only act on still-pending requests
      if (request.status !== 'pending') return toast.error('This request was already processed')
      const reason = prompt('Rejection reason:')
      if (!reason) return

      // Mark rejected FIRST (and only if still pending) so a refund can't run twice
      const { data: updated, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          admin_note: reason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select()

      if (error || !updated?.length) {
        return toast.error('Could not reject — it may already be processed')
      }

      // Now refund tokens; if this fails, surface it so it can be retried manually
      const { error: refundError } = await supabase.rpc('refund_tokens', {
        p_user_id: request.user_id,
        p_amount: request.tokens_amount,
        p_reason: `Withdrawal rejected: ${reason}`,
      })
      if (refundError) {
        toast.error('Marked rejected, but refund failed — refund manually')
      } else {
        toast.success('Withdrawal rejected, tokens refunded')
      }
      loadWithdrawals()
    }
  }

  const resolveReport = async (id, action) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: action })
      .eq('id', id)
    
    if (!error) {
      setReports(r => r.map(x => x.id === id ? { ...x, status: action } : x))
      toast.success(`Report marked as ${action}`)
    }
  }

  const toggleVerify = async (id) => {
    const creator = creators.find(x => x.id === id)
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !creator.is_verified })
      .eq('id', id)
    
    if (!error) {
      setCreators(c => c.map(x => x.id === id ? { ...x, is_verified: !x.is_verified } : x))
      toast.success(`${creator.username} ${creator.is_verified ? 'unverified' : 'verified'}`)
    }
  }

  const toggleContent = async (id) => {
    const item = content.find(x => x.id === id)
    const { error } = await supabase
      .from('content')
      .update({ is_published: !item.is_published })
      .eq('id', id)
    
    if (!error) {
      setContent(c => c.map(x => x.id === id ? { ...x, is_published: !x.is_published } : x))
      toast.success('Content status updated')
    }
  }

  return (
    <div className="page">
      <div className="container-app py-8 max-w-4xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
            <RiShieldLine size={22} className="text-white" />
          </div>
          <div>
            <h1 className="section-title">Admin Panel</h1>
            <p className="section-sub">Moderate content and manage creators</p>
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

        {/* Withdrawal Requests */}
        {activeTab === 'withdrawals' && (
          <div className="card space-y-3 animate-fade-in">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
              </div>
            ) : withdrawals.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No withdrawal requests</p>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        @{w.profiles?.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{w.profiles?.email}</p>
                    </div>
                    <Badge variant={w.status === 'pending' ? 'amber' : w.status === 'approved' ? 'green' : 'red'}>
                      {w.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {w.tokens_amount} tokens → ₹{w.inr_amount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Method</p>
                      <p className="font-semibold text-gray-900 dark:text-white uppercase">{w.method}</p>
                    </div>
                  </div>
                  {w.method === 'upi' ? (
                    <div className="text-xs">
                      <p className="text-gray-500">UPI ID</p>
                      <p className="font-mono font-semibold text-gray-900 dark:text-white">{w.upi_id}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Bank</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{w.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Account</p>
                        <p className="font-mono font-semibold text-gray-900 dark:text-white">{w.account_number}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">IFSC</p>
                        <p className="font-mono font-semibold text-gray-900 dark:text-white">{w.ifsc_code}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Holder</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{w.account_holder}</p>
                      </div>
                    </div>
                  )}
                  {w.transaction_id && (
                    <div className="text-xs">
                      <p className="text-gray-500">Transaction ID</p>
                      <p className="font-mono text-green-600 dark:text-green-400">{w.transaction_id}</p>
                    </div>
                  )}
                  {w.admin_note && (
                    <div className="text-xs">
                      <p className="text-gray-500">Admin Note</p>
                      <p className="text-gray-700 dark:text-gray-300">{w.admin_note}</p>
                    </div>
                  )}
                  {w.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleWithdrawal(w.id, 'approve')}
                        className="btn-primary btn-sm flex-1"
                      >
                        <RiCheckLine size={14} /> Approve & Process
                      </button>
                      <button
                        onClick={() => handleWithdrawal(w.id, 'reject')}
                        className="btn-danger btn-sm flex-1"
                      >
                        <RiCloseLine size={14} /> Reject & Refund
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <div className="card space-y-3 animate-fade-in">
            {reports.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No reports</p>
            ) : reports.map(r => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.content?.title || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reason: {r.reason} · by @{r.reporter?.username || 'Unknown'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={r.status === 'pending' ? 'amber' : 'green'}>{r.status}</Badge>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => resolveReport(r.id, 'reviewed')}
                        className="btn-secondary btn-sm"><RiCheckLine size={13} /> Resolve</button>
                      <button onClick={() => resolveReport(r.id, 'removed')}
                        className="btn-danger btn-sm"><RiDeleteBinLine size={13} /> Remove</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Creators */}
        {activeTab === 'creators' && (
          <div className="card space-y-2 animate-fade-in">
            {creators.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No creators</p>
            ) : creators.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <Avatar name={c.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.username}</p>
                    {c.is_verified && <RiMedalLine size={14} className="text-brand-500" />}
                  </div>
                  <p className="text-xs text-gray-400">@{c.username} · {c.uploads} uploads</p>
                </div>
                <button onClick={() => toggleVerify(c.id)}
                  className={`btn-sm ${c.is_verified ? 'btn-secondary' : 'btn-primary'}`}>
                  <RiMedalLine size={13} />
                  {c.is_verified ? 'Unverify' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content Moderation */}
        {activeTab === 'content' && (
          <div className="card space-y-2 animate-fade-in">
            {content.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No content</p>
            ) : content.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                  <p className="text-xs text-gray-400">by @{c.creator?.username || 'Unknown'}</p>
                </div>
                <Badge variant={c.is_published ? 'green' : 'gray'}>{c.is_published ? 'Live' : 'Draft'}</Badge>
                <button onClick={() => toggleContent(c.id)}
                  className={`btn-sm ${c.is_published ? 'btn-danger' : 'btn-primary'}`}>
                  {c.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
