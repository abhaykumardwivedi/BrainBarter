export default function Loader({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' }
  return (
    <div className={`${s[size]} border-brand-200 border-t-brand-600 rounded-full animate-spin ${className}`} />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0a1e]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse-slow">Loading...</p>
      </div>
    </div>
  )
}
