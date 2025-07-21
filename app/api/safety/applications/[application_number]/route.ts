import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// 删除单个申请记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: { application_number: string } }
) {
  try {
    const applicationNumber = params.application_number
    
    if (!applicationNumber) {
      return NextResponse.json(
        { error: '申请编号不能为空' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 先检查申请记录是否存在
      const checkResult = await client.query(
        'SELECT application_number FROM safe_forms WHERE application_number = $1',
        [applicationNumber]
      )

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: '申请记录不存在' },
          { status: 404 }
        )
      }

      // 删除随行人员记录
      await client.query(
        'DELETE FROM accompanying_persons WHERE form_id IN (SELECT id FROM safe_forms WHERE application_number = $1)',
        [applicationNumber]
      )

      // 删除申请记录
      const result = await client.query(
        'DELETE FROM safe_forms WHERE application_number = $1',
        [applicationNumber]
      )

      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        applicationNumber,
        message: '申请记录已删除'
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

// 获取单个申请记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: { application_number: string } }
) {
  try {
    const applicationNumber = params.application_number
    
    if (!applicationNumber) {
      return NextResponse.json(
        { error: '申请编号不能为空' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // 查询申请记录和随行人员信息
      const query = `
        SELECT 
          sf.*,
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
        WHERE sf.application_number = $1
        GROUP BY sf.id, sf.application_number, sf.user_id, sf.name, sf.id_number, 
                 sf.company_name, sf.phone_number, sf.start_date, sf.start_time,
                 sf.working_hours, sf.work_location, sf.work_type, sf.is_product_work,
                 sf.project_name, sf.vehicle_number, sf.track_position, sf.work_content,
                 sf.work_basis, sf.basis_number, sf.danger_types, sf.notifier_name,
                 sf.notifier_number, sf.notifier_department, sf.accompanying_count,
                 sf.submit_time
      `

      const result = await client.query(query, [applicationNumber])
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '申请记录不存在' },
          { status: 404 }
        )
      }

      const row = result.rows[0]
      
      // 转换数据格式
      const application = {
        applicationNumber: row.application_number,
        userId: row.user_id,
        name: row.name,
        idNumber: row.id_number,
        companyName: row.company_name,
        phoneNumber: row.phone_number,
        startDate: row.start_date,
        startTime: row.start_time,
        workingHours: row.working_hours,
        workLocation: row.work_location,
        workType: row.work_type,
        isProductWork: row.is_product_work,
        projectName: row.project_name,
        vehicleNumber: row.vehicle_number,
        trackPosition: row.track_position,
        workContent: row.work_content,
        workBasis: row.work_basis,
        basisNumber: row.basis_number,
        dangerTypes: row.danger_types || [],
        notifierName: row.notifier_name,
        notifierNumber: row.notifier_number,
        notifierDepartment: row.notifier_department,
        accompanyingCount: row.accompanying_count,
        accompanyingPersons: row.accompanying_persons || [],
        submitTime: row.submit_time
      }

      return NextResponse.json(application)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('获取申请记录详情失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}