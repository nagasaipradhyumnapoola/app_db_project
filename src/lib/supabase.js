import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const teacherEmailDomain = (import.meta.env.VITE_TEACHER_EMAIL_DOMAIN || 'school.edu').replace(/^@/, '');

// Startup environment validation
let isConfigured = true;
let configError = null;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  isConfigured = false;
  configError = 'VITE_SUPABASE_URL is missing or invalid in .env';
} else if (!supabaseKey || supabaseKey.includes('your-supabase')) {
  isConfigured = false;
  configError = 'VITE_SUPABASE_PUBLISHABLE_KEY is missing or unconfigured in .env';
}

if (!isConfigured) {
  console.warn(`[Supabase Config Warning]: ${configError}`);
}

// Reusable Supabase client instance
// If not configured, instantiate with dummy URL so imports do not throw immediately
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = isConfigured;
export const supabaseConfigError = configError;

/**
 * Deterministically maps a teacher ID (e.g., "T001") to an Auth email alias (e.g., "t001@school.edu").
 * @param {string} teacherId
 * @returns {string}
 */
export function teacherIdToEmail(teacherId) {
  if (!teacherId) return '';
  const cleanId = teacherId.trim().toLowerCase();
  return `${cleanId}@${teacherEmailDomain}`;
}

/**
 * Extracts the teacher ID from an email alias.
 * @param {string} email
 * @returns {string}
 */
export function emailToTeacherId(email) {
  if (!email) return '';
  return email.split('@')[0].toUpperCase();
}

