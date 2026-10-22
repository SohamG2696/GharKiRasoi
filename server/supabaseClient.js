// server/supabaseClient.js - Centralized Supabase Client & Cloud Mode Configuration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * Sanitizes the Supabase URL by extracting the clean origin.
 * Prevents URL doubling when users provide REST endpoints like "https://<ref>.supabase.co/rest/v1/".
 */
function sanitizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.origin;
  } catch (err) {
    return rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = sanitizeSupabaseUrl(rawUrl);

// Public / Publishable / Anon Key
const supabaseAnonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  '';

// Server-side Secret / Service Role Key
const supabaseServiceRoleKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

// Cloud Mode determination:
// If DATABASE_MODE is explicitly specified, respect it.
// Otherwise, cloud mode is active if both URL and a key are configured.
const explicitMode = (process.env.DATABASE_MODE || '').toLowerCase();
const isConfigured = Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));

let databaseMode = 'local';
if (explicitMode === 'cloud') {
  if (!isConfigured) {
    throw new Error(
      'DATABASE_MODE is set to "cloud", but SUPABASE_URL or Supabase API keys are missing. ' +
      'Refusing to start in cloud mode without valid database credentials.'
    );
  }
  databaseMode = 'cloud';
} else if (explicitMode === 'local') {
  databaseMode = 'local';
} else if (isConfigured) {
  databaseMode = 'cloud';
}

// Administrative Supabase Client (uses service role key if available for trusted backend operations)
let supabaseAdmin = null;
let supabasePublic = null;

if (isConfigured) {
  const masterKey = supabaseServiceRoleKey || supabaseAnonKey;
  supabaseAdmin = createClient(supabaseUrl, masterKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  if (supabaseAnonKey) {
    supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } else {
    supabasePublic = supabaseAdmin;
  }
}

/**
 * Helper to ensure cloud mode does not silently fall back to local store.
 * When in cloud mode, any query failure must throw or return an error rather than falling back.
 */
function assertCloudModeAllowed(operationName = 'operation') {
  if (databaseMode === 'cloud' && !supabaseAdmin) {
    throw new Error(
      `[DATABASE_MODE=cloud] Cannot execute ${operationName}: Supabase client is not initialized. Silent fallback to local storage is disabled.`
    );
  }
}

module.exports = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseAdmin,
  supabasePublic,
  databaseMode,
  isCloudMode: () => databaseMode === 'cloud',
  assertCloudModeAllowed
};
