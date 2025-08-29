import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * 获取公司列表 - 支持搜索、分页和排序
 * 这个函数就像一个智能的图书管理员，可以根据你的要求快速找到你需要的公司信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') // 搜索关键词
    const page = parseInt(searchParams.get('page') || '1') // 页码，默认第1页
    const limit = parseInt(searchParams.get('limit') || '50') // 每页数量，默认50条
    const sort = searchParams.get('sort') || 'name' // 排序字段，默认按名称
    const order = searchParams.get('order') || 'asc' // 排序方向，默认升序
    const suggestions = searchParams.get('suggestions') === 'true' // 是否只返回搜索建议
    
    const client = await pool.connect()
    
    try {
      // 如果是搜索建议模式，返回简化的结果
      if (suggestions && search) {
        const suggestionLimit = Math.min(limit, 10) // 建议最多10条
        const query = 'SELECT id, name FROM companies WHERE name ILIKE $1 ORDER BY name LIMIT $2'
        const result = await client.query(query, [`%${search}%`, suggestionLimit])
        return NextResponse.json({
          suggestions: result.rows,
          total: result.rows.length
        }, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        })
      }
      
      // 构建查询条件
      let whereClause = ''
      const params: any[] = []
      
      if (search) {
        whereClause = 'WHERE name ILIKE $1'
        params.push(`%${search}%`)
      }
      
      // 验证排序字段，防止SQL注入
      const allowedSortFields = ['name', 'id', 'created_at']
      const sortField = allowedSortFields.includes(sort) ? sort : 'name'
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      
      // 计算偏移量
      const offset = (page - 1) * limit
      
      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM companies ${whereClause}`
      const countResult = await client.query(countQuery, params)
      const total = parseInt(countResult.rows[0].total)
      
      // 获取分页数据
      const dataQuery = `
        SELECT * FROM companies 
        ${whereClause} 
        ORDER BY ${sortField} ${sortOrder} 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `
      params.push(limit, offset)
      
      const result = await client.query(dataQuery, params)
      
      // 返回分页信息和数据
      return NextResponse.json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('获取公司列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 删除公司
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ids = searchParams.get('ids')
    
    if (!id && !ids) {
      return NextResponse.json(
        { error: '缺少ID参数' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      if (ids) {
        // 批量删除
        const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        if (idArray.length === 0) {
          return NextResponse.json(
            { error: '无效的ID列表' },
            { status: 400 }
          )
        }
        
        const placeholders = idArray.map((_, index) => `$${index + 1}`).join(',')
        const result = await client.query(
          `DELETE FROM companies WHERE id IN (${placeholders}) RETURNING id`,
          idArray
        )
        
        return NextResponse.json({ 
          message: `成功删除 ${result.rows.length} 个公司`,
          deletedCount: result.rows.length 
        })
      } else {
        // 单个删除
        const companyId = parseInt(id!)
        if (isNaN(companyId)) {
          return NextResponse.json(
            { error: '无效的ID' },
            { status: 400 }
          )
        }
        
        const result = await client.query(
          'DELETE FROM companies WHERE id = $1 RETURNING id',
          [companyId]
        )
        
        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: '公司不存在' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({ message: '公司删除成功' })
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('删除公司失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 添加新公司
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '公司名称不能为空' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // 检查是否已存在
      const existingResult = await client.query(
        'SELECT id FROM companies WHERE name = $1',
        [name.trim()]
      )
      
      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { error: '公司名称已存在' },
          { status: 409 }
        )
      }
      
      // 插入新公司
      const result = await client.query(
        'INSERT INTO companies (name) VALUES ($1) RETURNING *',
        [name.trim()]
      )
      
      return NextResponse.json(result.rows[0], { status: 201 })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('添加公司失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}