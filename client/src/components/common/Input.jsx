export default function Input({
  label, error, className = '', icon: Icon, ...props
}) {
  return (
    <div className="w-full">
      {label && <label className="input-label">{label}</label>}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </span>
        )}
        <input
          className={`input ${Icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:ring-red-200' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="input-error">{error}</p>}
    </div>
  )
}
