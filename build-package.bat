@echo off
echo === 开始打包安全作业申请系统 ===

set PROJECT_NAME=safe-access-portal
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
set ZIP_NAME=%PROJECT_NAME%_%timestamp%.zip
set TEMP_DIR=temp_build

echo [INFO] 创建临时目录...
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

echo [INFO] 复制项目文件...
xcopy app %TEMP_DIR%\app\ /e /i /q
xcopy components %TEMP_DIR%\components\ /e /i /q
xcopy lib %TEMP_DIR%\lib\ /e /i /q
xcopy public %TEMP_DIR%\public\ /e /i /q
xcopy scripts %TEMP_DIR%\scripts\ /e /i /q
xcopy styles %TEMP_DIR%\styles\ /e /i /q
xcopy types %TEMP_DIR%\types\ /e /i /q
copy docker-compose.yml %TEMP_DIR%\
copy Dockerfile %TEMP_DIR%\
copy next.config.js %TEMP_DIR%\
copy package.json %TEMP_DIR%\
copy package-lock.json %TEMP_DIR%\
copy tailwind.config.js %TEMP_DIR%\
copy tsconfig.json %TEMP_DIR%\
copy view-logs.js %TEMP_DIR%\
copy nginx.conf %TEMP_DIR%\
copy .env.example %TEMP_DIR%\
copy README.md %TEMP_DIR%\

echo [INFO] 创建日志目录...
mkdir %TEMP_DIR%\logs
echo # Log files will be generated here > %TEMP_DIR%\logs\README.md

echo [INFO] 创建部署说明文件...
(
echo # 安全作业申请系统部署说明
echo.
echo ## 快速部署
echo.
echo ### 1. 解压文件
echo ```bash
echo unzip safe-access-portal_*.zip
echo cd safe-access-portal/
echo ```
echo.
echo ### 2. 安装依赖
echo ```bash
echo npm install
echo ```
echo.
echo ### 3. 环境配置
echo ```bash
echo # 复制环境变量模板
echo cp .env.example .env.local
echo ```
echo.
echo ### 4. 构建和启动
echo ```bash
echo # 构建生产版本
echo npm run build
echo.
echo # 启动生产服务器
echo npm start
echo ```
echo.
echo ### 5. 访问应用
echo - 主应用：http://localhost:3000
echo - 管理后台：http://localhost:3000/admin
echo.
echo ### 6. 日志管理
echo ```bash
echo # 查看日志统计
echo node view-logs.js stats
echo.
echo # 查看业务日志
echo node view-logs.js business
echo.
echo # 查看安全日志
echo node view-logs.js security
echo.
echo # 查看最近100条日志
echo node view-logs.js recent 100
echo ```
echo.
echo ## Docker 部署（推荐）
echo.
echo ```bash
echo # 构建镜像
echo docker build -t safe-access-portal .
echo.
echo # 运行容器
echo docker run -p 3000:3000 safe-access-portal
echo.
echo # 或使用 Docker Compose
echo docker-compose up -d
echo ```
echo.
echo ## 系统要求
echo.
echo - Node.js 18.0 或更高版本
echo - PostgreSQL 12 或更高版本
echo - npm 或 yarn 包管理器
) > %TEMP_DIR%\DEPLOY.md

echo [INFO] 创建版本信息文件...
(
echo SafeAccessPortal
echo Build Time: %date% %time%
echo Version: v1.3.0
echo.
echo Features:
echo - Safety Application Form
echo - History Management
echo - Admin Dashboard
echo - CSV Import
echo - Offline Support
echo - Configuration System
echo - Complete Logging System
echo - Log Analysis Tools
echo.
echo Tech Stack:
echo - Next.js 14
echo - TypeScript
echo - PostgreSQL
echo - Tailwind CSS
) > %TEMP_DIR%\VERSION.txt

echo [INFO] 创建压缩包...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%' -DestinationPath '%ZIP_NAME%' -Force"

echo [INFO] 清理临时文件...
rmdir /s /q %TEMP_DIR%

echo [SUCCESS] 打包完成！
echo [INFO] 文件位置: %CD%\%ZIP_NAME%
dir %ZIP_NAME%

echo === 打包完成 ===
pause