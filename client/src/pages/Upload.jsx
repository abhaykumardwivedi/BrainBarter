import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RiUploadCloud2Line, RiVideoLine, RiFileTextLine,
  RiImageLine, RiCheckLine,
} from 'react-icons/ri'
import { Button, Input } from '../components/common'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const topics   = ['Normalization', 'ER Diagrams', 'SQL', 'Transactions', 'Indexing', 'Other']
const difficulties = ['beginner', 'medium', 'advanced']

export default function Upload() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    title: '', description: '', subject: '', topic: '', type: 'video', difficulty: 'medium',
    tokenCost: 20, tags: '',
  })
  const [subjects, setSubjects] = useState([])
  const [customSubject, setCustomSubject] = useState('')
  const [customTopic, setCustomTopic] = useState('')

  // Load real subjects so uploaded content matches what Browse filters on
  useEffect(() => {
    supabase.from('subjects').select('id, name').order('semester')
      .then(({ data }) => {
        const list = data || []
        setSubjects(list)
        setForm(f => ({ ...f, subject: f.subject || list[0]?.name || '' }))
      })
  }, [])
  const [file, setFile] = useState(null)
  const [thumb, setThumb] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const maxSize = form.type === 'video' ? 30 : 10

  const handleFile = e => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > maxSize * 1024 * 1024) {
      alert(`Max file size is ${maxSize}MB`)
      return
    }
    setFile(f)
  }

  const submit = async e => {
    e.preventDefault()
    if (!file) return toast.error('Please select a file')
    if (!user) return toast.error('Please login')
    
    setUploading(true)
    setProgress(0)

    try {
      // Get final subject and topic values
      const finalSubject = form.subject === 'Other' ? customSubject : form.subject
      const finalTopic = form.topic === 'Other' ? customTopic : form.topic

      if (!finalSubject || !finalTopic) {
        toast.error('Please fill subject and topic')
        setUploading(false)
        return
      }

      // Link to a real subject row when possible (null for custom "Other" subjects)
      const subjectId = subjects.find(s => s.name === finalSubject)?.id || null

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      setProgress(30)
      const { error: fileError } = await supabase.storage
        .from('content')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (fileError) throw fileError

      const fileUrl = supabase.storage.from('content').getPublicUrl(fileName).data.publicUrl
      
      setProgress(60)

      // Upload thumbnail if exists
      let thumbnailUrl = null
      if (thumb) {
        const thumbExt = thumb.name.split('.').pop()
        const thumbName = `${user.id}/thumb_${Date.now()}.${thumbExt}`
        const { data: thumbData } = await supabase.storage
          .from('content')
          .upload(thumbName, thumb, { cacheControl: '3600', upsert: false })
        if (thumbData) {
          thumbnailUrl = supabase.storage.from('content').getPublicUrl(thumbName).data.publicUrl
        }
      }

      setProgress(80)

      // Insert content to database
      const { error: dbError } = await supabase.from('content').insert({
        creator_id: user.id,
        title: form.title,
        description: form.description,
        type: form.type,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        token_cost: parseInt(form.tokenCost),
        difficulty: form.difficulty,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_published: false,
        // Store subject and topic for filtering in Browse
        subject_id: subjectId,
        subject_name: finalSubject,
        topic_name: finalTopic,
      })

      if (dbError) throw dbError

      setProgress(100)
      setDone(true)
      toast.success('Content uploaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Upload failed')
      setUploading(false)
      setProgress(0)
    }
  }

  if (done) {
    return (
      <div className="page flex items-center justify-center min-h-[60vh]">
        <div className="card text-center max-w-sm animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
            <RiCheckLine size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Upload Successful!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Your content is saved as draft. Publish it when ready.</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setDone(false); setFile(null); setThumb(null); setProgress(0); setUploading(false); setForm(f => ({ ...f, title: '', description: '', tags: '' })) }}>
              Upload More
            </Button>
            <Button className="flex-1" onClick={() => navigate('/dashboard')}>View Content</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container-app py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="section-title">Upload Content</h1>
          <p className="section-sub">Share your knowledge and earn tokens</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Type selector */}
          <div className="card">
            <p className="input-label mb-3">Content Type</p>
            <div className="grid grid-cols-2 gap-3">
              {['video', 'notes'].map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                    ${form.type === t
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                    }`}
                >
                  {t === 'video' ? <RiVideoLine size={20} className="text-brand-500" /> : <RiFileTextLine size={20} className="text-brand-500" />}
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{t}</p>
                    <p className="text-xs text-gray-400">Max {t === 'video' ? '30' : '10'}MB</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="card space-y-4">
            <Input label="Title" name="title" placeholder="e.g. Normalization — 1NF to BCNF Explained" value={form.title} onChange={handle} required />
            <div>
              <label className="input-label">Description</label>
              <textarea
                name="description" rows={3}
                placeholder="What will learners get from this content?"
                className="input resize-none"
                value={form.description} onChange={handle}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Subject</label>
                <select name="subject" className="input" value={form.subject} onChange={handle}>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="Other">Other</option>
                </select>
                {form.subject === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter subject name"
                    className="input mt-2"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="input-label">Topic</label>
                <select name="topic" className="input" value={form.topic} onChange={handle}>
                  <option value="">Select topic</option>
                  {topics.map(t => <option key={t}>{t}</option>)}
                </select>
                {form.topic === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter topic name"
                    className="input mt-2"
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Difficulty</label>
                <select name="difficulty" className="input" value={form.difficulty} onChange={handle}>
                  {difficulties.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <Input label="Token Cost" name="tokenCost" type="number" min={1} max={50} value={form.tokenCost} onChange={handle} />
            </div>
            <Input label="Tags (comma separated)" name="tags" placeholder="normalization, dbms, exam" value={form.tags} onChange={handle} />
          </div>

          {/* File Upload */}
          <div className="card">
            <p className="input-label mb-3">
              {form.type === 'video' ? 'Video File' : 'Notes / PDF'} (max {maxSize}MB)
            </p>
            <label className={`flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all
              ${file ? 'border-brand-400 bg-brand-50 dark:bg-brand-950' : 'border-gray-300 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950'}`}>
              <input type="file" className="hidden" accept={form.type === 'video' ? 'video/*' : '.pdf,.doc,.docx'} onChange={handleFile} />
              {file ? (
                <div className="text-center">
                  <RiCheckLine size={24} className="text-brand-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <RiUploadCloud2Line size={28} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-0.5">{form.type === 'video' ? 'MP4, WebM' : 'PDF, DOC, DOCX'}</p>
                </div>
              )}
            </label>

            {/* Thumbnail */}
            <p className="input-label mt-4 mb-2">Thumbnail (optional)</p>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-brand-400 transition-colors">
              <input type="file" className="hidden" accept="image/*" onChange={e => setThumb(e.target.files[0])} />
              <RiImageLine size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">{thumb ? thumb.name : 'Upload thumbnail image'}</span>
            </label>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="card-inset">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-brand rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Button type="submit" loading={uploading} disabled={!file} className="w-full" size="lg">
            <RiUploadCloud2Line size={18} />
            Upload & Save as Draft
          </Button>
        </form>
      </div>
    </div>
  )
}
