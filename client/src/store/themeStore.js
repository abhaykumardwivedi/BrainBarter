import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const next = !get().dark
        set({ dark: next })
        document.documentElement.classList.toggle('dark', next)
      },
      init: () => {
        const dark = get().dark
        document.documentElement.classList.toggle('dark', dark)
      },
    }),
    { name: 'bb-theme' }
  )
)

export default useThemeStore
