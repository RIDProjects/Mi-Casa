import { DataSource } from 'typeorm';
import 'dotenv/config';

// TypeORM CLI config — used only by `npm run migration:*` scripts, never
// imported by the running Nest app (app.module.ts configures its own
// TypeOrmModule.forRoot with the same connection params).
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'finanzas_db',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
