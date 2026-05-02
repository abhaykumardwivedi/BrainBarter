const variants = {
  purple: 'badge-purple',
  green:  'badge-green',
  amber:  'badge-amber',
  red:    'badge-red',
  gray:   'badge-gray',
}

export default function Badge({ children, variant = 'purple', className = '' }) {
  return (
    <span className={`${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
