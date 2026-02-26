import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'adminpassword',
  database: process.env.DB_NAME || 'steevodb',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
  maxQueryExecutionTime: 1000,
  connectTimeoutMS: 5000,
});
