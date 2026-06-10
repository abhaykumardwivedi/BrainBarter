import { useState } from 'react'
import {
  RiFlashlightLine, RiQuestionLine, RiFileTextLine,
  RiListCheck2, RiBookOpenLine, RiSparklingLine,
} from 'react-icons/ri'
import { Button, Badge } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'expected',  label: 'Expected Questions', icon: RiQuestionLine },
  { id: 'mock',      label: 'Mock Test',           icon: RiListCheck2 },
  { id: 'revision',  label: 'Revision Notes',      icon: RiFileTextLine },
  { id: 'finalprep', label: 'Final Prep',           icon: RiBookOpenLine },
]

const subjects = ['Database Management', 'Operating Systems', 'Computer Networks', 'Data Structures']
const topics   = ['Normalization', 'ER Diagrams', 'SQL', 'Transactions', 'Indexing']

function AIResponseBox({ loading, response, placeholder }) {
  if (loading) {
    return (
      <div className="card-inset min-h-48 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse-slow">Gemini is thinking...</p>
        </div>
      </div>
    )
  }
  if (!response) {
    return (
      <div className="card-inset min-h-48 flex items-center justify-center text-center">
        <div>
          <RiSparklingLine size={32} className="text-brand-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">{placeholder}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="card-inset min-h-48 prose prose-sm dark:prose-invert max-w-none animate-fade-in">
      <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">{response}</pre>
    </div>
  )
}

export default function ExamMode() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('expected')
  const [subject, setSubject] = useState(subjects[0])
  const [topic, setTopic] = useState(topics[0])
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')

  const generate = async () => {
    if (!user) {
      toast.error('Please login to use AI features')
      return
    }
    
    setLoading(true)
    setResponse('')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/exam-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          taskType: activeTab,
          subjectId: null,
          topicId: null,
          type: activeTab
        })
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

  return (
    <div className="page">
      <div className="container-app py-8 max-w-4xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
            <RiFlashlightLine size={22} className="text-white" />
          </div>
          <div>
            <h1 className="section-title">Exam Mode</h1>
            <p className="section-sub">AI-powered exam preparation — powered by Gemini</p>
          </div>
          <Badge variant="amber" className="ml-auto">AI Generated</Badge>
        </div>

        {/* Disclaimer */}
        <div className="card-inset flex items-start gap-2 mb-6 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
          <RiSparklingLine size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            AI-generated content. Use as a study aid — always verify with your syllabus and textbooks before exams.
          </p>
        </div>

        {/* Tabs */}
        <div className="tab-bar mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setResponse('') }}
              className={activeTab === id ? 'tab-item-active' : 'tab-item'}
            >
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <Icon size={14} /> {label}
              </span>
              <span className="sm:hidden"><Icon size={16} /></span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="card mb-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="input-label">Subject</label>
              <select className="input" value={subject} onChange={e => setSubject(e.target.value)}>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Topic</label>
              <select className="input" value={topic} onChange={e => setTopic(e.target.value)}>
                {topics.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={generate} loading={loading} className="w-full sm:w-auto">
            <RiSparklingLine size={16} />
            Generate with AI
          </Button>
        </div>

        {/* Response */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            {response && (
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(response)}>
                Copy
              </Button>
            )}
          </div>
          <AIResponseBox
            loading={loading}
            response={response}
            placeholder={`Select subject and topic, then click Generate to get ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}`}
          />
        </div>

      </div>
    </div>
  )
}
