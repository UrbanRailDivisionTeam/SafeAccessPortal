import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// 批量导入人员信息
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择要导入的文件' },
        { status: 400 }
      )
    }
    
    // 检查文件类型
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: '只支持CSV格式文件' },
        { status: 400 }
      )
    }
    
    // 读取文件内容
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV文件格式不正确，至少需要包含标题行和一行数据' },
        { status: 400 }
      )
    }
    
    // 解析CSV头部
    const headers = lines[0].split(',').map(h => h.trim())
    
    // 验证必需的列
    const requiredColumns = ['工号', '职员姓名', '部门']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `CSV文件缺少必需的列: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }
    
    // 获取列索引
    const employeeNumberIndex = headers.indexOf('工号')
    const nameIndex = headers.indexOf('职员姓名')
    const departmentIndex = headers.indexOf('部门')
    const positionIndex = headers.indexOf('组室') // 可选列
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      const successRecords = []
      const errorRecords = []
      
      // 处理每一行数据
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim())
        
        if (values.length < headers.length) {
          errorRecords.push({
            line: i + 1,
            data: line,
            error: '数据列数不匹配'
          })
          continue
        }
        
        const employeeNumber = values[employeeNumberIndex]
        const name = values[nameIndex]
        const department = values[departmentIndex]
        const position = positionIndex >= 0 ? values[positionIndex] : null
        
        // 验证必填字段
        if (!employeeNumber || !name || !department) {
          errorRecords.push({
            line: i + 1,
            data: line,
            error: '工号、姓名或部门为空'
          })
          continue
        }
        
        try {
          // 检查工号是否已存在
          const existingResult = await client.query(
            'SELECT id FROM personnel WHERE employee_number = $1',
            [employeeNumber]
          )
          
          if (existingResult.rows.length > 0) {
            // 更新现有记录
            await client.query(
              'UPDATE personnel SET name = $1, department = $2, position = $3 WHERE employee_number = $4',
              [name, department, position, employeeNumber]
            )
            successRecords.push({
              employeeNumber,
              name,
              department,
              position,
              action: 'updated'
            })
          } else {
            // 插入新记录
            await client.query(
              'INSERT INTO personnel (name, employee_number, department, position) VALUES ($1, $2, $3, $4)',
              [name, employeeNumber, department, position]
            )
            successRecords.push({
              employeeNumber,
              name,
              department,
              position,
              action: 'created'
            })
          }
        } catch (dbError) {
          console.error('数据库操作失败:', dbError)
          errorRecords.push({
            line: i + 1,
            data: line,
            error: '数据库操作失败'
          })
        }
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: `导入完成，成功处理 ${successRecords.length} 条记录`,
        successCount: successRecords.length,
        errorCount: errorRecords.length,
        successRecords,
        errorRecords
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('导入人员信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}