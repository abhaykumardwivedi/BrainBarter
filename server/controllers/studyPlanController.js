const { callGemini } = require('../utils/gemini')
const { supabase }   = require('../middleware/verifyToken')

// Valid per-day states the client can set.
const DAY_STATUSES = new Set(['pending', 'done', 'partial', 'skipped'])
const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Gemini output helpers
// The study-plan system prompt in gemini.js produces a day-by-day plan; we
// steer it to emit JSON so it can be stored as structured rows, and fall back
// to a lenient text parser if the model returns prose anyway.
// ---------------------------------------------------------------------------
function toList(v) {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') {
    return v.split(/\r?\n|;|•|,\s(?=[A-Z])/).map(s => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean)
  }
  return []
}

function extractJson(text) {
  if (!text) return null
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('[')
  const end   = t.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1)
  try { return JSON.parse(t) } catch { return null }
}

// Lenient fallback: split prose on "Day N" headings so we always store rows.
function fallbackParse(text, dayNumbers) {
  const parts = String(text || '').split(/(?=Day\s*\d+)/i).map(s => s.trim()).filter(Boolean)
  return dayNumbers.map((dn, i) => ({
    day_number: dn,
    goal: (parts[i] || '').replace(/^Day\s*\d+[:.\-\s]*/i, '').slice(0, 500).trim() || `Day ${dn} study session`,
    subtopics: [],
    activities: [],
    self_check: null,
  }))
}

// Parse a Gemini response into rows for the given ordered day numbers.
function parsePlanDays(text, dayNumbers) {
  const arr = extractJson(text)
  if (Array.isArray(arr) && arr.length) {
    return dayNumbers.map((dn, i) => {
      const d = arr[i] || {}
      return {
        day_number: dn,
        goal: String(d.goal || d.title || d.focus || '').trim() || `Day ${dn} study session`,
        subtopics: toList(d.subtopics ?? d.topics),
        activities: toList(d.activities ?? d.tasks),
        self_check: (String(d.self_check ?? d.selfCheck ?? d.check ?? '').trim()) || null,
      }
    })
  }
  return fallbackParse(text, dayNumbers)
}

// The instruction appended to the study-plan prompt to get parseable JSON.
function jsonFormatHint(dayNumbers) {
  return `\n\nReturn ONLY a JSON array of exactly ${dayNumbers.length} objects, one per day, in order for day numbers ${dayNumbers.join(', ')}. Each object must have: "goal" (string, one sentence), "subtopics" (array of strings), "activities" (array of strings), "self_check" (string, a question the student should be able to answer that day). No markdown, no prose outside the JSON.`
}

// ---------------------------------------------------------------------------
// Progress computation + plan serialization (shared by every read response)
// ---------------------------------------------------------------------------
function computeProgress(plan, days) {
  const total    = days.length || plan.total_days || 0
  const doneCnt  = days.filter(d => d.status === 'done').length
  const partial  = days.filter(d => d.status === 'partial').length
  const pending  = days.filter(d => d.status === 'pending').length
  const percent  = total ? Math.round(((doneCnt + partial * 0.5) / total) * 100) : 0

  // Leading streak: consecutive days from day 1 kept up (done/partial).
  const ordered = [...days].sort((a, b) => a.day_number - b.day_number)
  let currentStreak = 0
  for (const d of ordered) {
    if (d.status === 'done' || d.status === 'partial') currentStreak++
    else break
  }

  // "Behind" = 2+ consecutive still-pending days whose scheduled date is past.
  // A day's scheduled date = plan.created_at + (day_number - 1) days.
  const created = new Date(plan.created_at).getTime()
  const now = Date.now()
  let overdueRun = 0, behind = false
  for (const d of ordered) {
    const due = created + (d.day_number - 1) * DAY_MS
    if (d.status === 'pending' && due < now) {
      overdueRun++
      if (overdueRun >= 2) behind = true
    } else {
      overdueRun = 0
    }
  }

  return {
    percent,
    currentStreak,
    daysRemaining: pending,
    doneCount: doneCnt,
    partialCount: partial,
    behind,
  }
}

function withScheduledDate(plan, day) {
  const created = new Date(plan.created_at).getTime()
  return { ...day, scheduled_date: new Date(created + (day.day_number - 1) * DAY_MS).toISOString() }
}

// Load a plan + its ordered days + computed progress. Returns null if missing.
async function loadPlan(planId) {
  const { data: plan } = await supabase
    .from('study_plans').select('*').eq('id', planId).maybeSingle()
  if (!plan) return null
  const { data: days } = await supabase
    .from('study_plan_days').select('*').eq('plan_id', planId).order('day_number')
  const list = (days || []).map(d => withScheduledDate(plan, d))
  return { ...plan, days: list, progress: computeProgress(plan, days || []) }
}

// ---------------------------------------------------------------------------
// POST /api/ai/study-plan/create
// ---------------------------------------------------------------------------
async function createPlan(req, res) {
  const { subject, topic, days } = req.body
  const totalDays = parseInt(days, 10)
  if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' })
  if (!Number.isFinite(totalDays) || totalDays < 1 || totalDays > 60) {
    return res.status(400).json({ error: 'Days must be between 1 and 60' })
  }

  try {
    const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1)
    let context = `Subject: ${subject.trim()}\n`
    if (topic && topic.trim()) context += `Topic: ${topic.trim()}\n`
    context += `Number of days: ${totalDays}\n`
    context += jsonFormatHint(dayNumbers)

    const raw   = await callGemini('study-plan', context)
    const parsed = parsePlanDays(raw, dayNumbers)

    // One active plan at a time: retire any existing active plan first.
    await supabase.from('study_plans')
      .update({ status: 'abandoned' })
      .eq('user_id', req.user.id).eq('status', 'active')

    const { data: plan, error: planErr } = await supabase
      .from('study_plans')
      .insert({
        user_id: req.user.id,
        subject: subject.trim(),
        topic: topic?.trim() || null,
        total_days: totalDays,
        status: 'active',
      })
      .select().single()
    if (planErr) throw planErr

    const rows = parsed.map(d => ({ ...d, plan_id: plan.id }))
    const { error: daysErr } = await supabase.from('study_plan_days').insert(rows)
    if (daysErr) throw daysErr

    const full = await loadPlan(plan.id)
    res.json({ plan: full })
  } catch (err) {
    console.error('createPlan error:', err.message)
    res.status(500).json({ error: 'Failed to create study plan' })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/study-plan/:planId/days/:dayId
// ---------------------------------------------------------------------------
async function updateDay(req, res) {
  const { planId, dayId } = req.params
  const { status, actual_notes } = req.body
  if (!DAY_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status' })

  try {
    // Ownership: the plan must belong to the caller.
    const { data: plan } = await supabase
      .from('study_plans').select('id, user_id').eq('id', planId).maybeSingle()
    if (!plan) return res.status(404).json({ error: 'Plan not found' })
    if (plan.user_id !== req.user.id) return res.status(403).json({ error: 'Not your plan' })

    const patch = {
      status,
      completed_at: status === 'pending' ? null : new Date().toISOString(),
    }
    if (actual_notes !== undefined) patch.actual_notes = actual_notes || null

    const { data: updated, error } = await supabase
      .from('study_plan_days')
      .update(patch)
      .eq('id', dayId).eq('plan_id', planId)
      .select().maybeSingle()
    if (error) throw error
    if (!updated) return res.status(404).json({ error: 'Day not found' })

    // If every day is actioned, mark the plan completed.
    const { data: allDays } = await supabase
      .from('study_plan_days').select('status').eq('plan_id', planId)
    if (allDays?.length && allDays.every(d => d.status !== 'pending')) {
      await supabase.from('study_plans').update({ status: 'completed' }).eq('id', planId)
    }

    const full = await loadPlan(planId)
    res.json({ plan: full })
  } catch (err) {
    console.error('updateDay error:', err.message)
    res.status(500).json({ error: 'Failed to update day' })
  }
}

// ---------------------------------------------------------------------------
// GET /api/study-plan/active
// ---------------------------------------------------------------------------
async function getActive(req, res) {
  try {
    const { data: plan } = await supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', req.user.id).eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()
    if (!plan) return res.json({ plan: null })

    const full = await loadPlan(plan.id)
    res.json({ plan: full })
  } catch (err) {
    console.error('getActive error:', err.message)
    res.status(500).json({ error: 'Failed to load active plan' })
  }
}

// ---------------------------------------------------------------------------
// GET /api/study-plan/history
// ---------------------------------------------------------------------------
async function getHistory(req, res) {
  try {
    const { data: plans } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', req.user.id).neq('status', 'active')
      .order('created_at', { ascending: false })
    if (!plans?.length) return res.json({ plans: [] })

    // One query for all days across these plans, then aggregate in JS.
    const ids = plans.map(p => p.id)
    const { data: days } = await supabase
      .from('study_plan_days').select('plan_id, status, day_number').in('plan_id', ids)

    const byPlan = {}
    for (const d of (days || [])) (byPlan[d.plan_id] ||= []).push(d)

    const result = plans.map(p => {
      const pd = byPlan[p.id] || []
      const total = pd.length || p.total_days || 0
      const done  = pd.filter(d => d.status === 'done').length
      const part  = pd.filter(d => d.status === 'partial').length
      const percent = total ? Math.round(((done + part * 0.5) / total) * 100) : 0
      const start = new Date(p.created_at)
      const end   = new Date(start.getTime() + (p.total_days - 1) * DAY_MS)
      return {
        id: p.id,
        subject: p.subject,
        topic: p.topic,
        total_days: p.total_days,
        status: p.status,
        created_at: p.created_at,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        percent,
      }
    })
    res.json({ plans: result })
  } catch (err) {
    console.error('getHistory error:', err.message)
    res.status(500).json({ error: 'Failed to load history' })
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/study-plan/:planId/replan
// Regenerate ONLY the still-pending days, using what the student has actually
// done so far as context. Completed/partial/skipped days are left untouched.
// ---------------------------------------------------------------------------
async function replan(req, res) {
  const { planId } = req.params
  try {
    const { data: plan } = await supabase
      .from('study_plans').select('*').eq('id', planId).maybeSingle()
    if (!plan) return res.status(404).json({ error: 'Plan not found' })
    if (plan.user_id !== req.user.id) return res.status(403).json({ error: 'Not your plan' })

    const { data: days } = await supabase
      .from('study_plan_days').select('*').eq('plan_id', planId).order('day_number')
    const all = days || []
    const pending = all.filter(d => d.status === 'pending')
    if (!pending.length) return res.status(400).json({ error: 'No pending days left to replan' })

    // Build progress context from what has already happened.
    const doneSoFar = all.filter(d => d.status !== 'pending')
    const progressLines = doneSoFar.map(d =>
      `Day ${d.day_number} (${d.status}): ${d.goal}${d.actual_notes ? ` — student notes: ${d.actual_notes}` : ''}`
    ).join('\n') || 'No days completed yet.'

    const pendingNumbers = pending.map(d => d.day_number)
    let context = `Subject: ${plan.subject}\n`
    if (plan.topic) context += `Topic: ${plan.topic}\n`
    context += `This is a ${plan.total_days}-day plan. The student has fallen behind and wants the remaining days adjusted so they can still catch up.\n\n`
    context += `Progress so far:\n${progressLines}\n\n`
    context += `Regenerate ONLY the remaining ${pendingNumbers.length} day(s): day numbers ${pendingNumbers.join(', ')}. Rebalance the workload across these remaining days so the most important untouched material is still covered.`
    context += jsonFormatHint(pendingNumbers)

    const raw    = await callGemini('study-plan', context)
    const parsed = parsePlanDays(raw, pendingNumbers)

    // Replace pending days in place (preserves ids; keeps status pending).
    for (const d of parsed) {
      await supabase.from('study_plan_days')
        .update({
          goal: d.goal,
          subtopics: d.subtopics,
          activities: d.activities,
          self_check: d.self_check,
        })
        .eq('plan_id', planId).eq('day_number', d.day_number).eq('status', 'pending')
    }

    const full = await loadPlan(planId)
    res.json({ plan: full })
  } catch (err) {
    console.error('replan error:', err.message)
    res.status(500).json({ error: 'Failed to replan' })
  }
}

module.exports = { createPlan, updateDay, getActive, getHistory, replan }
