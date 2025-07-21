'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'
import { useApp } from '@/app/providers'
import { validatePhoneNumber } from '@/lib/utils'
import { UserIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser, isOnline } = useApp()
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证手机号格式
    if (!validatePhoneNumber(phoneNumber)) {
      setError('请输入正确的手机号码格式')
      return
    }

    setIsLoading(true)

    try {
      if (isOnline) {
        // 在线模式：调用API验证
        const response = await fetch(`/api/safety/user/${phoneNumber}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setUser({
            id: userData.id,
            phoneNumber: phoneNumber,
            lastLogin: new Date()
          })
          
          addToast({
            type: 'success',
            title: '登录成功',
            description: `欢迎回来，${phoneNumber}`
          })
          
          onSuccess()
        } else if (response.status === 404) {
          // 用户不存在，创建新用户
          const createResponse = await fetch('/api/safety/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber })
          })

          if (createResponse.ok) {
            const newUserData = await createResponse.json()
            setUser({
              id: newUserData.id,
              phoneNumber: phoneNumber,
              lastLogin: new Date()
            })
            
            addToast({
              type: 'success',
              title: '注册成功',
              description: '欢迎使用安全作业申请系统'
            })
            
            onSuccess()
          } else {
            throw new Error('创建用户失败')
          }
        } else {
          throw new Error('登录失败')
        }
      } else {
        // 离线模式：直接创建本地用户
        setUser({
          id: Date.now(),
          phoneNumber: phoneNumber,
          lastLogin: new Date()
        })
        
        addToast({
          type: 'success',
          title: '离线登录成功',
          description: '数据将在网络恢复后同步'
        })
        
        onSuccess()
      }
    } catch (error) {
      console.error('登录错误:', error)
      setError('登录失败，请稍后重试')
      addToast({
        type: 'error',
        title: '登录失败',
        description: '请检查网络连接或稍后重试'
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
      className="w-full max-w-md mx-auto"
    >
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="h-6 w-6 text-primary-600" />
          </div>
          <CardTitle>用户登录</CardTitle>
          <p className="text-sm text-gray-600">
            请输入您的手机号码进行登录
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="手机号码"
              type="tel"
              placeholder="请输入11位手机号码"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                setError('')
              }}
              error={!!error}
              helperText={error}
              required
              maxLength={11}
              className="text-center text-lg tracking-wider"
            />

            {!isOnline && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <DevicePhoneMobileIcon className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    当前处于离线模式，登录后数据将在网络恢复时同步
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={!phoneNumber || phoneNumber.length !== 11}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">登录说明</h4>
              <ul className="text-xs text-gray-600 space-y-1 text-left">
                <li>• 仅支持中国大陆手机号码（11位数字，以1开头）</li>
                <li>• 首次使用将自动创建账户</li>
                <li>• 登录后可查看历史申请记录</li>
                <li>• 支持离线使用，数据会自动同步</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}