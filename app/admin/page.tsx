'use client'

import { useState } from 'react'
import { SystemManagement } from '@/components/admin/system-management'
import { AdminAuth } from '@/components/admin/admin-auth'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">系统管理</h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            退出管理
          </button>
        </div>
        <SystemManagement />
      </div>
    </div>
  )
}