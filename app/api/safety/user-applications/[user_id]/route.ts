import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { validatePhoneNumber, getWorkLocationLabel, getWorkContentLabel, getWorkTypeLabel, getDangerTypesLabel } from '@/lib/utils'
import { log } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `user_apps_${Date.now()}`;
  const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const userId = params.user_id;
  
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset') || '0'
    
    // 记录业务日志：用户查看申请历史
    log.business('用户查看申请历史', {
      module: 'USER_APPLICATIONS',
      action: 'VIEW_HISTORY',
      requestId,
      userId,
      ip: userIp,
      userAgent,
      limit,
      offset
    });
    
    // 验证手机号格式
    if (!validatePhoneNumber(userId)) {
      return NextResponse.json(
        { error: '无效的手机号格式' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // 构建查询语句
      let query = `
        SELECT 
          sf.id, sf.application_number, sf.user_id, sf.applicant_name as name, sf.applicant_id as id_number,
          sf.work_company as company_name, sf.applicant_phone as phone_number, sf.created_at as submit_time, 
          sf.work_start_time as start_date, sf.work_end_time, sf.work_location, sf.work_type, sf.work_content, 
          sf.is_product_work, sf.work_project as project_name, sf.product_name as vehicle_number, 
          sf.product_specification as track_position, sf.product_quantity, sf.work_basis, sf.basis_number,
          sf.danger_types, sf.notifier_name, sf.notifier_employee_number as notifier_number, 
          sf.notifier_department, sf.notifier_phone, sf.applicant_employee_number, sf.applicant_department,
          COALESCE(
            json_agg(
              json_build_object(
                'name', ap.name,
                'idNumber', ap.id_number,
                'phoneNumber', ap.phone
              )
            ) FILTER (WHERE ap.name IS NOT NULL),
            '[]'::json
          ) as accompanying_persons
        FROM safe_forms sf
        LEFT JOIN accompanying_persons ap ON sf.id = ap.form_id
        LEFT JOIN users u ON sf.user_id = u.id
        WHERE u.phone = $1
        GROUP BY sf.id, sf.application_number, sf.applicant_name, sf.applicant_id, 
                  sf.work_company, sf.applicant_phone, sf.created_at, sf.work_start_time, sf.work_end_time,
                  sf.work_location, sf.work_type, sf.work_content, sf.is_product_work,
                  sf.work_project, sf.product_name, sf.product_specification, sf.product_quantity,
                  sf.work_basis, sf.basis_number, sf.danger_types, sf.notifier_name,
                  sf.notifier_employee_number, sf.notifier_department, sf.notifier_phone,
                  sf.applicant_employee_number, sf.applicant_department, sf.user_id
        ORDER BY sf.created_at DESC
      `
      
      const queryParams = [userId]
      
      if (limit) {
        query += ` LIMIT $${queryParams.length + 1}`
        queryParams.push(limit)
      }
      
      if (offset !== '0') {
        query += ` OFFSET $${queryParams.length + 1}`
        queryParams.push(offset)
      }

      // console.log('查询参数:', queryParams)
    // console.log('SQL查询:', query)
    const result = await client.query(query, queryParams)
    // console.log('查询结果行数:', result.rows.length)
      
      // 转换数据格式
      const applications = result.rows.map(row => {
        const startDate = new Date(row.start_date)
        const endDate = new Date(row.work_end_time)
        const workingHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
        
        // 使用数据库中的作业类型
        const workType = row.work_type || 'quality_rework'
        
        return {
          applicationNumber: row.application_number,
          userId: row.user_id,
          name: row.name,
          idNumber: row.id_number,
          companyName: row.company_name,
          phoneNumber: row.phone_number,
          startDate: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          workingHours: workingHours.toString(),
          workLocation: getWorkLocationLabel(row.work_location), // 转换为显示标签
          workType: getWorkTypeLabel(workType), // 转换为显示标签
          isProductWork: row.is_product_work,
          projectName: row.project_name,
          vehicleNumber: row.vehicle_number,
          trackPosition: row.track_position,
          workContent: getWorkContentLabel(workType, row.work_content), // 转换为显示标签
          workBasis: row.work_basis || '', // 从数据库读取作业依据
          basisNumber: row.basis_number || '', // 从数据库读取依据编号
          dangerTypes: getDangerTypesLabel(row.danger_types || []), // 转换为显示标签
          notifierName: row.notifier_name,
          notifierNumber: row.notifier_number,
          notifierDepartment: row.notifier_department,
          accompanyingCount: (row.accompanying_persons || []).length,
          accompanyingPersons: row.accompanying_persons || [],
          submitTime: new Date(row.submit_time)
        }
      })

      // 记录成功日志
      const duration = Date.now() - startTime;
      log.business('用户申请历史查看成功', {
        module: 'USER_APPLICATIONS',
        action: 'VIEW_HISTORY_SUCCESS',
        requestId,
        userId,
        ip: userIp,
        userAgent,
        recordCount: applications.length,
        duration
      });
      
      return NextResponse.json(applications)
    } finally {
      client.release()
    }
  } catch (error) {
    // 记录错误日志
    log.error('用户申请历史查看失败', {
      module: 'USER_APPLICATIONS',
      action: 'VIEW_HISTORY_ERROR',
      requestId,
      userId,
      ip: userIp,
      userAgent,
      duration: Date.now() - startTime
    }, error as Error);
    
    console.error('获取申请记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 删除用户所有申请记录
export async function DELETE(
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
      await client.query('BEGIN')

      // 删除随行人员记录
      await client.query(`
        DELETE FROM accompanying_persons 
        WHERE form_id IN (
          SELECT sf.id FROM safe_forms sf 
          LEFT JOIN users u ON sf.user_id = u.id 
          WHERE u.phone = $1
        )
      `, [userId])

      // 删除申请记录
      const result = await client.query(`
        DELETE FROM safe_forms 
        WHERE user_id IN (
          SELECT id FROM users WHERE phone = $1
        )
      `, [userId])

      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        deletedCount: result.rowCount,
        message: '所有申请记录已删除'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('删除申请记录失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}