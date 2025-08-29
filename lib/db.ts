import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'safe_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // 设置字符编码为UTF-8，确保中文字符正确显示
  options: '-c client_encoding=UTF8'
});

export default pool;

// 数据库初始化状态
let isInitialized = false;

// 数据库初始化脚本
export const initDatabase = async () => {
  if (isInitialized) {
    // console.log('Database already initialized');
    return;
  }
  
  // console.log('Starting database initialization...');
  const client = await pool.connect();
  try {
    // 创建安全作业申请表
    await client.query(`
      CREATE TABLE IF NOT EXISTS safe_forms (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        id_number VARCHAR(18) NOT NULL,
        company_name VARCHAR(200) NOT NULL,
        phone_number VARCHAR(11) NOT NULL,
        submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        start_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        working_hours VARCHAR(20) NOT NULL,
        work_location VARCHAR(100) NOT NULL,
        work_type VARCHAR(50) NOT NULL,
        is_product_work BOOLEAN DEFAULT FALSE,
        project_name VARCHAR(200),
        vehicle_number VARCHAR(50),
        track_position VARCHAR(50),
        work_content TEXT NOT NULL,
        work_basis VARCHAR(100),
        basis_number VARCHAR(100),
        danger_types TEXT[],
        notifier_name VARCHAR(50) NOT NULL,
        notifier_number VARCHAR(12) NOT NULL,
        notifier_department VARCHAR(100) NOT NULL,
        accompanying_count INTEGER DEFAULT 0,
        user_id VARCHAR(11)
      )
    `);

    // 创建随行人员表
    await client.query(`
      CREATE TABLE IF NOT EXISTS accompanying_persons (
        id SERIAL PRIMARY KEY,
        form_application_number VARCHAR(100) REFERENCES safe_forms(application_number),
        name VARCHAR(50) NOT NULL,
        id_number VARCHAR(18) NOT NULL,
        phone_number VARCHAR(11) NOT NULL
      )
    `);

    // 创建公司名称库
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) UNIQUE NOT NULL
      )
    `);

    // 创建项目库
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) UNIQUE NOT NULL
      )
    `);

    // 创建人员库
    await client.query(`
      CREATE TABLE IF NOT EXISTS personnel (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        employee_number VARCHAR(12) UNIQUE NOT NULL,
        department VARCHAR(100) NOT NULL
      )
    `);

    // 创建用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 插入一些初始数据
    await client.query(`
      INSERT INTO companies (name) VALUES 
      ('示例公司A'), ('示例公司B'), ('示例公司C')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      INSERT INTO projects (name) VALUES 
      ('项目Alpha'), ('项目Beta'), ('项目Gamma')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      INSERT INTO personnel (name, employee_number, department) VALUES 
      ('张三', '123456789012', '安全部'),
      ('李四', '123456789013', '技术部'),
      ('王五', '123456789014', '运营部')
      ON CONFLICT (employee_number) DO NOTHING
    `);

    // console.log('数据库初始化完成');
    isInitialized = true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error; // 重新抛出错误以便调试
  } finally {
    client.release();
  }
};