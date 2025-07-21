import { NextRequest, NextResponse } from 'next/server'
import pool, { initDatabase } from '@/lib/db'
import { validatePhoneNumber } from '@/lib/utils'

// 确保数据库已初始化（只会执行一次）
initDatabase().catch(console.error)

export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const userId = params.user_id
    
    // 验证手机号格式
    if (!validatePhoneNumber(userId)) {
      return NextResponse.json(
        { error: '无效的手机号格式' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // 查询用户是否存在
      const userResult = await client.query(
        'SELECT * FROM users WHERE phone = $1',
        [userId]
      )

      if (userResult.rows.length > 0) {
        // 用户存在，返回用户信息
        const user = userResult.rows[0]
        return NextResponse.json({
          phoneNumber: user.phone,
          createdAt: user.created_at,
          lastLoginAt: user.last_login
        })
      } else {
        // 用户不存在，创建新用户
        const insertResult = await client.query(
          `INSERT INTO users (phone, created_at, last_login) 
           VALUES ($1, NOW(), NOW()) 
           RETURNING *`,
          [userId]
        )
        
        const newUser = insertResult.rows[0]
        return NextResponse.json({
          phoneNumber: newUser.phone,
          createdAt: newUser.created_at,
          lastLoginAt: newUser.last_login,
          isNewUser: true
        })
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('用户认证失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 更新用户最后登录时间
export async function PUT(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const userId = params.user_id
    
    // 验证手机号格式
    if (!validatePhoneNumber(userId)) {
      return NextResponse.json(
        { error: '无效的手机号格式' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // 更新最后登录时间
      const result = await client.query(
        'UPDATE users SET last_login = NOW() WHERE phone = $1 RETURNING *',
        [userId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '用户不存在' },
          { status: 404 }
        )
      }

      const user = result.rows[0]
      return NextResponse.json({
        phoneNumber: user.phone,
        createdAt: user.created_at,
        lastLoginAt: user.last_login
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('更新用户登录时间失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}