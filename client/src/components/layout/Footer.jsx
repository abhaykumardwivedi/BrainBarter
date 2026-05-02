import { Link } from 'react-router-dom'
import { RiGithubLine, RiTwitterLine } from 'react-icons/ri'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0a1e] mt-auto">
      <div className="container-app py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="font-display font-semibold text-gray-700 dark:text-gray-300">
              Brain<span className="text-brand-600">Barter</span>
            </span>
          </div>
          <p className="text-xs text-gray-400">Peer learning, powered by community.</p>
          <div className="flex items-center gap-3">
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors"><RiGithubLine size={18} /></a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors"><RiTwitterLine size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
