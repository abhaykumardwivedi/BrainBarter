import { useState } from 'react'
import {
  RiFlashlightLine, RiQuestionLine, RiFileTextLine,
  RiListCheck2, RiBookOpenLine, RiSparklingLine, RiCalendarLine,
} from 'react-icons/ri'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import StudyPlanner from '../components/StudyPlanner'

const tabs = [
  { id: 'expected',    label: 'Expected Questions', icon: RiQuestionLine },
  { id: 'mock',        label: 'Mock Test',           icon: RiListCheck2 },
  { id: 'revision',    label: 'Revision Notes',      icon: RiFileTextLine },
  { id: 'finalprep',   label: 'Final Prep',           icon: RiBookOpenLine },
  { id: 'study-plan',  label: 'Study Planner',        icon: RiCalendarLine },
]

const DAY_OPTIONS = [3, 5, 7, 14, 21, 30]

function AIResponseBox({ loading, response, placeholder }) {
  if (loading) {
    return (
      <div className="card-inset min-h-48 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-900 border-t-red-500 rounded-full animate-spin" />
          <p className="text-sm text-red-400/80 animate-pulse-slow">Gemini is thinking...</p>
        </div>
      </div>
    )
  }
  if (!response) {
    return (
      <div className="min-h-48 flex items-center justify-center text-center rounded-2xl bg-red-950/20 border border-red-900/50">
        <div>
          <RiSparklingLine size={32} className="text-red-500/70 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">{placeholder}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-48 rounded-2xl bg-red-950/20 border border-red-900/50 p-5 prose prose-sm prose-invert max-w-none animate-fade-in">
      <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{response}</pre>
    </div>
  )
}

export default function ExamMode() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('expected')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')

  const generate = async () => {
    if (!user) {
      toast.error('Please login to use AI features')
      return
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject')
      return
    }

    setLoading(true)
    setResponse('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const body = { taskType: activeTab, subject: subject.trim(), topic: topic.trim() }
      if (activeTab === 'study-plan') body.days = days

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('AI service unavailable')

      const data = await res.json()
      setResponse(data.response || 'No response from AI')
    } catch (err) {
      console.error(err)
      setResponse('AI service unavailable. Make sure the server is running at ' + import.meta.env.VITE_API_URL)
      toast.error('Failed to generate content')
    } finally {
      setLoading(false)
    }
  }

  const isStudyPlan = activeTab === 'study-plan'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2a0010] via-[#18000a] to-[#0c0005]">
      <div className="container-app py-8 max-w-4xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-exam flex items-center justify-center shadow-glow-exam">
            <RiFlashlightLine size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Exam Mode</h1>
            <p className="text-sm text-exam-300/70">AI-powered exam preparation — powered by Gemini</p>
          </div>
          <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full bg-exam-950 text-exam-300 border border-exam-800">AI Generated</span>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 mb-6 p-3 rounded-xl border border-exam-900/60 bg-red-950/60">
          <RiSparklingLine size={16} className="text-exam-400 mt-0.5 shrink-0" />
          <p className="text-xs text-exam-300/80">
            AI-generated content. Use as a study aid — always verify with your syllabus and textbooks before exams.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 mb-6 rounded-xl bg-red-950/30 border border-red-900/50 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setResponse('') }}
              className={`flex-shrink-0 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-gradient-exam text-white shadow-glow-exam'
                  : 'text-exam-300/60 hover:text-exam-200 hover:bg-exam-950/50'
              }`}
            >
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <Icon size={14} /> {label}
              </span>
              <span className="sm:hidden flex justify-center"><Icon size={16} /></span>
            </button>
          ))}
        </div>

        {/* Study Planner tab is now a full persistent, trackable experience */}
        {isStudyPlan ? <StudyPlanner /> : (<>

        {/* Controls */}
        <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-6 mb-6">
          {isStudyPlan && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-exam-800/50">
              <p className="text-xs text-exam-300/80 flex items-center gap-1.5">
                <RiCalendarLine size={14} />
                Enter your subject and topic — the AI will generate a personalized day-by-day revision plan with daily goals and activities.
              </p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-exam-200 mb-1.5">Subject</label>
              <input
                type="text"
                placeholder="e.g. Database Management, Physics..."
                className="w-full rounded-xl bg-black/50 border border-exam-900/50 text-gray-200 px-3 py-2.5 focus:border-exam-500 focus:outline-none placeholder:text-gray-600"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-exam-200 mb-1.5">Topic <span className="text-exam-400/60">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. SQL Joins, Thermodynamics..."
                className="w-full rounded-xl bg-black/50 border border-exam-900/50 text-gray-200 px-3 py-2.5 focus:border-exam-500 focus:outline-none placeholder:text-gray-600"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
          </div>

          {isStudyPlan && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-exam-200 mb-2">Study Duration</label>
              <div className="flex gap-2 flex-wrap">
                {DAY_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
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
          )}

          <button onClick={generate} disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-exam text-white font-medium shadow-glow-exam hover:opacity-90 disabled:opacity-60 transition-opacity">
            <RiSparklingLine size={16} />
            {loading
              ? (isStudyPlan ? 'Building your plan…' : 'Generating…')
              : (isStudyPlan ? `Generate ${days}-Day Plan` : 'Generate with AI')
            }
          </button>
        </div>

        {/* Response */}
        <div className="rounded-2xl bg-red-950/30 border border-red-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">
              {isStudyPlan ? `${days}-Day Study Plan` : tabs.find(t => t.id === activeTab)?.label}
            </h3>
            {response && (
              <button onClick={() => navigator.clipboard.writeText(response)}
                className="text-sm text-exam-300 hover:text-exam-200 px-3 py-1.5 rounded-lg hover:bg-exam-950/50 transition-colors">
                Copy
              </button>
            )}
          </div>
          <AIResponseBox
            loading={loading}
            response={response}
            placeholder={
              isStudyPlan
                ? `Enter subject and number of days, then generate your personalized study plan`
                : `Select subject and topic, then click Generate to get ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}`
            }
          />
        </div>
        </>)}

      </div>
    </div>
  )
}
