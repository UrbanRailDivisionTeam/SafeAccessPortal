import { NextRequest, NextResponse } from 'next/server'

/**
 * 管理员认证API端点
 * 用于验证管理员密码，支持环境变量配置
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // 从环境变量获取管理员密码，如果没有设置则使用默认值
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123_change_this_in_production'
    
    // 验证密码
    if (password === adminPassword) {
      return NextResponse.json({
        success: true,
        message: '认证成功'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: '密码错误'
      }, { status: 401 })
    }
  } catch (error) {
    console.error('认证API错误:', error)
    return NextResponse.json({
      success: false,
      message: '服务器错误'
    }, { status: 500 })
  }
}