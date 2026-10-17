import knex, { type Knex } from 'knex';
import knexConfig from '../knexfile.js';
import { ENV } from './env.js';

const environment = ENV.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;

export const db: Knex = knex(config);

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('[Database] Connection check failed:', error);
    return false;
  }
}
