'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types'
import { storage } from '@/lib/utils'

interface AppContextType {
  user: User | null
  setUser: (user: User | null) => void
  isOnline: boolean
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within a Providers')
  }
  return context
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 初始化网络状态
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 从本地存储恢复用户信息
  useEffect(() => {
    const savedUser = storage.get('currentUser')
    if (savedUser) {
      setUser(savedUser)
    }
  }, [])

  // 保存用户信息到本地存储
  useEffect(() => {
    if (user) {
      storage.set('currentUser', user)
    } else {
      storage.remove('currentUser')
    }
  }, [user])

  // 注册 Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          // console.log('SW registration failed: ', registrationError)
        })
    }
  }, [])

  const value = {
    user,
    setUser,
    isOnline,
    isLoading,
    setIsLoading,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}