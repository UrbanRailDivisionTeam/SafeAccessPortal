'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { useApp } from '@/app/providers'
import { storage } from '@/lib/utils'
import {
  CogIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

interface Company {
  id: number
  name: string
}

interface Project {
  id: number
  name: string
}

interface Personnel {
  id: number
  name: string
  employee_number: string
  department: string
}

export function SystemManagement() {
  const { isOnline } = useApp()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'companies' | 'projects' | 'personnel'>('companies')
  const [isLoading, setIsLoading] = useState(false)
  
  // 数据状态 - 使用函数形式确保初始值稳定
  const [companies, setCompanies] = useState<Company[]>(() => [])
  const [projects, setProjects] = useState<Project[]>(() => [])
  const [personnel, setPersonnel] = useState<Personnel[]>(() => [])
  
  // 添加总数状态 - 用于显示真实的数据总数
  const [totalCounts, setTotalCounts] = useState({
    companies: 0,
    projects: 0,
    personnel: 0
  })
  
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('')
  
  // 添加表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemData, setNewItemData] = useState({
    name: '',
    employeeNumber: '',
    department: ''
  })
  
  // 多选状态
  const [selectedIds, setSelectedIds] = useState<number[]>(() => [])
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab, isOnline])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (isOnline) {
        // 在线模式：从API加载
        switch (activeTab) {
          case 'companies':
            try {
              const companiesRes = await fetch('/api/companies?limit=1000')
              if (companiesRes.ok) {
                const response = await companiesRes.json()
                // API返回的是{data: [...], pagination: {...}}格式
                setCompanies(Array.isArray(response.data) ? response.data : [])
                // 保存真实的总数
                setTotalCounts(prev => ({
                  ...prev,
                  companies: response.pagination?.total || 0
                }))
              } else {
                setCompanies([])
                setTotalCounts(prev => ({ ...prev, companies: 0 }))
              }
            } catch {
              setCompanies([])
              setTotalCounts(prev => ({ ...prev, companies: 0 }))
            }
            break
          case 'projects':
            try {
              const projectsRes = await fetch('/api/projects?limit=1000')
              if (projectsRes.ok) {
                const response = await projectsRes.json()
                // API返回的是{data: [...], pagination: {...}}格式
                setProjects(Array.isArray(response.data) ? response.data : [])
                // 保存真实的总数
                setTotalCounts(prev => ({
                  ...prev,
                  projects: response.pagination?.total || 0
                }))
              } else {
                setProjects([])
                setTotalCounts(prev => ({ ...prev, projects: 0 }))
              }
            } catch {
              setProjects([])
              setTotalCounts(prev => ({ ...prev, projects: 0 }))
            }
            break
          case 'personnel':
            try {
              const personnelRes = await fetch('/api/personnel?limit=1000')
              if (personnelRes.ok) {
                const response = await personnelRes.json()
                // API返回的是{data: [...], pagination: {...}}格式
                setPersonnel(Array.isArray(response.data) ? response.data : [])
                // 保存真实的总数
                setTotalCounts(prev => ({
                  ...prev,
                  personnel: response.pagination?.total || 0
                }))
              } else {
                setPersonnel([])
                setTotalCounts(prev => ({ ...prev, personnel: 0 }))
              }
            } catch {
              setPersonnel([])
              setTotalCounts(prev => ({ ...prev, personnel: 0 }))
            }
            break
        }
      } else {
        // 离线模式：从本地存储加载
        const localCompanies = storage.get('companies') || []
        const localProjects = storage.get('projects') || []
        const localPersonnel = storage.get('personnel') || []
        
        // 将存储格式转换为组件所需格式
        const companiesData = Array.isArray(localCompanies) 
          ? localCompanies.map((item: any, index: number) => ({
              id: item.id || index + 1,
              name: item.value || item.name || ''
            }))
          : []
        
        const projectsData = Array.isArray(localProjects)
          ? localProjects.map((item: any, index: number) => ({
              id: item.id || index + 1,
              name: item.value || item.name || ''
            }))
          : []
        
        const personnelData = Array.isArray(localPersonnel)
          ? localPersonnel.map((item: any, index: number) => ({
              id: item.id || index + 1,
              name: item.value || item.name || '',
              employee_number: item.employeeNumber || item.employee_number || '',
              department: item.department || ''
            }))
          : []
        
        setCompanies(companiesData)
        setProjects(projectsData)
        setPersonnel(personnelData)
        
        // 离线模式下，总数等于实际数据长度
        setTotalCounts({
          companies: companiesData.length,
          projects: projectsData.length,
          personnel: personnelData.length
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      // 确保即使出错也设置空数组
      setCompanies([])
      setProjects([])
      setPersonnel([])
      addToast({
        type: 'error',
        title: '加载失败',
        description: '无法加载数据，请稍后重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newItemData.name.trim()) {
      addToast({
        type: 'error',
        title: '验证失败',
        description: '名称不能为空'
      })
      return
    }

    if (activeTab === 'personnel') {
      if (!newItemData.employeeNumber.trim() || !newItemData.department.trim()) {
        addToast({
          type: 'error',
          title: '验证失败',
          description: '工号和部门不能为空'
        })
        return
      }
    }

    try {
      if (isOnline) {
        // 在线模式：调用API
        const endpoint = `/api/${activeTab}`
        const body = activeTab === 'personnel' 
          ? {
              name: newItemData.name.trim(),
              employeeNumber: newItemData.employeeNumber.trim(),
              department: newItemData.department.trim()
            }
          : { name: newItemData.name.trim() }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        })

        if (response.ok) {
          const newItem = await response.json()
          
          switch (activeTab) {
            case 'companies':
              setCompanies(prev => [...prev, newItem])
              break
            case 'projects':
              setProjects(prev => [...prev, newItem])
              break
            case 'personnel':
              setPersonnel(prev => [...prev, newItem])
              break
          }
          
          addToast({
            type: 'success',
            title: '添加成功',
            description: `${getTabLabel(activeTab)}已添加`
          })
        } else {
          const error = await response.json()
          throw new Error(error.error || '添加失败')
        }
      } else {
        // 离线模式：保存到本地存储
        const newItem = {
          id: Date.now(),
          name: newItemData.name.trim(),
          ...(activeTab === 'personnel' && {
            employee_number: newItemData.employeeNumber.trim(),
            department: newItemData.department.trim()
          })
        }

        switch (activeTab) {
          case 'companies':
            const newCompanies = [...companies, newItem as Company]
            setCompanies(newCompanies)
            storage.set('companies', newCompanies.map(c => ({ value: c.name, label: c.name })))
            break
          case 'projects':
            const newProjects = [...projects, newItem as Project]
            setProjects(newProjects)
            storage.set('projects', newProjects.map(p => ({ value: p.name, label: p.name })))
            break
          case 'personnel':
            const newPersonnel = [...personnel, newItem as Personnel]
            setPersonnel(newPersonnel)
            storage.set('personnel', newPersonnel.map(p => ({
              value: p.name,
              label: p.name,
              employeeNumber: p.employee_number,
              department: p.department
            })))
            break
        }
        
        addToast({
          type: 'success',
          title: '添加成功',
          description: `${getTabLabel(activeTab)}已添加（离线模式）`
        })
      }
      
      // 重置表单
      setNewItemData({ name: '', employeeNumber: '', department: '' })
      setShowAddForm(false)
    } catch (error) {
      console.error('添加失败:', error)
      addToast({
        type: 'error',
        title: '添加失败',
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      if (isOnline) {
        // 在线模式：调用API删除
        const response = await fetch(`/api/${activeTab}?id=${id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '删除失败')
        }
      }
      
      // 更新前端状态
      switch (activeTab) {
        case 'companies':
          setCompanies(prev => prev.filter(item => item.id !== id))
          if (!isOnline) {
            const newCompanies = companies.filter(item => item.id !== id)
            storage.set('companies', newCompanies.map(c => ({ value: c.name, label: c.name })))
          }
          break
        case 'projects':
          setProjects(prev => prev.filter(item => item.id !== id))
          if (!isOnline) {
            const newProjects = projects.filter(item => item.id !== id)
            storage.set('projects', newProjects.map(p => ({ value: p.name, label: p.name })))
          }
          break
        case 'personnel':
          setPersonnel(prev => prev.filter(item => item.id !== id))
          if (!isOnline) {
            const newPersonnel = personnel.filter(item => item.id !== id)
            storage.set('personnel', newPersonnel.map(p => ({
              value: p.name,
              label: p.name,
              employeeNumber: p.employee_number,
              department: p.department
            })))
          }
          break
      }
      
      // 清除选中状态
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
      
      addToast({
        type: 'success',
        title: '删除成功',
        description: `${getTabLabel(activeTab)}已删除${!isOnline ? '（离线模式）' : ''}`
      })
    } catch (error) {
      console.error('删除失败:', error)
      addToast({
        type: 'error',
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    }
  }
  
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    
    try {
      if (isOnline) {
        // 在线模式：调用API批量删除
        const response = await fetch(`/api/${activeTab}?ids=${selectedIds.join(',')}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '批量删除失败')
        }
      }
      
      // 更新前端状态
      switch (activeTab) {
        case 'companies':
          setCompanies(prev => prev.filter(item => !selectedIds.includes(item.id)))
          if (!isOnline) {
            const newCompanies = companies.filter(item => !selectedIds.includes(item.id))
            storage.set('companies', newCompanies.map(c => ({ value: c.name, label: c.name })))
          }
          break
        case 'projects':
          setProjects(prev => prev.filter(item => !selectedIds.includes(item.id)))
          if (!isOnline) {
            const newProjects = projects.filter(item => !selectedIds.includes(item.id))
            storage.set('projects', newProjects.map(p => ({ value: p.name, label: p.name })))
          }
          break
        case 'personnel':
          setPersonnel(prev => prev.filter(item => !selectedIds.includes(item.id)))
          if (!isOnline) {
            const newPersonnel = personnel.filter(item => !selectedIds.includes(item.id))
            storage.set('personnel', newPersonnel.map(p => ({
              value: p.name,
              label: p.name,
              employeeNumber: p.employee_number,
              department: p.department
            })))
          }
          break
      }
      
      // 清除选中状态
      setSelectedIds([])
      setSelectAll(false)
      
      addToast({
        type: 'success',
        title: '批量删除成功',
        description: `成功删除 ${selectedIds.length} 个${getTabLabel(activeTab)}${!isOnline ? '（离线模式）' : ''}`
      })
    } catch (error) {
      console.error('批量删除失败:', error)
      addToast({
        type: 'error',
        title: '批量删除失败',
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    }
  }
  
  const handleDeleteAll = async () => {
    const currentData = getCurrentData()
    if (currentData.length === 0) return
    
    const allIds = currentData.map(item => item.id)
    
    try {
      if (isOnline) {
        // 在线模式：调用API批量删除
        const response = await fetch(`/api/${activeTab}?ids=${allIds.join(',')}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '全部删除失败')
        }
      }
      
      // 更新前端状态
      switch (activeTab) {
        case 'companies':
          setCompanies([])
          if (!isOnline) {
            storage.set('companies', [])
          }
          break
        case 'projects':
          setProjects([])
          if (!isOnline) {
            storage.set('projects', [])
          }
          break
        case 'personnel':
          setPersonnel([])
          if (!isOnline) {
            storage.set('personnel', [])
          }
          break
      }
      
      // 清除选中状态
      setSelectedIds([])
      setSelectAll(false)
      
      addToast({
        type: 'success',
        title: '全部删除成功',
        description: `成功删除所有${getTabLabel(activeTab)}${!isOnline ? '（离线模式）' : ''}`
      })
    } catch (error) {
      console.error('全部删除失败:', error)
      addToast({
        type: 'error',
        title: '全部删除失败',
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    }
  }

  const handleExport = () => {
    let data: any[] = []
    let filename = ''
    
    switch (activeTab) {
      case 'companies':
        data = companies
        filename = 'companies.json'
        break
      case 'projects':
        data = projects
        filename = 'projects.json'
        break
      case 'personnel':
        data = personnel
        filename = 'personnel.json'
        break
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    addToast({
      type: 'success',
      title: '导出成功',
      description: `${getTabLabel(activeTab)}数据已导出`
    })
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // 如果文件是CSV，使用专门的CSV导入API
    if (file.name.endsWith('.csv')) {
      try {
        setIsLoading(true)
        
        const formData = new FormData()
        formData.append('file', file)
        
        const endpoint = `/api/${activeTab}/import`
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        })
        
        const result = await response.json()
        
        if (response.ok) {
          addToast({
            type: 'success',
            title: '导入成功',
            description: result.message
          })
          
          // 如果有错误记录，显示详细信息
          if (result.errorCount > 0) {
            console.warn('导入时发现错误记录:', result.errorRecords)
            addToast({
              type: 'warning',
              title: '部分记录导入失败',
              description: `${result.errorCount} 条记录导入失败，请检查控制台获取详细信息`
            })
          }
          
          // 重新加载数据
          await loadData()
        } else {
          throw new Error(result.error || '导入失败')
        }
      } catch (error) {
        console.error('CSV导入失败:', error)
        addToast({
          type: 'error',
          title: '导入失败',
          description: error instanceof Error ? error.message : '请稍后重试'
        })
      } finally {
        setIsLoading(false)
      }
    } else {
      // 原有的JSON导入逻辑
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          
          switch (activeTab) {
            case 'companies':
              setCompanies(Array.isArray(data) ? data : [])
              break
            case 'projects':
              setProjects(Array.isArray(data) ? data : [])
              break
            case 'personnel':
              setPersonnel(Array.isArray(data) ? data : [])
              break
          }
          
          addToast({
            type: 'success',
            title: '导入成功',
            description: `${getTabLabel(activeTab)}数据已导入`
          })
        } catch (error) {
          addToast({
            type: 'error',
            title: '导入失败',
            description: '文件格式不正确'
          })
        }
      }
      reader.readAsText(file)
    }
    
    // 重置文件输入
    event.target.value = ''
  }

  const getTabLabel = (tab: string) => {
    const labels = {
      companies: '公司',
      projects: '项目',
      personnel: '人员'
    }
    return labels[tab as keyof typeof labels]
  }

  const getTabIcon = (tab: string) => {
    const icons = {
      companies: BuildingOfficeIcon,
      projects: BriefcaseIcon,
      personnel: UserGroupIcon
    }
    return icons[tab as keyof typeof icons]
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'companies':
        const companiesArray = Array.isArray(companies) ? companies : []
        return companiesArray.filter(item => 
          item && item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      case 'projects':
        const projectsArray = Array.isArray(projects) ? projects : []
        return projectsArray.filter(item => 
          item && item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      case 'personnel':
        const personnelArray = Array.isArray(personnel) ? personnel : []
        return personnelArray.filter(item => 
          item && item.name && item.employee_number && item.department &&
          (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.department.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      default:
        return []
    }
  }
  
  const handleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id)
      } else {
        return [...prev, id]
      }
    })
  }
  
  const handleSelectAll = () => {
    const currentData = getCurrentData()
    if (selectAll) {
      setSelectedIds([])
      setSelectAll(false)
    } else {
      setSelectedIds(currentData.map(item => item.id))
      setSelectAll(true)
    }
  }
  
  // 当数据变化时，更新全选状态
  useEffect(() => {
    const currentData = getCurrentData()
    const allSelected = currentData.length > 0 && currentData.every(item => selectedIds.includes(item.id))
    setSelectAll(allSelected)
  }, [selectedIds, activeTab, searchTerm, companies, projects, personnel])

  const tabs = [
    { key: 'companies', label: '公司管理', icon: BuildingOfficeIcon },
    { key: 'projects', label: '项目管理', icon: BriefcaseIcon },
    { key: 'personnel', label: '人员管理', icon: UserGroupIcon }
  ] as const

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
                <CogIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle>系统管理</CardTitle>
                <p className="text-sm text-gray-600">
                  管理基础数据
                  {!isOnline && <span className="text-orange-600"> (离线模式)</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-file')?.click()}
                className="flex items-center space-x-2"
              >
                <DocumentArrowUpIcon className="h-4 w-4" />
                <span>导入</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center space-x-2"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>导出</span>
              </Button>
            </div>
          </div>
          
          {/* 标签页 */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setSearchTerm('')
                    setShowAddForm(false)
                    setSelectedIds([])
                    setSelectAll(false)
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          {/* 数据统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">公司总数</p>
                  <p className="text-2xl font-bold text-blue-900">{totalCounts.companies.toLocaleString()}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    {isOnline ? '在线数据' : '离线数据'} • 显示前1000条
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">项目总数</p>
                  <p className="text-2xl font-bold text-green-900">{totalCounts.projects.toLocaleString()}</p>
                  <p className="text-xs text-green-500 mt-1">
                    {isOnline ? '在线数据' : '离线数据'} • 显示前1000条
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                  <BriefcaseIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">人员总数</p>
                  <p className="text-2xl font-bold text-purple-900">{totalCounts.personnel.toLocaleString()}</p>
                  <p className="text-xs text-purple-500 mt-1">
                    {isOnline ? '在线数据' : '离线数据'} • 显示前1000条
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* 搜索和操作 */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                placeholder={`搜索${getTabLabel(activeTab)}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                style={{ backgroundColor: 'white' }}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedIds.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDelete}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>删除选中 ({selectedIds.length})</span>
                  </Button>
                </>
              )}
              
              {getCurrentData().length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAll}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>全部删除</span>
                </Button>
              )}
              
              <Button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>添加{getTabLabel(activeTab)}</span>
              </Button>
            </div>
          </div>

          {/* 添加表单 */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border border-gray-200 rounded-lg p-4 mb-6"
              >
                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  添加{getTabLabel(activeTab)}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="名称"
                    required
                    value={newItemData.name}
                    onChange={(e) => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={`请输入${getTabLabel(activeTab)}名称`}
                  />
                  
                  {activeTab === 'personnel' && (
                    <>
                      <Input
                        label="工号"
                        required
                        value={newItemData.employeeNumber}
                        onChange={(e) => setNewItemData(prev => ({ ...prev, employeeNumber: e.target.value }))}
                        placeholder="请输入工号"
                      />
                      
                      <Input
                        label="部门"
                        required
                        value={newItemData.department}
                        onChange={(e) => setNewItemData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="请输入部门"
                      />
                    </>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewItemData({ name: '', employeeNumber: '', department: '' })
                    }}
                  >
                    取消
                  </Button>
                  <Button onClick={handleAdd}>
                    添加
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 数据列表 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getCurrentData().length > 0 && (
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      style={{ backgroundColor: 'white', accentColor: '#3b82f6' }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {selectAll ? '取消全选' : '全选'} ({getCurrentData().length} 项)
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    已选择 {selectedIds.length} 项
                  </span>
                </div>
              )}
              
              {getCurrentData().map((item, index) => {
                const Icon = getTabIcon(activeTab)
                const isSelected = selectedIds.includes(item.id)
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-all ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        style={{ backgroundColor: 'white', accentColor: '#3b82f6' }}
                      />
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{item.name}</h5>
                        {activeTab === 'personnel' && 'employee_number' in item && (
                          <p className="text-sm text-gray-600">
                            工号：{(item as Personnel).employee_number} | 部门：{(item as Personnel).department}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )
              })}
              
              {getCurrentData().length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {(() => {
                      const Icon = getTabIcon(activeTab)
                      return <Icon className="h-6 w-6 text-gray-400" />
                    })()}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    暂无{getTabLabel(activeTab)}数据
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm ? '未找到匹配的结果' : `点击上方按钮添加${getTabLabel(activeTab)}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}