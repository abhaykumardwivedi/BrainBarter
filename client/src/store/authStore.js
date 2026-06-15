import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, profile: null }),
}))

export default useAuthStore
