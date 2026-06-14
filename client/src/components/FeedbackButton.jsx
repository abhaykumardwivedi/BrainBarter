import { useState } from 'react'
import { RiChatSmileLine, RiCloseLine, RiSendPlaneLine } from 'react-icons/ri'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const CATEGORIES = ['Bug Report', 'Feature Request', 'Content Quality', 'UI/UX', 'Other']

export default function FeedbackButton() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ category: 'Feature Request', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!form.message.trim()) return toast.error('Please write your feedback')
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        category: form.category,
        message: form.message.trim(),
      })
      if (error) throw error
      setSubmitted(true)
      toast.success('Thanks for your feedback!')
      setTimeout(() => { setOpen(false); setSubmitted(false); setForm({ category: 'Feature Request', message: '' }) }, 2000)
    } catch (err) {
      toast.error(err.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-brand text-white text-sm font-medium shadow-glow hover:opacity-90 transition-all"
        aria-label="Send feedback"
      >
        <RiChatSmileLine size={18} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md card animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white">Share Feedback</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Help us make BrainBarter better</p>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost btn-icon">
                <RiCloseLine size={20} />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-3">
                  <RiChatSmileLine size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">Thank you!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your feedback has been received.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="input-label">Category</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Your Feedback</label>
                  <textarea
                    rows={4}
                    placeholder="What could be better? What's broken? What do you love?"
                    className="input resize-none"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    required
                  />
                </div>
                {!user && (
                  <p className="text-xs text-gray-400">You're sending this anonymously. Log in to be credited.</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <RiSendPlaneLine size={16} />
                  {submitting ? 'Sending…' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
