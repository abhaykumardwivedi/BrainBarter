export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (src) {
    return (
      <img
        src={src} alt={name}
        className={`${sizes[size]} rounded-full object-cover shadow-neu-sm dark:shadow-neu-dark-sm ${className}`}
      />
    )
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold shadow-glow ${className}`}>
      {initials || '?'}
    </div>
  )
}
