import { useEffect } from 'react'
import { RiCloseLine } from 'react-icons/ri'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={`relative w-full ${sizes[size]} card animate-slide-up`}>
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white">{title}</h3>}
          <button onClick={onClose} className="btn-ghost btn-icon ml-auto">
            <RiCloseLine size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
