-- 添加 work_type 字段到 safe_forms 表
ALTER TABLE safe_forms ADD COLUMN IF NOT EXISTS work_type VARCHAR(50) DEFAULT 'quality_rework';

-- 添加字段注释
COMMENT ON COLUMN safe_forms.work_type IS '作业类型';

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'safe_forms' AND column_name = 'work_type';