import './globals.css'
import { Providers } from './providers'
import { Toaster, ToastProvider } from '@/components/ui/toaster'
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import type { Metadata, Viewport } from 'next'

// 元数据配置 - 定义页面的基本信息
export const metadata: Metadata = {
  title: '安全作业申请系统',
  description: '专为安全作业申请的提交和管理设计的Web应用程序',
  keywords: ['安全作业', '申请系统', '工作安全', '作业管理'],
  authors: [{ name: '安全作业申请系统' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

// 视口配置 - 控制页面在移动设备上的显示方式
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="安全作业申请" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans">
        <ToastProvider>
          <Providers>
            <div className="min-h-screen flex flex-col">
              <OfflineIndicator />
              <main className="flex-1">
                {children}
              </main>
            <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center text-sm text-gray-500">
                  <p>&copy; 2025 城轨事业部精益信息化组</p>
                  <p className="mt-1">为了您的安全，请如实填写所有信息</p>
                </div>
              </div>
            </footer>
          </div>
            <Toaster />
          </Providers>
        </ToastProvider>
      </body>
    </html>
  )
}