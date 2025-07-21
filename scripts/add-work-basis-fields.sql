-- 添加作业依据相关字段到 safe_forms 表
-- 这个脚本用于更新现有数据库，添加 work_basis 和 basis_number 字段

-- 添加 work_basis 字段（作业依据）
ALTER TABLE safe_forms 
ADD COLUMN IF NOT EXISTS work_basis VARCHAR(50);

-- 添加 basis_number 字段（依据编号）
ALTER TABLE safe_forms 
ADD COLUMN IF NOT EXISTS basis_number VARCHAR(100);

-- 添加字段注释
COMMENT ON COLUMN safe_forms.work_basis IS '作业依据：ncr, design_change, nonconformity';
COMMENT ON COLUMN safe_forms.basis_number IS '依据编号';

-- 显示更新结果
SELECT 'work_basis and basis_number fields added successfully!' as status;

-- 显示表结构确认
\d safe_forms