import { supabase } from '../lib/supabase';

// Uses Vite proxy (/api -> http://127.0.0.1:8080) for rock-solid same-origin connectivity
const JAVA_API = '/api';

/**
 * Retrieves the current JWT access token from session or local storage.
 */
async function getAuthToken() {
  try {
    const saved = localStorage.getItem('faculty_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.access_token) return parsed.access_token;
    }
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (err) {
    return null;
  }
}

/**
 * Validates student payload prior to submission.
 * @param {Object} studentData
 * @returns {string|null} Error message or null if valid
 */
export function validateStudentInput(studentData) {
  const { register_no, name, department, year, email } = studentData;

  if (!register_no || !register_no.trim()) {
    return 'Register Number is required.';
  }
  if (!name || !name.trim()) {
    return 'Student Name is required.';
  }
  if (!department || !department.trim()) {
    return 'Department is required.';
  }
  const yearNum = Number(year);
  if (!year || isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
    return 'Year must be an integer between 1 and 4.';
  }
  if (!email || !email.trim()) {
    return 'Email is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

/**
 * Formats PostgreSQL / Supabase errors into human-readable messages.
 * @param {Error|Object} error
 * @returns {string}
 */
export function formatDatabaseError(error) {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code;
  const message = error.message || '';

  if (code === '23505' || message.includes('unique') || message.includes('duplicate key')) {
    return 'A student with this Register Number already exists in your records.';
  }
  if (code === '23514' || message.includes('check constraint')) {
    return 'Validation failed: Year must be between 1 and 4.';
  }
  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'Permission denied: You can only manage your own student records.';
  }

  return message || 'Database operation failed.';
}

/**
 * Student Database Service
 * Communicates with the single-file Java Backend (Server.java at :8080) via Vite proxy (/api),
 * with graceful direct fallback if the Java server is offline.
 */
export const studentService = {
  /**
   * Authenticates teacher credentials via the Java Backend.
   */
  async login(teacherId, password) {
    try {
      const res = await fetch(`${JAVA_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, password })
      });

      const data = await res.json();
      if (res.ok && data.access_token) {
        // Persist session locally
        localStorage.setItem('faculty_session', JSON.stringify(data));
        return { data: { session: data, user: data.user }, error: null };
      }
      return { data: null, error: data.error || 'Invalid Teacher ID or password.' };
    } catch (err) {
      return { data: null, error: 'Unable to connect to Java backend on port 8080. Please ensure Java server is running.' };
    }
  },

  /**
   * Fetches all students belonging to the authenticated teacher.
   * Routes through Java Backend: GET /api/students(?search=...)
   */
  async getStudents(searchQuery = '') {
    const token = await getAuthToken();

    // 1. Try Java Backend
    if (token) {
      try {
        const cleanSearch = searchQuery ? searchQuery.trim() : '';
        const url = `${JAVA_API}/students${cleanSearch ? `?search=${encodeURIComponent(cleanSearch)}` : ''}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          return { data: Array.isArray(data) ? data : [], error: null };
        }
      } catch (e) {
        // Fall through to direct Supabase client
      }
    }

    // 2. Direct Supabase Fallback
    try {
      let query = supabase
        .from('students')
        .select('*')
        .order('register_no', { ascending: true });

      const cleanSearch = searchQuery ? searchQuery.trim() : '';
      if (cleanSearch) {
        query = query.ilike('register_no', `%${cleanSearch}%`);
      }

      const { data, error } = await query;
      if (error) {
        return { data: [], error: formatDatabaseError(error) };
      }
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: err.message || 'Failed to fetch student records.' };
    }
  },

  /**
   * Inserts a new student record for the authenticated teacher.
   * Routes through Java Backend: POST /api/students
   */
  async createStudent(studentData) {
    const validationError = validateStudentInput(studentData);
    if (validationError) {
      return { data: null, error: validationError };
    }

    const token = await getAuthToken();

    // 1. Try Java Backend
    if (token) {
      try {
        const res = await fetch(`${JAVA_API}/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(studentData)
        });

        const json = await res.json();
        if (res.ok) {
          return { data: json, error: null };
        } else {
          return { data: null, error: json.error || 'Failed to create student via Java backend.' };
        }
      } catch (e) {
        // Fall through to direct Supabase client
      }
    }

    // 2. Direct Supabase Fallback
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'Authentication session expired. Please log in again.' };
      }

      const payload = {
        register_no: studentData.register_no.trim().toUpperCase(),
        name: studentData.name.trim(),
        department: studentData.department.trim(),
        year: parseInt(studentData.year, 10),
        email: studentData.email.trim().toLowerCase(),
        teacher_id: user.id,
      };

      const { data, error } = await supabase
        .from('students')
        .insert([payload])
        .select()
        .single();

      if (error) {
        return { data: null, error: formatDatabaseError(error) };
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to create student record.' };
    }
  },

  /**
   * Updates an existing student record.
   * Routes through Java Backend: PUT /api/students/{id}
   */
  async updateStudent(id, studentData) {
    const validationError = validateStudentInput(studentData);
    if (validationError) {
      return { data: null, error: validationError };
    }

    const token = await getAuthToken();

    // 1. Try Java Backend
    if (token) {
      try {
        const res = await fetch(`${JAVA_API}/students/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(studentData)
        });

        const json = await res.json();
        if (res.ok) {
          return { data: json, error: null };
        } else {
          return { data: null, error: json.error || 'Failed to update student via Java backend.' };
        }
      } catch (e) {
        // Fall through to direct Supabase client
      }
    }

    // 2. Direct Supabase Fallback
    try {
      const payload = {
        register_no: studentData.register_no.trim().toUpperCase(),
        name: studentData.name.trim(),
        department: studentData.department.trim(),
        year: parseInt(studentData.year, 10),
        email: studentData.email.trim().toLowerCase(),
      };

      const { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: formatDatabaseError(error) };
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to update student record.' };
    }
  },

  /**
   * Deletes a student record by ID.
   * Routes through Java Backend: DELETE /api/students/{id}
   */
  async deleteStudent(id) {
    const token = await getAuthToken();

    // 1. Try Java Backend
    if (token) {
      try {
        const res = await fetch(`${JAVA_API}/students/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });

        const json = await res.json();
        if (res.ok) {
          return { success: true, error: null };
        } else {
          return { success: false, error: json.error || 'Failed to delete student via Java backend.' };
        }
      } catch (e) {
        // Fall through to direct Supabase client
      }
    }

    // 2. Direct Supabase Fallback
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: formatDatabaseError(error) };
      }
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete student record.' };
    }
  },
};
