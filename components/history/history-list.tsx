'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { useApp } from '@/app/providers'
import { SafeForm } from '@/types'
import { formatDate, formatDateTime, storage, getWorkLocationValue, getWorkTypeValue, getWorkContentValue, getDangerTypesValue } from '@/lib/utils'
import {
  ClockIcon,
  DocumentTextIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface HistoryListProps {
  onCreateFromHistory: (data: Partial<SafeForm>) => void
}

export function HistoryList({ onCreateFromHistory }: HistoryListProps) {
  const { user, isOnline } = useApp()
  const { addToast } = useToast()
  const [applications, setApplications] = useState<SafeForm[]>([])
  const [filteredApplications, setFilteredApplications] = useState<SafeForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadApplications()
  }, [user, isOnline])

  useEffect(() => {
    // 搜索过滤
    if (!searchTerm) {
      setFilteredApplications(applications)
    } else {
      const filtered = applications.filter(app => 
        app.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.workType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredApplications(filtered)
    }
  }, [applications, searchTerm])

  const loadApplications = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      if (isOnline) {
        // 在线模式：从API加载
        const response = await fetch(`/api/safety/user-applications/${user.phoneNumber}`)
        if (response.ok) {
          const data = await response.json()
          setApplications(data)
        } else {
          throw new Error('加载失败')
        }
      } else {
        // 离线模式：从本地存储加载
        const localApplications = storage.get('userApplications') || []
        const userApplications = localApplications.filter(
          (app: SafeForm) => app.userId === user.phoneNumber
        )
        setApplications(userApplications)
      }
    } catch (error) {
      console.error('加载申请记录失败:', error)
      addToast({
        type: 'error',
        title: '加载失败',
        description: '无法加载申请记录，请稍后重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!user) return

    try {
      if (isOnline) {
        // 在线模式：调用API删除
        const response = await fetch(`/api/safety/user-applications/${user.phoneNumber}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setApplications([])
          addToast({
            type: 'success',
            title: '删除成功',
            description: '所有申请记录已删除'
          })
        } else {
          throw new Error('删除失败')
        }
      } else {
        // 离线模式：从本地存储删除
        const localApplications = storage.get('userApplications') || []
        const otherUserApplications = localApplications.filter(
          (app: SafeForm) => app.userId !== user.phoneNumber
        )
        storage.set('userApplications', otherUserApplications)
        setApplications([])
        
        addToast({
          type: 'success',
          title: '删除成功',
          description: '所有申请记录已删除'
        })
      }
    } catch (error) {
      console.error('删除所有记录失败:', error)
      addToast({
        type: 'error',
        title: '删除失败',
        description: '请稍后重试'
      })
    } finally {
      setShowDeleteAllDialog(false)
    }
  }

  const handleDeleteSingle = async (applicationNumber: string) => {
    if (!user) return
    
    setDeletingId(applicationNumber)
    
    try {
      if (isOnline) {
        // 在线模式：调用API删除
        const response = await fetch(`/api/safety/applications/${applicationNumber}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setApplications(prev => prev.filter(app => app.applicationNumber !== applicationNumber))
          addToast({
            type: 'success',
            title: '删除成功',
            description: '申请记录已删除'
          })
        } else {
          throw new Error('删除失败')
        }
      } else {
        // 离线模式：从本地存储删除
        const localApplications = storage.get('userApplications') || []
        const updatedApplications = localApplications.filter(
          (app: SafeForm) => app.applicationNumber !== applicationNumber
        )
        storage.set('userApplications', updatedApplications)
        setApplications(prev => prev.filter(app => app.applicationNumber !== applicationNumber))
        
        addToast({
          type: 'success',
          title: '删除成功',
          description: '申请记录已删除'
        })
      }
    } catch (error) {
      console.error('删除记录失败:', error)
      addToast({
        type: 'error',
        title: '删除失败',
        description: '请稍后重试'
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateFromHistory = (application: SafeForm) => {
    // 将API返回的中文标签转换为表单需要的原始值
    const workTypeValue = getWorkTypeValue(application.workType || '')
    
    // 创建包含所有必要信息的模板数据
    const templateData: Partial<SafeForm> = {
      // 基本信息
      name: application.name,
      idNumber: application.idNumber,
      companyName: application.companyName,
      phoneNumber: application.phoneNumber,
      
      // 作业信息（转换为原始值）
      workLocation: getWorkLocationValue(application.workLocation || ''),
      workType: workTypeValue,
      workContent: getWorkContentValue(workTypeValue, application.workContent || ''),
      isProductWork: application.isProductWork,
      
      // 项目信息
      projectName: application.projectName,
      vehicleNumber: application.vehicleNumber,
      trackPosition: application.trackPosition, // 车道/台位
      
      // 质量返工相关信息
      workBasis: application.workBasis, // 作业依据
      basisNumber: application.basisNumber, // 不合格项编号
      
      // 危险作业类型（保持原始值数组）
      dangerTypes: application.dangerTypes || [],
      
      // 通知人信息
      notifierName: application.notifierName,
      notifierNumber: application.notifierNumber,
      notifierDepartment: application.notifierDepartment,
      
      // 陪同人员
      accompanyingCount: application.accompanyingCount,
      accompanyingPersons: application.accompanyingPersons,
      
      // 工作时长
      workingHours: application.workingHours
      
      // 排除：applicationNumber, submitTime, startDate, startTime（这些需要用户重新填写）
    }
    
    onCreateFromHistory(templateData)
    
    addToast({
      type: 'success',
      title: '模板已应用',
      description: '已基于历史记录创建新申请，请重新设置开始时间'
    })
  }

  const getWorkTypeLabel = (workType: string) => {
    const workTypes = {
      'maintenance': '维护作业',
      'installation': '安装作业',
      'inspection': '检查作业',
      'quality_rework': '质量返工',
      'emergency_repair': '应急抢修',
      'other': '其他作业'
    }
    return workTypes[workType as keyof typeof workTypes] || workType
  }

  const getDangerTypesLabel = (dangerTypes: string[]) => {
    if (!dangerTypes || dangerTypes.length === 0) return '无'
    
    const dangerTypeLabels = {
      'high_altitude': '高处作业',
      'confined_space': '受限空间',
      'hot_work': '动火作业',
      'electrical': '电气作业',
      'lifting': '起重作业',
      'excavation': '挖掘作业',
      'chemical': '化学品作业',
      'radiation': '辐射作业'
    }
    
    return dangerTypes.map(type => 
      dangerTypeLabels[type as keyof typeof dangerTypeLabels] || type
    ).join('、')
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">需要登录</h3>
        <p className="text-gray-600">请先登录后查看申请记录</p>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600">加载中...</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle>申请记录</CardTitle>
                <p className="text-sm text-gray-600">
                  共 {applications.length} 条记录
                  {!isOnline && <span className="text-orange-600"> (离线模式)</span>}
                </p>
              </div>
            </div>
            
            {applications.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteAllDialog(true)}
                className="flex items-center space-x-2"
              >
                <TrashIcon className="h-4 w-4" />
                <span>删除全部</span>
              </Button>
            )}
          </div>
          
          {applications.length > 0 && (
            <div className="mt-4">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder="搜索申请编号、姓名、公司或作业类型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无申请记录</h3>
              <p className="text-gray-600 mb-6">您还没有提交过安全作业申请</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredApplications.map((application, index) => (
                  <motion.div
                    key={application.applicationNumber}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow bg-white"
                  >
                    {/* 手机端：垂直布局，桌面端：水平布局 */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex-1 min-w-0"> {/* min-w-0 防止文字溢出 */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DocumentTextIcon className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="min-w-0 flex-1"> {/* 防止编号过长溢出 */}
                            <h4 className="font-medium text-gray-900 dark:text-gray-900 truncate">
                              {application.applicationNumber}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {formatDateTime(new Date(application.submitTime!))}
                            </p>
                          </div>
                        </div>
                        
                        {/* 手机端：单列布局，平板端：双列，桌面端：三列 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                          <div className="min-w-0">
                            <span className="text-gray-600">申请人：</span>
                            <span className="font-medium text-gray-900 break-words">{application.name}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">公司：</span>
                            <span className="font-medium text-gray-900 break-words">{application.companyName}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">作业类型：</span>
                            <span className="font-medium text-gray-900 break-words">{application.workType}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">作业地点：</span>
                            <span className="font-medium text-gray-900 break-words">{application.workLocation}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">计划开工：</span>
                            <span className="font-medium text-gray-900 break-words">
                              {formatDate(new Date(application.startDate!))} {application.startTime}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">危险作业：</span>
                            <span className="font-medium text-gray-900 break-words">{application.dangerTypes}</span>
                          </div>
                        </div>
                        
                        {application.workContent && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 text-sm">作业内容：</span>
                            <p className="text-sm text-gray-900 mt-1 break-words">{application.workContent}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* 手机端：水平排列按钮，桌面端：垂直排列 */}
                      <div className="flex sm:flex-col items-center justify-end space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateFromHistory(application)}
                          className="flex items-center space-x-1 whitespace-nowrap"
                        >
                          <PlusIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">参考创建</span>
                          <span className="sm:hidden">参考</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deletingId === application.applicationNumber}
                          onClick={() => handleDeleteSingle(application.applicationNumber!)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredApplications.length === 0 && searchTerm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">未找到匹配的申请记录</p>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 删除全部确认对话框 */}
      <AnimatePresence>
        {showDeleteAllDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteAllDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">确认删除</h3>
                  <p className="text-sm text-gray-600">此操作不可撤销</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                您确定要删除所有申请记录吗？这将永久删除 {applications.length} 条记录。
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteAllDialog(false)}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAll}
                >
                  确认删除
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}