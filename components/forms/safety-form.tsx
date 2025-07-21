'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SmartSearch } from '@/components/ui/smart-search'
import { CheckboxGroup } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toaster'
import { useApp } from '@/app/providers'
import { 
  SafeForm, 
  AccompanyingPerson,
  WORKING_HOURS,
  WORK_BASIS,
  START_TIMES
} from '@/types'
import {
  WORK_LOCATIONS,
  WORK_TYPES,
  DANGER_TYPES,
  WORK_CONTENT_OPTIONS
} from '@/lib/config'
import { 
  validateForm, 
  generateApplicationNumber, 
  formatDate,
  storage,
  getWorkContentLabel,
  getWorkTypeValue,
  getWorkLocationValue,
  getWorkContentValue,
  getDangerTypesValue
} from '@/lib/utils'
import { 
  DocumentTextIcon, 
  UserPlusIcon, 
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface SafetyFormProps {
  onSuccess: () => void
  initialData?: Partial<SafeForm>
}

export function SafetyForm({ onSuccess, initialData }: SafetyFormProps) {
  const { user, isOnline } = useApp()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 表单数据状态
  const [formData, setFormData] = useState<Partial<SafeForm>>({
    name: '',
    idNumber: '',
    companyName: '',
    phoneNumber: user?.phoneNumber || '',
    startDate: '',
    startTime: '',
    workingHours: '',
    workLocation: '',
    workType: '',
    isProductWork: false,
    projectName: '',
    vehicleNumber: '',
    trackPosition: '',
    workContent: '',
    workBasis: '',
    basisNumber: '',
    dangerTypes: [],
    notifierName: '',
    notifierNumber: '',
    notifierDepartment: '',
    accompanyingCount: 0,
    accompanyingPersons: [],
    ...initialData
  })

  // 移除人员数据状态，改为使用SmartSearch组件按需搜索

  // 处理初始数据
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    } else {
      const savedData = storage.get('formDraft')
      if (savedData) {
        setFormData(prev => ({ ...prev, ...savedData }))
      }
    }
  }, [initialData])

  // 自动保存表单数据到本地存储
  useEffect(() => {
    const timer = setTimeout(() => {
      storage.set('formDraft', formData)
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData])

  // 移除loadPersonnelData函数，SmartSearch组件会直接调用API进行搜索

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // 特殊处理
    if (field === 'workType') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        isProductWork: value === 'quality_rework',
        workContent: '' // 清空作业内容选择
      }))
    }

    if (field === 'workBasis') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        basisNumber: '' // 清空依据编号
      }))
    }

    // notifierName的自动填充逻辑已移至SmartSearch组件的onSelect中

    if (field === 'accompanyingCount') {
      const count = parseInt(value) || 0
      const persons = Array(count).fill(null).map(() => ({
        name: '',
        idNumber: '',
        phoneNumber: ''
      }))
      setFormData(prev => ({
        ...prev,
        accompanyingCount: count,
        accompanyingPersons: persons
      }))
    }
  }

  const handleAccompanyingPersonChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newPersons = [...(prev.accompanyingPersons || [])]
      newPersons[index] = { ...newPersons[index], [field]: value }
      return { ...prev, accompanyingPersons: newPersons }
    })
  }

  const fillLastRecord = async () => {
    if (!user) {
      addToast({
        type: 'warning',
        title: '需要登录',
        description: '请先登录后使用此功能'
      })
      return
    }

    try {
      const response = await fetch(`/api/safety/user-applications/${user.phoneNumber}?limit=1`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          const lastRecord = data[0]
          
          // 将API返回的中文标签转换为表单需要的原始值
          const workTypeValue = getWorkTypeValue(lastRecord.workType || '')
          
          // 创建转换后的记录数据
          const convertedData = {
            // 基本信息
            name: lastRecord.name,
            idNumber: lastRecord.idNumber,
            companyName: lastRecord.companyName,
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
            notifierName: lastRecord.notifierName,
            notifierNumber: lastRecord.notifierNumber,
            notifierDepartment: lastRecord.notifierDepartment,
            
            // 陪同人员
            accompanyingCount: lastRecord.accompanyingCount,
            accompanyingPersons: lastRecord.accompanyingPersons,
            
            // 工作时长
            workingHours: lastRecord.workingHours
          }
          
          setFormData(prev => ({ ...prev, ...convertedData }))
          addToast({
            type: 'success',
            title: '填充成功',
            description: '已填充上次申请记录（不包括日期）'
          })
        } else {
          addToast({
            type: 'info',
            title: '暂无记录',
            description: '您还没有历史申请记录'
          })
        }
      }
    } catch (error) {
      console.error('填充上次记录失败:', error)
      addToast({
        type: 'error',
        title: '填充失败',
        description: '请稍后重试'
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // 表单验证
    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setIsLoading(false)
      addToast({
        type: 'error',
        title: '表单验证失败',
        description: '请检查并修正表单中的错误'
      })
      return
    }

    try {
      // 生成申请编号
      const applicationNumber = generateApplicationNumber(
        formData.idNumber!,
        formData.phoneNumber!
      )

      const submitData: SafeForm = {
        ...formData as SafeForm,
        applicationNumber,
        submitTime: new Date(),
        userId: user?.phoneNumber
      }

      if (isOnline) {
        // 在线提交
        const response = await fetch('/api/safety/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        })

        if (response.ok) {
          addToast({
            type: 'success',
            title: '提交成功',
            // description: `申请编号：${applicationNumber}`
          })
          
          // 清除草稿
          storage.remove('formDraft')
          onSuccess()
        } else {
          throw new Error('提交失败')
        }
      } else {
        // 离线保存
        const offlineSubmissions = storage.get('offlineSubmissions') || []
        offlineSubmissions.push(submitData)
        storage.set('offlineSubmissions', offlineSubmissions)
        
        addToast({
          type: 'success',
          title: '离线保存成功',
          description: '数据将在网络恢复后自动提交'
        })
        
        storage.remove('formDraft')
        onSuccess()
      }
    } catch (error) {
      console.error('提交失败:', error)
      addToast({
        type: 'error',
        title: '提交失败',
        description: '请稍后重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle>安全作业申请表</CardTitle>
                <p className="text-sm text-gray-600">请如实填写所有必填信息</p>
              </div>
            </div>
            
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={fillLastRecord}
                className="flex items-center space-x-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>填充上次记录</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="姓名"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                />
                
                <Input
                  label="身份证号"
                  required
                  maxLength={18}
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  error={!!errors.idNumber}
                  helperText={errors.idNumber}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    公司名称 <span className="text-red-500">*</span>
                  </label>
                  <SmartSearch
                    apiEndpoint="/api/companies"
                    placeholder="输入公司名称进行搜索..."
                    value={formData.companyName || ''}
                    onSelect={(value) => handleInputChange('companyName', value)}
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                  )}
                </div>
                
                <Input
                  label="联系电话"
                  type="tel"
                  required
                  maxLength={11}
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber}
                />
              </div>
            </div>

            {/* 作业信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">作业信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="计划开工日期"
                  type="date"
                  required
                  min={formatDate(new Date())}
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                />
                
                <Select
                  label="开工开始时间"
                  required
                  options={START_TIMES}
                  value={formData.startTime}
                  onChange={(value) => handleInputChange('startTime', value)}
                  error={!!errors.startTime}
                  helperText={errors.startTime}
                />
                
                <Select
                  label="工作时长"
                  required
                  options={WORKING_HOURS}
                  value={formData.workingHours}
                  onChange={(value) => handleInputChange('workingHours', value)}
                  error={!!errors.workingHours}
                  helperText={errors.workingHours}
                />
                
                <Select
                  label="作业地点"
                  required
                  options={WORK_LOCATIONS}
                  value={formData.workLocation}
                  onChange={(value) => handleInputChange('workLocation', value)}
                  error={!!errors.workLocation}
                  helperText={errors.workLocation}
                />
                
                <Select
                  label="作业类型"
                  required
                  options={WORK_TYPES}
                  value={formData.workType}
                  onChange={(value) => handleInputChange('workType', value)}
                  error={!!errors.workType}
                  helperText={errors.workType}
                />
              </div>
              
              <div className="mt-6">
                <Select
                  label="作业内容"
                  required
                  options={formData.workType ? WORK_CONTENT_OPTIONS[formData.workType] || [] : []}
                  value={formData.workContent}
                  onChange={(value) => handleInputChange('workContent', value)}
                  error={!!errors.workContent}
                  helperText={errors.workContent}
                  placeholder={formData.workType ? "请选择作业内容" : "请先选择作业类型"}
                  disabled={!formData.workType}
                />
              </div>
            </div>

            {/* 产品类作业信息（质量返工时显示，或有初始数据时显示） */}
            {(formData.workType === 'quality_rework' || formData.projectName || formData.vehicleNumber || formData.trackPosition) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">产品类作业信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      项目名称 {formData.workType === 'quality_rework' && <span className="text-red-500">*</span>}
                    </label>
                    <SmartSearch
                      apiEndpoint="/api/projects"
                      placeholder="输入项目名称进行搜索..."
                      value={formData.projectName || ''}
                      onSelect={(value) => handleInputChange('projectName', value)}
                    />
                    {errors.projectName && (
                      <p className="mt-1 text-sm text-red-600">{errors.projectName}</p>
                    )}
                  </div>
                  
                  <Input
                    label="车号"
                    required={formData.workType === 'quality_rework'}
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                    error={!!errors.vehicleNumber}
                    helperText={errors.vehicleNumber}
                  />
                  
                  <Input
                    label="车道/台位"
                    required={formData.workType === 'quality_rework'}
                    value={formData.trackPosition}
                    onChange={(e) => handleInputChange('trackPosition', e.target.value)}
                    error={!!errors.trackPosition}
                    helperText={errors.trackPosition}
                  />
                </div>
              </motion.div>
            )}

            {/* 质量返工相关信息（质量返工时显示，或有初始数据时显示） */}
            {(formData.workType === 'quality_rework' || formData.workBasis || formData.basisNumber) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">质量返工相关信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    label="作业依据"
                    required={formData.workType === 'quality_rework'}
                    options={WORK_BASIS}
                    value={formData.workBasis}
                    onChange={(value) => handleInputChange('workBasis', value)}
                    error={!!errors.workBasis}
                    helperText={errors.workBasis}
                  />
                  
                  <Input
                    label={`${formData.workBasis === 'ncr' ? 'NCR' : formData.workBasis === 'design_change' ? '设计变更' : '不合格项'}编号`}
                    required={formData.workType === 'quality_rework'}
                    value={formData.basisNumber}
                    onChange={(e) => handleInputChange('basisNumber', e.target.value)}
                    error={!!errors.basisNumber}
                    helperText={errors.basisNumber || (formData.workBasis === 'ncr' ? '编号中需包含"ncr"(不区分大小写)' : formData.workBasis === 'design_change' ? '编号中需包含"cm"(不区分大小写)' : '')}
                    placeholder={`请输入${formData.workBasis === 'ncr' ? 'NCR' : formData.workBasis === 'design_change' ? '设计变更' : '不合格项'}编号`}
                  />
                </div>
              </motion.div>
            )}

            {/* 危险作业信息 */}
            <div>
              <CheckboxGroup
                label="危险作业类型"
                required
                options={DANGER_TYPES.map(type => ({ 
                  value: type.value, 
                  label: type.label 
                }))}
                value={formData.dangerTypes || []}
                onChange={(value) => handleInputChange('dangerTypes', value)}
                error={!!errors.dangerTypes}
                helperText={errors.dangerTypes || "请选择所有适用的危险作业类型（选择'无'时不能选择其他项，选择其他项时不能选择'无'）"}
              />
            </div>

            {/* 事业部对接人信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">事业部对接人信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    对接人姓名 <span className="text-red-500">*</span>
                  </label>
                  <SmartSearch
                    apiEndpoint="/api/personnel"
                    placeholder="输入对接人姓名进行搜索..."
                    value={formData.notifierName || ''}
                    onSelect={(value, item) => {
                      handleInputChange('notifierName', value)
                      // 自动填充工号和部门信息
                      if (item) {
                        handleInputChange('notifierNumber', item.employee_number || '')
                        handleInputChange('notifierDepartment', item.department || '')
                      }
                    }}
                  />
                  {errors.notifierName && (
                    <p className="mt-1 text-sm text-red-600">{errors.notifierName}</p>
                  )}
                </div>
                
                <Input
                  label="对接人工号"
                  required
                  readOnly
                  value={formData.notifierNumber}
                  error={!!errors.notifierNumber}
                  helperText={errors.notifierNumber || '选择对接人后自动填充'}
                />
                
                <Input
                  label="所属部门"
                  required
                  readOnly
                  value={formData.notifierDepartment}
                  error={!!errors.notifierDepartment}
                  helperText={errors.notifierDepartment || '选择对接人后自动填充'}
                />
              </div>
            </div>

            {/* 随行人员信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">随行人员信息</h3>
              <div className="mb-6">
                <Input
                  label="随行人数"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.accompanyingCount?.toString() || '0'}
                  onChange={(e) => handleInputChange('accompanyingCount', e.target.value)}
                  helperText="请输入随行人员数量（0-10人）"
                />
              </div>
              
              {(formData.accompanyingCount || 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {Array.from({ length: formData.accompanyingCount || 0 }, (_, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          随行人员 {index + 1}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="姓名"
                          required
                          value={formData.accompanyingPersons?.[index]?.name || ''}
                          onChange={(e) => handleAccompanyingPersonChange(index, 'name', e.target.value)}
                          error={!!errors[`accompanyingPerson_${index}_name`]}
                          helperText={errors[`accompanyingPerson_${index}_name`]}
                        />
                        
                        <Input
                          label="身份证号"
                          required
                          maxLength={18}
                          value={formData.accompanyingPersons?.[index]?.idNumber || ''}
                          onChange={(e) => handleAccompanyingPersonChange(index, 'idNumber', e.target.value)}
                          error={!!errors[`accompanyingPerson_${index}_idNumber`]}
                          helperText={errors[`accompanyingPerson_${index}_idNumber`]}
                        />
                        
                        <Input
                          label="联系电话"
                          type="tel"
                          required
                          maxLength={11}
                          value={formData.accompanyingPersons?.[index]?.phoneNumber || ''}
                          onChange={(e) => handleAccompanyingPersonChange(index, 'phoneNumber', e.target.value)}
                          error={!!errors[`accompanyingPerson_${index}_phoneNumber`]}
                          helperText={errors[`accompanyingPerson_${index}_phoneNumber`]}
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  storage.remove('formDraft')
                  window.location.reload()
                }}
              >
                重置表单
              </Button>
              
              <Button
                type="submit"
                loading={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? '提交中...' : '提交申请'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}