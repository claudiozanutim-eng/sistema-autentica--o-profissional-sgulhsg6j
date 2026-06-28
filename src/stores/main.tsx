import { createContext, useContext, useState, ReactNode } from 'react'

interface AppStore {
  selectedYear: number
  setSelectedYear: (year: number) => void
  selectedMonth: number | null
  setSelectedMonth: (month: number | null) => void
}

const AppContext = createContext<AppStore | undefined>(undefined)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  return (
    <AppContext.Provider value={{ selectedYear, setSelectedYear, selectedMonth, setSelectedMonth }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}

export default useAppStore
