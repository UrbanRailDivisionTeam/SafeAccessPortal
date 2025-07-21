import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { SafeForm } from '@/types'
import { OptionConverter, getOptionLabel, DANGER_TYPES } from '@/lib/config'
import { validateForm } from '@/lib/utils'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `submit_${Date.now()}`;
  const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  let formData: SafeForm | null = null;
  
  try {
    formData = await request.json()
    
    if (!formData) {
      throw new Error('Invalid form data');
    }
    
    // 记录业务日志：用户提交安全申请
    log.business('用户提交安全作业申请', {
      module: 'SAFETY_SUBMIT',
      action: 'SUBMIT_APPLICATION',
      requestId,
      userId: formData.userId || 'anonymous',
      ip: userIp,
      userAgent,
      workType: formData.workType,
      workLocation: formData.workLocation,
      phoneNumber: formData.phoneNumber
    });
    
    // 调试日志
    // console.log('表单数据:', {
    //     startDate: formData.startDate,
    //     startTime: formData.startTime,
    //     userId: formData.userId,
    //     dangerTypes: formData.dangerTypes,
    //     dangerTypesType: typeof formData.dangerTypes,
    //     dangerTypesIsArray: Array.isArray(formData.dangerTypes)
    //   })

    // 表单验证
    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      // 记录表单验证失败日志
      log.warn('表单验证失败', {
        module: 'SAFETY_SUBMIT',
        action: 'VALIDATION_FAILED',
        requestId,
        userId: formData.userId || 'anonymous',
        ip: userIp,
        userAgent,
        validationErrors: Object.keys(validationErrors)
      });
      
      // 生成更友好的错误提示
      const errorMessages = Object.values(validationErrors)
      const mainError = errorMessages.length === 1 
        ? errorMessages[0] 
        : `发现 ${errorMessages.length} 个问题需要修正`
      
      return NextResponse.json(
        { 
          error: mainError,
          details: validationErrors,
          message: '请检查并修正表单中的错误信息后重新提交'
        },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 查找或创建用户
      let userId: number
      const userQuery = 'SELECT id FROM users WHERE phone = $1'
      const userResult = await client.query(userQuery, [formData.phoneNumber])
      
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id
      } else {
        // 创建新用户
        const insertUserQuery = 'INSERT INTO users (phone, name) VALUES ($1, $2) RETURNING id'
        const newUserResult = await client.query(insertUserQuery, [formData.phoneNumber, formData.name])
        userId = newUserResult.rows[0].id
      }

      // 插入主表单数据
      const insertFormQuery = `
        INSERT INTO safe_forms (
          application_number, applicant_name, applicant_id, applicant_phone, 
          applicant_employee_number, applicant_department, work_company, work_project, 
          work_location, work_type, work_content, work_start_time, work_end_time, is_product_work, 
          product_name, product_specification, work_basis, basis_number, danger_types, 
          notifier_name, notifier_employee_number, notifier_department, notifier_phone, user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
      `
      
      // 构建开始和结束时间
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime === 'morning' ? '08:00:00' : formData.startTime === 'afternoon' ? '14:00:00' : '20:00:00'}`)
      const endDateTime = new Date(startDateTime)
      // 根据工作时长计算结束时间
      const hoursToAdd = formData.workingHours === 'half_day' ? 4 : formData.workingHours === 'one_day' ? 8 : 4
      endDateTime.setHours(endDateTime.getHours() + hoursToAdd)
      
      const formValues = [
        formData.applicationNumber, // application_number
        formData.name, // applicant_name
        formData.idNumber, // applicant_id
        formData.phoneNumber, // applicant_phone
        '', // applicant_employee_number - 暂时使用空值
        '', // applicant_department - 暂时使用空值
        formData.companyName, // work_company
        formData.projectName || '', // work_project
        formData.workLocation, // work_location
        formData.workType || 'quality_rework', // work_type
        formData.workContent, // work_content
        startDateTime, // work_start_time
        endDateTime, // work_end_time
        formData.isProductWork || false, // is_product_work
        formData.vehicleNumber || null, // product_name
        formData.trackPosition || null, // product_specification
        formData.workBasis || null, // work_basis
        formData.basisNumber || null, // basis_number
        formData.dangerTypes && formData.dangerTypes.length > 0 ? 
          (Array.isArray(formData.dangerTypes) ? formData.dangerTypes : [formData.dangerTypes]) : null, // danger_types
        formData.notifierName || formData.name, // notifier_name
        formData.notifierNumber || '', // notifier_employee_number
        formData.notifierDepartment || '', // notifier_department
        formData.phoneNumber, // notifier_phone - 使用申请人电话作为通知人电话
        userId // user_id
      ]

      const formResult = await client.query(insertFormQuery + ' RETURNING id', formValues)
      const formId = formResult.rows[0].id

      // 插入随行人员数据
      if (formData.accompanyingPersons && formData.accompanyingPersons.length > 0) {
        const insertPersonQuery = `
          INSERT INTO accompanying_persons (
            form_id, name, id_number, phone, employee_number, department
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `
        
        for (const person of formData.accompanyingPersons) {
          await client.query(insertPersonQuery, [
            formId,
            person.name,
            person.idNumber,
            person.phoneNumber,
            '', // employee_number - 临时使用空值
            ''  // department - 临时使用空值
          ])
        }
      }

      // 数据同步：插入到 safeformhead 表（用于其他软件同步）
      const syncFormHeadQuery = `
        INSERT INTO public.safeformhead (
          "applicationNumber", "name", "idNumber", "companyName", "phoneNumber",
          "submitTime", "startDate", "startTime", "workingHours", "workLocation",
          "workType", "isProductWork", "projectName", "vehicleNumber", "trackPosition",
          "workContent", "workBasis", "basisNumber", "dangerTypes", "notifierName",
          "notifierNumber", "notifierDepartment", "accompaningCount"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `
      
      // 准备同步数据 - 将英文value转换为中文label
      const currentTime = new Date()
      const submitTimeStr = currentTime.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      // 转换危险作业类型：从英文数组转为中文字符串，用英文逗号分隔，前面加逗号
      const dangerTypesArray = formData.dangerTypes || []
      const dangerTypesChineseStr = dangerTypesArray.length > 0 
        ? ',' + dangerTypesArray.map(value => getOptionLabel(DANGER_TYPES, value)).join(',')
        : ',无'
      
      // 转换工作时长显示
      const workingHoursMap: Record<string, string> = {
        'half_day': '半天',
        'one_day': '一天',
        'one_half_day': '一天半',
        'two_days': '两天',
        'two_half_days': '两天半',
        'three_days': '三天'
      }
      const workingHoursDisplay = workingHoursMap[formData.workingHours || 'half_day'] || formData.workingHours || '半天'
      
      // 转换开始时间显示
      const startTimeMap: Record<string, string> = {
        'morning': '上午',
        'afternoon': '下午'
      }
      const startTimeDisplay = startTimeMap[formData.startTime || 'morning'] || formData.startTime || '上午'
      
      const syncFormHeadValues = [
        formData.applicationNumber, // applicationNumber
        formData.name, // name
        formData.idNumber, // idNumber
        formData.companyName, // companyName
        formData.phoneNumber, // phoneNumber
        submitTimeStr, // submitTime - 格式化为中文时间字符串
        formData.startDate, // startDate
        startTimeDisplay, // startTime - 转换为中文
        workingHoursDisplay, // workingHours - 转换为中文
        OptionConverter.workLocation.toLabel(formData.workLocation), // workLocation - 转换为中文
        OptionConverter.workType.toLabel(formData.workType || 'quality_rework'), // workType - 转换为中文
        formData.isProductWork || false, // isProductWork
        formData.projectName || '', // projectName
        formData.vehicleNumber || '', // vehicleNumber
        formData.trackPosition || '', // trackPosition
        OptionConverter.workContent.toLabel(formData.workType || 'quality_rework', formData.workContent || ''), // workContent - 转换为中文
        OptionConverter.workBasis.toLabel(formData.workBasis || ''), // workBasis - 转换为中文
        formData.basisNumber || '', // basisNumber
        dangerTypesChineseStr, // dangerTypes - 转换为中文字符串
        formData.notifierName || formData.name, // notifierName
        formData.notifierNumber || '', // notifierNumber
        formData.notifierDepartment || '', // notifierDepartment
        formData.accompanyingPersons ? formData.accompanyingPersons.length : 0 // accompaningCount
      ]
      
      await client.query(syncFormHeadQuery, syncFormHeadValues)
      
      // 数据同步：插入到 accompaningpersons 表（用于其他软件同步）
      if (formData.accompanyingPersons && formData.accompanyingPersons.length > 0) {
        const syncPersonQuery = `
          INSERT INTO public.accompaningpersons (
            "formApplicationNumber", "name", "idNumber", "phoneNumber"
          ) VALUES ($1, $2, $3, $4)
        `
        
        for (const person of formData.accompanyingPersons) {
          await client.query(syncPersonQuery, [
            formData.applicationNumber, // formApplicationNumber
            person.name, // name
            person.idNumber, // idNumber
            person.phoneNumber // phoneNumber
          ])
        }
      }

      await client.query('COMMIT')
      
      // 记录成功提交日志
      const duration = Date.now() - startTime;
      log.business('安全作业申请提交成功', {
        module: 'SAFETY_SUBMIT',
        action: 'SUBMIT_SUCCESS',
        requestId,
        userId: formData.userId || 'anonymous',
        ip: userIp,
        userAgent,
        applicationNumber: formData.applicationNumber,
        workType: formData.workType,
        workLocation: formData.workLocation,
        duration
      });
      
      // 记录性能日志
      log.performance('申请提交处理时间', {
        module: 'SAFETY_SUBMIT',
        action: 'SUBMIT_PERFORMANCE',
        requestId,
        duration,
        applicationNumber: formData.applicationNumber
      });
      
      return NextResponse.json({
        success: true,
        applicationNumber: formData.applicationNumber,
        message: '申请提交成功'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    // 记录错误日志
    log.error('安全作业申请提交失败', {
      module: 'SAFETY_SUBMIT',
      action: 'SUBMIT_ERROR',
      requestId,
      userId: formData?.userId || 'anonymous',
      ip: userIp,
      userAgent,
      duration: Date.now() - startTime
    }, error as Error);
    
    console.error('提交申请失败:', error)
    
    // 根据错误类型返回更具体的错误信息
    let errorMessage = '提交失败，请稍后重试'
    let errorDetails = ''
    
    if (error instanceof Error) {
      // 数据库连接错误
      if (error.message.includes('connect') || error.message.includes('connection')) {
        errorMessage = '数据库连接失败，请稍后重试'
        errorDetails = '系统正在维护中，请联系管理员'
      }
      // 数据格式错误
      else if (error.message.includes('invalid') || error.message.includes('format')) {
        errorMessage = '数据格式错误，请检查输入信息'
        errorDetails = '请确保所有必填项都已正确填写'
      }
      // 重复提交错误
      else if (error.message.includes('duplicate') || error.message.includes('unique')) {
        errorMessage = '申请编号已存在，请勿重复提交'
        errorDetails = '如需修改申请，请联系管理员'
      }
      // 权限错误
      else if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage = '权限不足，无法提交申请'
        errorDetails = '请联系管理员获取相应权限'
      }
      // 其他数据库错误
      else if (error.message.includes('database') || error.message.includes('query')) {
        errorMessage = '数据保存失败，请重试'
        errorDetails = '如问题持续存在，请联系技术支持'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        support: '如需帮助，请联系系统管理员'
      },
      { status: 500 }
    )
  }
}