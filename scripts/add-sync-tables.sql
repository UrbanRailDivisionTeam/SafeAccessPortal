-- 数据同步表迁移脚本
-- 用于为现有数据库添加数据同步功能的两个新表

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

-- 添加注释说明表的用途
COMMENT ON TABLE public.safeformhead IS '安全表单头表 - 用于其他软件数据同步和抽取';
COMMENT ON TABLE public.accompaningpersons IS '随行人员表 - 用于其他软件数据同步和抽取';

-- 显示创建结果
SELECT 'Sync tables created successfully!' as status;

-- 显示表结构
\d public.safeformhead
\d public.accompaningpersons