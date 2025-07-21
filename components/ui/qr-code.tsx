'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Button } from './button'
import { ShareIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { useToast } from './toaster'

export function QRCodeDisplay() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const { addToast } = useToast()

  useEffect(() => {
    // 获取当前页面URL
    const url = window.location.href
    setCurrentUrl(url)
    
    // 生成二维码
    QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff'
      }
    })
    .then(url => {
      setQrCodeUrl(url)
    })
    .catch(err => {
      console.error('生成二维码失败:', err)
      addToast({
        type: 'error',
        title: '生成二维码失败',
        description: '请稍后重试'
      })
    })
  }, [])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      addToast({
        type: 'success',
        title: '链接已复制',
        description: '链接已复制到剪贴板'
      })
    } catch (err) {
      console.error('复制失败:', err)
      addToast({
        type: 'error',
        title: '复制失败',
        description: '请手动复制链接'
      })
    }
  }

  const shareUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '安全作业申请系统',
          text: '使用手机扫描二维码或点击链接访问安全作业申请系统',
          url: currentUrl
        })
      } catch (err) {
        console.error('分享失败:', err)
        // 如果分享失败，回退到复制链接
        copyToClipboard()
      }
    } else {
      // 不支持原生分享，回退到复制链接
      copyToClipboard()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Card>
        <CardHeader className="text-center">
          <CardTitle>扫码访问</CardTitle>
          <p className="text-sm text-gray-600">
            使用手机扫描下方二维码快速访问系统
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 二维码显示区域 */}
          <div className="flex justify-center">
            {qrCodeUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <img 
                  src={qrCodeUrl} 
                  alt="系统访问二维码" 
                  className="w-64 h-64"
                />
              </motion.div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">生成中...</p>
                </div>
              </div>
            )}
          </div>

          {/* URL显示 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              访问链接
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="flex-shrink-0"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="flex-1"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
              复制链接
            </Button>
            <Button
              onClick={shareUrl}
              className="flex-1"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              分享
            </Button>
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">使用说明</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 使用手机相机或微信扫一扫功能扫描二维码</li>
              <li>• 或者复制链接发送到手机浏览器打开</li>
              <li>• 支持离线使用，数据会在网络恢复后同步</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}