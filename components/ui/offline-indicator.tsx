'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // 显示恢复连接提示
      setShowIndicator(true)
      setTimeout(() => setShowIndicator(false), 3000)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowIndicator(true)
    }

    // 初始化网络状态
    setIsOnline(navigator.onLine)
    if (!navigator.onLine) {
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium ${
            isOnline 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-500 text-yellow-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            {isOnline ? (
              <>
                <WifiIcon className="h-4 w-4" />
                <span>网络连接已恢复</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>当前处于离线状态，部分功能可能受限</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}