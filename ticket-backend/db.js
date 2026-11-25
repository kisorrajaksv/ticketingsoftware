import pkg from 'pg';
const { Pool, types } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Force node-postgres to return DATE (OID 1082) columns as raw string 'YYYY-MM-DD'
// to avoid local/UTC timezone offset shifting dates back by one day.
if (types && types.setTypeParser) {
  types.setTypeParser(1082, (str) => str);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const isCloudDb = process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

let hasLoggedConnection = false;
pool.on('connect', () => {
  if (!hasLoggedConnection) {
    hasLoggedConnection = true;
    console.log('Connected to PostgreSQL Database!');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

export default pool;
