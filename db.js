// db.js - Postgres client wrapper (CommonJS)
require('dotenv').config();
const postgres = require('postgres');

// Prefer DATABASE_URL environment variable. You can set this to your Supabase Postgres connection string
// or any other Postgres URI. Example format: postgres://user:pass@host:port/database
const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.warn('Warning: DATABASE_URL is not set. Postgres client will attempt to connect with an empty string.');
}

// Create the client. Adjust options (ssl, etc.) as needed for your environment.
const sql = postgres(connectionString);

module.exports = sql;
