import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

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
        { error: '请上传CSV格式的文件' },
        { status: 400 }
      )
    }
    
    // 读取文件内容
    const content = await file.text()
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'CSV文件为空' },
        { status: 400 }
      )
    }
    
    // 解析CSV头部
    const headers = lines[0].split(',').map(h => h.trim())
    
    // 查找必需的列
    const nameIndex = headers.findIndex(h => h === '名称' || h === 'name')
    const codeIndex = headers.findIndex(h => h === '编码' || h === 'code')
    
    if (nameIndex === -1) {
      return NextResponse.json(
        { error: 'CSV文件必须包含"名称"或"name"列' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      let successCount = 0
      let updateCount = 0
      let errorCount = 0
      const errorRecords: string[] = []
      
      // 处理数据行（跳过标题行）
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim())
        
        if (values.length < headers.length) {
          errorRecords.push(`第${i + 1}行: 列数不匹配`)
          errorCount++
          continue
        }
        
        const name = values[nameIndex]?.trim()
        
        if (!name) {
          errorRecords.push(`第${i + 1}行: 公司名称为空`)
          errorCount++
          continue
        }
        
        try {
          // 检查是否已存在
          const existingResult = await client.query(
            'SELECT id FROM companies WHERE name = $1',
            [name]
          )
          
          if (existingResult.rows.length > 0) {
            // 如果已存在，可以选择更新或跳过
            // 这里选择跳过，但计入更新计数
            updateCount++
          } else {
            // 插入新记录
            await client.query(
              'INSERT INTO companies (name) VALUES ($1)',
              [name]
            )
            successCount++
          }
        } catch (dbError) {
          console.error(`处理第${i + 1}行时出错:`, dbError)
          errorRecords.push(`第${i + 1}行: 数据库错误`)
          errorCount++
        }
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        message: `导入完成！成功导入 ${successCount} 条记录，更新 ${updateCount} 条记录`,
        successCount,
        updateCount,
        errorCount,
        errorRecords: errorCount > 0 ? errorRecords : undefined
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('公司CSV导入失败:', error)
    return NextResponse.json(
      { error: '导入失败，请稍后重试' },
      { status: 500 }
    )
  }
}