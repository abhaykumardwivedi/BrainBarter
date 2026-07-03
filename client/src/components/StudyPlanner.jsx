import { useState, useEffect, useCallback } from 'react'
import {
  RiCalendarLine, RiCheckLine, RiCloseLine, RiErrorWarningLine,
  RiSparklingLine, RiHistoryLine, RiArrowLeftLine, RiFireLine,
  RiContrastLine, RiTimeLine,
} from 'react-icons/ri'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL
const DAY_OPTIONS = [3, 5, 7, 14, 21, 30]

// Auth'd JSON fetch — same token pattern used across the app (getSession →
// Bearer). Throws with the server's error message so callers can toast it.
async function authedFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

const STATUS_META = {
  done:    { label: 'Done',      cls: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40' },
  partial: { label: 'Partial',   cls: 'bg-amber-600/20 text-amber-300 border-amber-600/40' },
  skipped: { label: 'Skipped',   cls: 'bg-gray-600/20 text-gray-300 border-gray-600/40' },
  pending: { label: 'Pending',   cls: 'bg-red-950/40 text-exam-300/70 border-exam-900/50' },
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }
  catch { return '' }
}

// ---- Day card -------------------------------------------------------------
function DayCard({ day, busy, onSet }) {
  const [notes, setNotes] = useState(day.actual_notes || '')
  const meta = STATUS_META[day.status] || STATUS_META.pending

  return (
    <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-exam flex items-center justify-center text-white text-sm font-bold shrink-0">
            {day.day_number}
          </span>
          <span className="text-xs text-exam-300/60 flex items-center gap-1">
            <RiTimeLine size={12} /> {fmtDate(day.scheduled_date)}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
      </div>

      {day.goal && <p className="text-sm font-medium text-gray-100 mb-3">{day.goal}</p>}

      {day.subtopics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {day.subtopics.map((s, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-exam-950/60 text-exam-300/80 border border-exam-900/50">{s}</span>
          ))}
        </div>
      )}

      {day.activities?.length > 0 && (
        <ul className="text-sm text-gray-300 space-y-1 mb-3 list-disc list-inside marker:text-exam-500">
          {day.activities.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}

      {day.self_check && (
        <p className="text-xs italic text-exam-300/70 mb-3">Self-check: {day.self_check}</p>
      )}

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="What did you actually study? (optional)"
        rows={2}
        className="w-full rounded-lg bg-black/40 border border-exam-900/50 text-gray-200 px-3 py-2 text-sm focus:border-exam-500 focus:outline-none placeholder:text-gray-600 mb-3 resize-none"
      />

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'done',    label: 'Done',      icon: RiCheckLine },
          { key: 'partial', label: 'Partial',   icon: RiContrastLine },
          { key: 'skipped', label: 'Skipped',   icon: RiCloseLine },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            disabled={busy}
            onClick={() => onSet(day, key, notes)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
              day.status === key
                ? STATUS_META[key].cls
                : 'border-exam-900/50 text-exam-300/70 hover:border-exam-600 hover:text-exam-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- Create form ----------------------------------------------------------
function CreateForm({ creating, onCreate, hasHistory, onShowHistory }) {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [days, setDays] = useState(7)

  return (
    <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-6">
      <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-exam-800/50">
        <p className="text-xs text-exam-300/80 flex items-center gap-1.5">
          <RiCalendarLine size={14} />
          Generate a personalized day-by-day plan you can track. Mark each day Done, Partial, or Skipped — if you fall behind, the plan adjusts itself.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-exam-200 mb-1.5">Subject</label>
          <input
            type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Database Management, Physics..."
            className="w-full rounded-xl bg-black/50 border border-exam-900/50 text-gray-200 px-3 py-2.5 focus:border-exam-500 focus:outline-none placeholder:text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-exam-200 mb-1.5">Topic <span className="text-exam-400/60">(optional)</span></label>
          <input
            type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. SQL Joins, Thermodynamics..."
            className="w-full rounded-xl bg-black/50 border border-exam-900/50 text-gray-200 px-3 py-2.5 focus:border-exam-500 focus:outline-none placeholder:text-gray-600"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-exam-200 mb-2">Study Duration</label>
        <div className="flex gap-2 flex-wrap">
          {DAY_OPTIONS.map(d => (
            <button
              key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                days === d
                  ? 'bg-gradient-exam text-white border-transparent shadow-glow-exam'
                  : 'border-exam-900/50 text-exam-300/70 hover:border-exam-600 hover:text-exam-200'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onCreate({ subject, topic, days })} disabled={creating}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-exam text-white font-medium shadow-glow-exam hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          <RiSparklingLine size={16} />
          {creating ? 'Building your plan…' : `Generate ${days}-Day Plan`}
        </button>
        {hasHistory && (
          <button
            onClick={onShowHistory}
            className="inline-flex items-center gap-1.5 text-sm text-exam-300 hover:text-exam-200 px-3 py-2 rounded-lg hover:bg-exam-950/50 transition-colors"
          >
            <RiHistoryLine size={15} /> Plan History
          </button>
        )}
      </div>
    </div>
  )
}

// ---- History view ---------------------------------------------------------
function HistoryView({ plans, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-exam-300 hover:text-exam-200 mb-4">
        <RiArrowLeftLine size={15} /> Back
      </button>
      {plans.length === 0 ? (
        <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-8 text-center text-sm text-gray-400">
          No past plans yet.
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <div key={p.id} className="rounded-2xl bg-red-950/30 border border-red-900/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-100">{p.subject}{p.topic ? ` — ${p.topic}` : ''}</p>
                  <p className="text-xs text-exam-300/60 mt-0.5">
                    {fmtDate(p.start_date)} – {fmtDate(p.end_date)} · {p.total_days} days · {p.status}
                  </p>
                </div>
                <span className="text-lg font-bold text-exam-300">{p.percent}%</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full bg-gradient-exam" style={{ width: `${p.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Main -----------------------------------------------------------------
export default function StudyPlanner() {
  const { user } = useAuthStore()
  const [loading, setLoading]   = useState(true)
  const [plan, setPlan]         = useState(null)
  const [view, setView]         = useState('plan')   // 'plan' | 'create' | 'history'
  const [creating, setCreating] = useState(false)
  const [replanning, setReplanning] = useState(false)
  const [busyDay, setBusyDay]   = useState(null)
  const [history, setHistory]   = useState([])
  const [hasHistory, setHasHistory] = useState(false)

  const loadActive = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authedFetch('/api/study-plan/active')
      setPlan(data.plan)
      setView(data.plan ? 'plan' : 'create')
    } catch (err) {
      toast.error(err.message)
      setView('create')
    } finally {
      setLoading(false)
    }
  }, [])

  // Preload whether any history exists, so the "Plan History" link can show.
  const refreshHistory = useCallback(async () => {
    try {
      const data = await authedFetch('/api/study-plan/history')
      setHistory(data.plans || [])
      setHasHistory((data.plans || []).length > 0)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadActive()
    refreshHistory()
  }, [user, loadActive, refreshHistory])

  const handleCreate = async ({ subject, topic, days }) => {
    if (!subject.trim()) return toast.error('Please enter a subject')
    setCreating(true)
    try {
      const data = await authedFetch('/api/ai/study-plan/create', {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), topic: topic.trim(), days }),
      })
      setPlan(data.plan)
      setView('plan')
      refreshHistory()
      toast.success('Your study plan is ready!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleSetDay = async (day, status, notes) => {
    setBusyDay(day.id)
    try {
      const data = await authedFetch(`/api/study-plan/${plan.id}/days/${day.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, actual_notes: notes }),
      })
      setPlan(data.plan)
      if (data.plan?.status === 'completed') {
        toast.success('Plan complete — great work! 🎉')
        refreshHistory()
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyDay(null)
    }
  }

  const handleReplan = async () => {
    setReplanning(true)
    try {
      const data = await authedFetch(`/api/ai/study-plan/${plan.id}/replan`, { method: 'POST' })
      setPlan(data.plan)
      toast.success('Your remaining days have been adjusted')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setReplanning(false)
    }
  }

  const openHistory = async () => {
    await refreshHistory()
    setView('history')
  }

  if (!user) {
    return (
      <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-8 text-center text-sm text-gray-400">
        Please sign in to use the Study Planner.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-10 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-red-900 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm text-red-400/80">Loading your plan…</p>
      </div>
    )
  }

  if (view === 'history') {
    return <HistoryView plans={history} onBack={() => setView(plan ? 'plan' : 'create')} />
  }

  if (view === 'create' || !plan) {
    return <CreateForm creating={creating} onCreate={handleCreate} hasHistory={hasHistory} onShowHistory={openHistory} />
  }

  // Active plan view
  const { progress } = plan
  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-semibold text-white">{plan.subject}{plan.topic ? ` — ${plan.topic}` : ''}</h3>
            <p className="text-xs text-exam-300/60 mt-0.5">{plan.total_days}-day plan</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openHistory} className="inline-flex items-center gap-1 text-xs text-exam-300 hover:text-exam-200 px-2.5 py-1.5 rounded-lg hover:bg-exam-950/50 transition-colors">
              <RiHistoryLine size={14} /> History
            </button>
            <button onClick={() => setView('create')} className="inline-flex items-center gap-1 text-xs text-exam-300 hover:text-exam-200 px-2.5 py-1.5 rounded-lg hover:bg-exam-950/50 transition-colors">
              <RiSparklingLine size={14} /> New Plan
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-2 text-sm">
          <span className="flex items-center gap-1.5 text-orange-300"><RiFireLine size={16} /> {progress.currentStreak} day streak</span>
          <span className="text-exam-300/70">{progress.daysRemaining} days left</span>
          <span className="ml-auto font-bold text-exam-300">{progress.percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/40 overflow-hidden">
          <div className="h-full bg-gradient-exam transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      {/* Fallen-behind banner */}
      {progress.behind && (
        <div className="rounded-2xl bg-amber-950/40 border border-amber-700/50 p-4 flex items-start gap-3">
          <RiErrorWarningLine size={20} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-200 font-medium">Looks like you've fallen behind</p>
            <p className="text-xs text-amber-300/70 mt-0.5">Want me to rebalance your remaining days so you can still catch up?</p>
          </div>
          <button
            onClick={handleReplan} disabled={replanning}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600/80 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-60 transition-colors shrink-0"
          >
            <RiSparklingLine size={15} /> {replanning ? 'Adjusting…' : 'Adjust plan'}
          </button>
        </div>
      )}

      {/* Day cards */}
      <div className="space-y-3">
        {plan.days.map(day => (
          <DayCard key={day.id} day={day} busy={busyDay === day.id} onSet={handleSetDay} />
        ))}
      </div>
    </div>
  )
}
