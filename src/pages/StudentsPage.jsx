import { useState, useEffect, useCallback } from 'react';
import { emailToTeacherId } from '../lib/supabase';
import { studentService } from '../services/studentService';
import StudentForm from '../components/StudentForm';
import StudentTable from '../components/StudentTable';

export default function StudentsPage({ session, onLogout }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);

  // Extract display teacher ID
  const teacherIdDisplay = session?.user?.email
    ? emailToTeacherId(session.user.email)
    : 'TEACHER';

  // Fetch students from Supabase
  const loadStudents = useCallback(async (query = activeSearch) => {
    setLoading(true);
    setTableError('');
    const { data, error } = await studentService.getStudents(query);
    setLoading(false);

    if (error) {
      setTableError(error);
    } else {
      setStudents(data);
    }
  }, [activeSearch]);

  // Initial load
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Trigger search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    loadStudents(searchQuery);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    loadStudents('');
  };

  // Callback when student is added or updated
  const handleSaveSuccess = (savedStudent, operation) => {
    setEditingStudent(null);
    setSuccessBanner(
      operation === 'create'
        ? `Student [${savedStudent.register_no}] added successfully.`
        : `Student [${savedStudent.register_no}] updated successfully.`
    );
    loadStudents(activeSearch);

    setTimeout(() => {
      setSuccessBanner('');
    }, 4000);
  };

  // Delete student
  const handleDeleteStudent = async (id) => {
    setTableError('');
    const { success, error } = await studentService.deleteStudent(id);
    if (!success) {
      setTableError(error || 'Failed to delete student.');
    } else {
      setSuccessBanner('Student record removed.');
      if (editingStudent && editingStudent.id === id) {
        setEditingStudent(null);
      }
      loadStudents(activeSearch);
      setTimeout(() => {
        setSuccessBanner('');
      }, 4000);
    }
  };

  return (
    <div className="portal-layout">
      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <img src="/logo.jpg" alt="Logo" className="navbar-logo-img" />
            <span className="brand-title">Student Registry</span>
            <span className="badge badge-outline">[ ENGINE: JAVA 25 ]</span>
          </div>

          <div className="navbar-user">
            <div className="user-info">
              <span className="user-label">[ID: SIGNED_IN]</span>
              <span className="user-id">{teacherIdDisplay}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onLogout}
            >
              Sign Out [x]
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Global Notifications */}
        {successBanner && (
          <div className="alert alert-success" role="status">
            <span className="ascii-icon">[✓]</span> {successBanner}
          </div>
        )}

        {tableError && (
          <div className="alert alert-error" role="alert">
            <span className="ascii-icon">[!]</span> {tableError}
          </div>
        )}

        {/* Section 1: Create or Update Student */}
        <section className="section-form">
          <StudentForm
            editingStudent={editingStudent}
            onSaveSuccess={handleSaveSuccess}
            onCancelEdit={() => setEditingStudent(null)}
          />
        </section>

        {/* Section 2: Search & Filter Toolbar */}
        <section className="section-toolbar">
          <div className="card toolbar-card">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Filter by Register Number (e.g. 2024CS101)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn-icon-clear"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    [x]
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-primary">
                Search [?]
              </button>
              {activeSearch && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearSearch}
                >
                  Clear Filter
                </button>
              )}
            </form>
          </div>
        </section>

        {/* Section 3: Student Records Table */}
        <section className="section-table">
          <StudentTable
            students={students}
            loading={loading}
            searchQuery={activeSearch}
            onEditStudent={(student) => {
              setEditingStudent(student);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDeleteStudent={handleDeleteStudent}
          />
        </section>
      </main>

      <footer className="footer">
        <pre className="ascii-footer-bar">{`+====================================================================+
| [///] STUDENT REGISTRY SYSTEM :: FACULTY PORTAL :: SECURE ENGINE    |
+====================================================================+`}</pre>
      </footer>
    </div>
  );
}
