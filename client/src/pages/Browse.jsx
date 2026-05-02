import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RiSearchLine, RiPlayCircleLine,
  RiFileTextLine, RiStarLine,
} from 'react-icons/ri'
import { Badge, TokenChip, Input, EmptyState } from '../components/common'
import { CardSkeleton } from '../components/common/Skeleton'
import { supabase } from '../lib/supabase'

const difficulties = ['All', 'beginner', 'medium', 'advanced']
const types = ['All', 'video', 'notes']
const diffColor = { beginner: 'green', medium: 'amber', advanced: 'red' }

export default function Browse() {
  const [subjects, setSubjects]           = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [content, setContent]             = useState([])
  const [search, setSearch]               = useState('')
  const [difficulty, setDifficulty]       = useState('All')
  const [type, setType]                   = useState('All')
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingContent, setLoadingContent]   = useState(false)

  // Fetch subjects on mount
  useEffect(() => {
    supabase.from('subjects').select('*').order('semester')
      .then(({ data }) => {
        setSubjects(data || [])
        if (data?.length) setSelectedSubject(data[0])
        setLoadingSubjects(false)
      })
  }, [])

  // Fetch content when subject changes
  useEffect(() => {
    if (!selectedSubject) return
    setLoadingContent(true)
    supabase
      .from('content')
      .select(`*, creator:profiles(username, is_verified), topic:topics(name, unit:units(subject:subjects(id)))`)
      .eq('is_published', true)
      .then(({ data }) => {
        // Filter by subject through topic → unit → subject
        const filtered = (data || []).filter(c =>
          c.topic?.unit?.subject?.id === selectedSubject.id
        )
        setContent(filtered)
        setLoadingContent(false)
      })
  }, [selectedSubject])

  const filtered = content.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchDiff   = difficulty === 'All' || c.difficulty === difficulty
    const matchType   = type === 'All' || c.type === type
    return matchSearch && matchDiff && matchType
  })

  return (
    <div className="page">
      <div className="container-app py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="card sticky top-20">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Subjects</h3>
              <div className="space-y-1">
                {loadingSubjects
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="skeleton h-10 rounded-xl" />
                    ))
                  : subjects.map(s => (
                      <button key={s.id} onClick={() => setSelectedSubject(s)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                          ${selectedSubject?.id === s.id
                            ? 'bg-brand-50 text-brand-700 font-medium shadow-neu-sm dark:bg-brand-950 dark:text-brand-300 dark:shadow-neu-dark-sm'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                          }`}>
                        <div className="flex items-center justify-between">
                          <span>{s.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{s.code}</span>
                      </button>
                    ))
                }
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="section-title">{selectedSubject?.name || 'Browse'}</h1>
              <p className="section-sub">{selectedSubject?.code} · Semester {selectedSubject?.semester}</p>
            </div>

            <div className="card mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input icon={RiSearchLine} placeholder="Search topics..."
                  value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
                <div className="flex gap-2">
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input w-auto">
                    {difficulties.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <select value={type} onChange={e => setType(e.target.value)} className="input w-auto">
                    {types.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {loadingContent ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={RiSearchLine} title="No content found"
                description={content.length === 0 ? "No content uploaded for this subject yet" : "Try adjusting your search or filters"} />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(c => (
                  <Link key={c.id} to={`/content/${c.id}`}>
                    <div className="card-hover group h-full">
                      <div className="h-32 rounded-xl bg-gradient-soft dark:bg-gradient-dark flex items-center justify-center mb-3 relative overflow-hidden">
                        {c.thumbnail_url
                          ? <img src={c.thumbnail_url} alt={c.title} className="absolute inset-0 w-full h-full object-cover" />
                          : <>
                              <div className="absolute inset-0 bg-gradient-brand opacity-10 group-hover:opacity-20 transition-opacity" />
                              {c.type === 'video'
                                ? <RiPlayCircleLine size={36} className="text-brand-400 group-hover:scale-110 transition-transform" />
                                : <RiFileTextLine  size={36} className="text-brand-400 group-hover:scale-110 transition-transform" />
                              }
                            </>
                        }
                        <span className="absolute top-2 left-2">
                          <Badge variant={c.type === 'video' ? 'purple' : 'green'}>{c.type}</Badge>
                        </span>
                      </div>
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-snug mb-1">{c.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">by @{c.creator?.username}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <Badge variant={diffColor[c.difficulty] || 'gray'}>{c.difficulty}</Badge>
                        <TokenChip amount={c.token_cost} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
