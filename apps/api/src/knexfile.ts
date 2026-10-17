import type { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.resolve(__dirname, '../command_center.sqlite');
const migrationsDir = path.resolve(__dirname, 'db/migrations');
const seedsDir = path.resolve(__dirname, 'db/seeds');

const config: Record<string, Knex.Config> = {
  development: {
    client: ENV.USE_IN_MEMORY_DB ? 'sqlite3' : 'pg',
    connection: ENV.USE_IN_MEMORY_DB
      ? { filename: sqlitePath }
      : ENV.DATABASE_URL,
    useNullAsDefault: true,
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
    },
    seeds: {
      directory: seedsDir,
      extension: 'ts',
    },
  },
  test: {
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
    },
    seeds: {
      directory: seedsDir,
      extension: 'ts',
    },
  },
  production: {
    client: 'pg',
    connection: ENV.DATABASE_URL,
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: './dist/db/migrations',
      extension: 'js',
    },
  },
};

export default config;
