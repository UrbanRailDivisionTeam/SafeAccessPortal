-- 安全作业申请系统数据库初始化脚本
-- Safe Access Application System Database Initialization Script

-- 创建数据库（如果不存在）
-- CREATE DATABASE safe_access_db;

-- 使用数据库
-- \c safe_access_db;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建公司表
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建人员表
CREATE TABLE IF NOT EXISTS personnel (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建安全作业申请表
CREATE TABLE IF NOT EXISTS safe_forms (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    
    -- 基本信息
    applicant_name VARCHAR(100) NOT NULL,
    applicant_id VARCHAR(20) NOT NULL,
    applicant_phone VARCHAR(20) NOT NULL,
    applicant_employee_number VARCHAR(50) NOT NULL,
    applicant_department VARCHAR(100) NOT NULL,
    
    -- 作业信息
    work_company VARCHAR(200) NOT NULL,
    work_project VARCHAR(200) NOT NULL,
    work_location VARCHAR(500) NOT NULL,
    work_type VARCHAR(50) DEFAULT 'quality_rework',
    work_content TEXT NOT NULL,
    work_start_time TIMESTAMP NOT NULL,
    work_end_time TIMESTAMP NOT NULL,
    
    -- 产品类作业特殊字段
    is_product_work BOOLEAN DEFAULT FALSE,
    product_name VARCHAR(200),
    product_specification VARCHAR(200),
    product_quantity VARCHAR(100),
    
    -- 质量返工相关字段
    work_basis VARCHAR(50), -- 作业依据：ncr, design_change, nonconformity
    basis_number VARCHAR(100), -- 依据编号
    
    -- 危险作业类型
    danger_types TEXT[], -- 存储为数组
    
    -- 通知人信息
    notifier_name VARCHAR(100) NOT NULL,
    notifier_employee_number VARCHAR(50) NOT NULL,
    notifier_department VARCHAR(100) NOT NULL,
    notifier_phone VARCHAR(20) NOT NULL,
    
    -- 系统字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建随行人员表
CREATE TABLE IF NOT EXISTS accompanying_persons (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES safe_forms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    id_number VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    employee_number VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建数据同步表：安全表单头表（用于其他软件同步）
CREATE TABLE IF NOT EXISTS public.safeformhead (
    id SERIAL PRIMARY KEY,
    "applicationNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "submitTime" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "workingHours" TEXT NOT NULL,
    "workLocation" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "isProductWork" BOOLEAN NOT NULL,
    "projectName" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "trackPosition" TEXT NOT NULL,
    "workContent" TEXT NOT NULL,
    "workBasis" TEXT NOT NULL,
    "basisNumber" TEXT NOT NULL,
    "dangerTypes" TEXT NOT NULL,
    "notifierName" TEXT NOT NULL,
    "notifierNumber" TEXT NOT NULL,
    "notifierDepartment" TEXT NOT NULL,
    "accompaningCount" INTEGER NOT NULL
);

-- 创建数据同步表：随行人员表（用于其他软件同步）
CREATE TABLE IF NOT EXISTS public.accompaningpersons (
    id SERIAL PRIMARY KEY,
    "formApplicationNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL
);

-- 为同步表创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "safeformhead_applicationNumber" ON public.safeformhead USING btree ("applicationNumber");

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_safe_forms_user_id ON safe_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_forms_application_number ON safe_forms(application_number);
CREATE INDEX IF NOT EXISTS idx_safe_forms_created_at ON safe_forms(created_at);
CREATE INDEX IF NOT EXISTS idx_accompanying_persons_form_id ON accompanying_persons(form_id);
CREATE INDEX IF NOT EXISTS idx_personnel_employee_number ON personnel(employee_number);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- 插入初始数据

-- 插入示例公司
INSERT INTO companies (name) VALUES 
    ('示例公司A'),
    ('示例公司B'),
    ('示例公司C')
ON CONFLICT (name) DO NOTHING;

-- 插入示例项目
INSERT INTO projects (name) VALUES 
    ('示例项目1'),
    ('示例项目2'),
    ('示例项目3')
ON CONFLICT (name) DO NOTHING;

-- 插入示例人员
INSERT INTO personnel (name, employee_number, department, position, phone) VALUES 
    ('张三', 'EMP001', '安全部', '安全员', '13800138001'),
    ('李四', 'EMP002', '工程部', '工程师', '13800138002'),
    ('王五', 'EMP003', '质量部', '质检员', '13800138003'),
    ('赵六', 'EMP004', '安全部', '安全主管', '13800138004'),
    ('钱七', 'EMP005', '工程部', '项目经理', '13800138005')
ON CONFLICT (employee_number) DO NOTHING;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 safe_forms 表创建更新时间触发器
DROP TRIGGER IF EXISTS update_safe_forms_updated_at ON safe_forms;
CREATE TRIGGER update_safe_forms_updated_at
    BEFORE UPDATE ON safe_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：带随行人员的完整申请信息
CREATE OR REPLACE VIEW safe_forms_with_persons AS
SELECT 
    sf.*,
    u.phone as user_phone,
    u.name as user_name,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ap.id,
                'name', ap.name,
                'id_number', ap.id_number,
                'phone', ap.phone,
                'employee_number', ap.employee_number,
                'department', ap.department
            )
        ) FILTER (WHERE ap.id IS NOT NULL),
        '[]'::json
    ) as accompanying_persons
FROM safe_forms sf
LEFT JOIN users u ON sf.user_id = u.id
LEFT JOIN accompanying_persons ap ON sf.id = ap.form_id
GROUP BY sf.id, u.phone, u.name;

-- 创建函数：生成申请编号
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'SA';
    date_part TEXT := to_char(CURRENT_DATE, 'YYYYMMDD');
    sequence_part TEXT;
    counter INTEGER;
BEGIN
    -- 获取当天的申请数量
    SELECT COUNT(*) + 1 INTO counter
    FROM safe_forms
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- 格式化序号为4位数字
    sequence_part := lpad(counter::TEXT, 4, '0');
    
    -- 返回完整的申请编号
    RETURN prefix || date_part || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：自动生成申请编号
CREATE OR REPLACE FUNCTION set_application_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
        NEW.application_number := generate_application_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_application_number ON safe_forms;
CREATE TRIGGER trigger_set_application_number
    BEFORE INSERT ON safe_forms
    FOR EACH ROW
    EXECUTE FUNCTION set_application_number();

-- 创建清理函数：删除过期数据（可选）
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除超过指定天数的申请记录
    DELETE FROM safe_forms 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 删除没有关联申请的用户（除了最近登录的）
    DELETE FROM users 
    WHERE id NOT IN (SELECT DISTINCT user_id FROM safe_forms WHERE user_id IS NOT NULL)
    AND last_login < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 授权（根据需要调整用户名）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_db_user;

-- 显示创建的表
\dt

-- 显示表结构
\d safe_forms
\d accompanying_persons
\d users
\d companies
\d projects
\d personnel

SELECT 'Database initialization completed successfully!' as status;