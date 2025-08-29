'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApp } from './providers'
import { LoginForm } from '@/components/auth/login-form'
import { SafetyForm } from '@/components/forms/safety-form'
import { HistoryList } from '@/components/history/history-list'
import { QRCodeDisplay } from '@/components/ui/qr-code'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  UserIcon, 
  DocumentPlusIcon, 
  ClockIcon,
  QrCodeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { 
  getWorkTypeValue, 
  getWorkLocationValue, 
  getWorkContentValue, 
  getDangerTypesValue 
} from '@/lib/utils'
import { SafeForm } from '@/types'

type ViewType = 'home' | 'login' | 'form' | 'history' | 'qr'

export default function HomePage() {
  const { user, setUser, isOnline } = useApp()
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [showQR, setShowQR] = useState(false)
  const [historyData, setHistoryData] = useState<any>(null)

  // 填充上次记录的回调函数
  const handleFillLastRecord = async (): Promise<Partial<SafeForm> | null> => {
    if (!user) {
      throw new Error('用户未登录')
    }

    const response = await fetch(`/api/safety/user-applications/${user.phoneNumber}?limit=1`)
    if (!response.ok) {
      throw new Error('获取历史记录失败')
    }

    const data = await response.json()
    if (data.length === 0) {
      return null
    }

    const lastRecord = data[0]
    
    // 将API返回的中文标签转换为表单需要的原始值
    const workTypeValue = getWorkTypeValue(lastRecord.workType || '')
    
    // 创建转换后的记录数据
    const convertedData: Partial<SafeForm> = {
      // 基本信息
      name: lastRecord.name,
      idNumber: lastRecord.idNumber,
      companyName: lastRecord.companyName || lastRecord.work_company, // 兼容数据库字段名
      phoneNumber: lastRecord.phoneNumber,
      
      // 作业信息（转换为原始值）
      workLocation: getWorkLocationValue(lastRecord.workLocation || ''),
      workType: workTypeValue,
      workContent: getWorkContentValue(workTypeValue, lastRecord.workContent || ''),
      isProductWork: lastRecord.isProductWork,
      
      // 项目信息
      projectName: lastRecord.projectName,
      vehicleNumber: lastRecord.vehicleNumber,
      trackPosition: lastRecord.trackPosition,
      
      // 质量返工相关信息
      workBasis: lastRecord.workBasis,
      basisNumber: lastRecord.basisNumber,
      
      // 危险作业类型（转换为原始值数组）
      dangerTypes: getDangerTypesValue(lastRecord.dangerTypes || ''),
      
      // 通知人信息
      notifierName: lastRecord.notifierName || lastRecord.notifier_name, // 兼容数据库字段名
      notifierNumber: lastRecord.notifierNumber || lastRecord.notifier_number,
      notifierDepartment: lastRecord.notifierDepartment || lastRecord.notifier_department,
      
      // 陪同人员
      accompanyingCount: lastRecord.accompanyingCount,
      accompanyingPersons: lastRecord.accompanyingPersons,
      
      // 工作时长
      workingHours: lastRecord.workingHours
    }
    
    return convertedData
  }

  // 根据用户状态决定默认视图
  useEffect(() => {
    // 只在初始加载时，如果用户已登录且当前视图是默认的home，则切换到表单
    // 但不要在用户主动返回首页时强制切换
    if (currentView === 'home' && user && !localStorage.getItem('userReturnedHome')) {
      // 已登录用户默认显示表单
      setCurrentView('form')
    }
  }, [user])

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <LoginForm onSuccess={() => {
              localStorage.removeItem('userReturnedHome')
              setCurrentView('form')
            }} />
          </motion.div>
        )
      case 'form':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SafetyForm 
              onSuccess={() => {
                setCurrentView('home')
                setHistoryData(null)
              }} 
              initialData={historyData}
              onFillLastRecord={handleFillLastRecord}
            />
          </motion.div>
        )
      case 'history':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HistoryList onCreateFromHistory={(data) => {
              // 设置历史数据并切换到表单视图
              setHistoryData(data)
              localStorage.removeItem('userReturnedHome')
              setCurrentView('form')
            }} />
          </motion.div>
        )
      case 'qr':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            <QRCodeDisplay />
          </motion.div>
        )
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* 欢迎区域 */}
            <div className="text-center">
              <motion.h1 
                className="text-4xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                城轨事业部安全作业申请系统
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                专为安全作业申请的提交和管理设计，确保工作场所安全
              </motion.p>
            </div>

            {/* 用户状态显示 */}
            {user && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-primary-50 border-primary-200">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-6 w-6 text-primary-600" />
                    <div>
                      <p className="text-primary-900 font-medium">
                        欢迎回来！手机号：{user.phoneNumber}
                      </p>
                      <p className="text-primary-700 text-sm">
                        上次登录：{new Date(user.lastLogin).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* 功能按钮网格 */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {/* 新建申请 */}
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => {
                localStorage.removeItem('userReturnedHome')
                setCurrentView('form')
              }}>
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                    <DocumentPlusIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">新建申请</h3>
                  <p className="text-gray-600 text-sm">创建新的安全作业申请</p>
                </div>
              </Card>

              {/* 历史记录 */}
              <Card className={`transition-all duration-200 cursor-pointer group ${
                user ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
              }`}
                    onClick={() => user && setCurrentView('history')}>
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <ClockIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">历史记录</h3>
                  <p className="text-gray-600 text-sm">
                    {user ? '查看和管理历史申请' : '需要登录后查看'}
                  </p>
                </div>
              </Card>

              {/* 扫码访问 */}
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => setCurrentView('qr')}>
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                    <QrCodeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">扫码访问</h3>
                  <p className="text-gray-600 text-sm">生成二维码供移动设备访问</p>
                </div>
              </Card>
            </motion.div>

            {/* 登录/注销按钮 */}
            <motion.div 
              className="flex justify-center space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {user ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // 清除用户状态和本地存储
                    setUser(null)
                    localStorage.removeItem('currentUser')
                    // 重置视图到首页
                    setCurrentView('home')
                  }}
                >
                  注销登录
                </Button>
              ) : (
                <Button onClick={() => setCurrentView('login')}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  用户登录
                </Button>
              )}
            </motion.div>

            {/* 管理员入口 */}
            <motion.div 
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Link 
                href="/admin" 
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-1" />
                系统管理
              </Link>
            </motion.div>
          </motion.div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // console.log('标题被点击，当前视图:', currentView)
                  localStorage.setItem('userReturnedHome', 'true')
                  setCurrentView('home')
                  // console.log('通过标题设置视图为home')
                }}
                className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
              >
                城轨事业部安全作业申请系统
              </button>
              {!isOnline && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  离线模式
                </span>
              )}
            </div>
            
            {currentView !== 'home' && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  // console.log('返回首页按钮被点击，当前视图:', currentView)
                  localStorage.setItem('userReturnedHome', 'true')
                  setCurrentView('home')
                  // console.log('设置视图为home')
                }}
              >
                返回首页
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  )
}