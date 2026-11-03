import { createClient } from '@supabase/supabase-js';

// Fallback values ensure production deployments (like Vercel) work out-of-the-box
const DEFAULT_SUPABASE_URL = 'https://hezgyellphwkzgslkbls.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_O22RLKYhuNpZ6tOmRfIW2g_0pvg7ATk';
const DEFAULT_DOMAIN = 'school.edu';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
export const teacherEmailDomain = (import.meta.env.VITE_TEACHER_EMAIL_DOMAIN || DEFAULT_DOMAIN).replace(/^@/, '');

// Startup environment validation
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabaseConfigError = isSupabaseConfigured ? null : 'Missing Supabase credentials';

// Reusable Supabase client instance
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Deterministically maps a teacher ID (e.g., "T001") to an Auth email alias (e.g., "t001@school.edu").
 * @param {string} teacherId
 * @returns {string}
 */
export function teacherIdToEmail(teacherId) {
  if (!teacherId) return '';
  const clean = teacherId.trim().toLowerCase();
  // If the user already entered a full email, return it directly
  if (clean.includes('@')) {
    return clean;
  }
  return `${clean}@${teacherEmailDomain}`;
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

