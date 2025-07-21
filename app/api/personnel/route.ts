import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * 获取人员列表 - 支持搜索、分页和排序
 * 这个函数就像一个人事档案管理员，帮你快速找到需要的人员信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') // 搜索关键词（姓名或工号）
    const department = searchParams.get('department') // 部门筛选
    const page = parseInt(searchParams.get('page') || '1') // 页码，默认第1页
    const limit = parseInt(searchParams.get('limit') || '50') // 每页数量，默认50条
    const sort = searchParams.get('sort') || 'name' // 排序字段，默认按姓名
    const order = searchParams.get('order') || 'asc' // 排序方向，默认升序
    const suggestions = searchParams.get('suggestions') === 'true' // 是否只返回搜索建议
    
    const client = await pool.connect()
    
    try {
      // 如果是搜索建议模式，返回简化的结果
      if (suggestions && search) {
        const suggestionLimit = Math.min(limit, 10) // 建议最多10条
        const query = `
          SELECT id, name, employee_number, department 
          FROM personnel 
          WHERE (name ILIKE $1 OR employee_number ILIKE $1) 
          ORDER BY name 
          LIMIT $2
        `
        const result = await client.query(query, [`%${search}%`, suggestionLimit])
        return NextResponse.json({
          suggestions: result.rows,
          total: result.rows.length
        })
      }
      
      // 构建查询条件
      const conditions: string[] = []
      const params: any[] = []
      
      if (search) {
        conditions.push(`(name ILIKE $${params.length + 1} OR employee_number ILIKE $${params.length + 1})`)
        params.push(`%${search}%`)
      }
      
      if (department) {
        conditions.push(`department ILIKE $${params.length + 1}`)
        params.push(`%${department}%`)
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      
      // 验证排序字段，防止SQL注入
      const allowedSortFields = ['name', 'employee_number', 'department', 'id', 'created_at']
      const sortField = allowedSortFields.includes(sort) ? sort : 'name'
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      
      // 计算偏移量
      const offset = (page - 1) * limit
      
      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM personnel ${whereClause}`
      const countResult = await client.query(countQuery, params)
      const total = parseInt(countResult.rows[0].total)
      
      // 获取分页数据
      const dataQuery = `
        SELECT * FROM personnel 
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
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 删除人员
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
          `DELETE FROM personnel WHERE id IN (${placeholders}) RETURNING id`,
          idArray
        )
        
        return NextResponse.json({ 
          message: `成功删除 ${result.rows.length} 个人员`,
          deletedCount: result.rows.length 
        })
      } else {
        // 单个删除
        const personnelId = parseInt(id!)
        if (isNaN(personnelId)) {
          return NextResponse.json(
            { error: '无效的ID' },
            { status: 400 }
          )
        }
        
        const result = await client.query(
          'DELETE FROM personnel WHERE id = $1 RETURNING id',
          [personnelId]
        )
        
        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: '人员不存在' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({ message: '人员删除成功' })
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('删除人员失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 添加新人员
export async function POST(request: NextRequest) {
  try {
    const { name, employeeNumber, department } = await request.json()
    
    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '姓名不能为空' },
        { status: 400 }
      )
    }
    
    if (!employeeNumber || typeof employeeNumber !== 'string' || employeeNumber.trim().length === 0) {
      return NextResponse.json(
        { error: '工号不能为空' },
        { status: 400 }
      )
    }
    
    if (!department || typeof department !== 'string' || department.trim().length === 0) {
      return NextResponse.json(
        { error: '部门不能为空' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // 检查工号是否已存在
      const existingResult = await client.query(
        'SELECT id FROM personnel WHERE employee_number = $1',
        [employeeNumber.trim()]
      )
      
      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { error: '工号已存在' },
          { status: 409 }
        )
      }
      
      // 插入新人员
      const result = await client.query(
        'INSERT INTO personnel (name, employee_number, department) VALUES ($1, $2, $3) RETURNING *',
        [name.trim(), employeeNumber.trim(), department.trim()]
      )
      
      return NextResponse.json(result.rows[0], { status: 201 })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('添加人员失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}