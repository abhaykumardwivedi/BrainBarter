import { Link } from 'react-router-dom'
import { RiHome4Line, RiArrowLeftLine } from 'react-icons/ri'
import { Button } from '../components/common'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0a1e] p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-200/20 dark:bg-brand-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center animate-slide-up relative">
        <p className="text-8xl font-display font-extrabold bg-gradient-brand bg-clip-text text-transparent mb-4">404</p>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button><RiHome4Line size={16} /> Go Home</Button>
          </Link>
          <button onClick={() => window.history.back()}>
            <Button variant="secondary"><RiArrowLeftLine size={16} /> Go Back</Button>
          </button>
        </div>
      </div>
    </div>
  )
}
