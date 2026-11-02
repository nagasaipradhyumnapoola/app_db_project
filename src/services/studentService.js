import { supabase } from '../lib/supabase';

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

  // PostgreSQL unique_violation error code 23505
  if (code === '23505' || message.includes('unique') || message.includes('duplicate key')) {
    return 'A student with this Register Number already exists in your records.';
  }

  // PostgreSQL check_violation error code 23514
  if (code === '23514' || message.includes('check constraint')) {
    return 'Validation failed: Year must be between 1 and 4.';
  }

  // RLS or permission denied
  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'Permission denied: You can only manage your own student records.';
  }

  return message || 'Database operation failed.';
}

/**
 * Student Database Service
 */
export const studentService = {
  /**
   * Fetches all students belonging to the currently authenticated teacher.
   * Optionally filters by register number if searchQuery is provided.
   * @param {string} [searchQuery='']
   * @returns {Promise<{data: Array, error: string|null}>}
   */
  async getStudents(searchQuery = '') {
    try {
      let query = supabase
        .from('students')
        .select('*')
        .order('register_no', { ascending: true });

      const cleanSearch = searchQuery ? searchQuery.trim() : '';
      if (cleanSearch) {
        // Filter by register number matching the search query (case-insensitive)
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
   * @param {Object} studentData
   * @returns {Promise<{data: Object|null, error: string|null}>}
   */
  async createStudent(studentData) {
    const validationError = validateStudentInput(studentData);
    if (validationError) {
      return { data: null, error: validationError };
    }

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
        teacher_id: user.id, // Explicitly assign authenticated teacher's ID
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
   * @param {number|string} id - Student primary key
   * @param {Object} studentData
   * @returns {Promise<{data: Object|null, error: string|null}>}
   */
  async updateStudent(id, studentData) {
    const validationError = validateStudentInput(studentData);
    if (validationError) {
      return { data: null, error: validationError };
    }

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
        // teacher_id remains user.id
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
   * @param {number|string} id - Student primary key
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async deleteStudent(id) {
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

