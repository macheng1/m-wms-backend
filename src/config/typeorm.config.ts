import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

// 根据环境加载对应的 .env 文件
const env = process.env.NODE_ENV || 'development';
const envPath = resolve(process.cwd(), `envs/.env.${env}`);
config({ path: envPath });

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'wms',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
