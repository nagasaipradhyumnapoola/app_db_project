import { useState } from 'react';

export default function StudentTable({
  students,
  loading,
  searchQuery,
  onEditStudent,
  onDeleteStudent,
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Confirm deletion of student [${student.register_no} - ${student.name}]?`
    );
    if (!confirmed) return;

    setDeletingId(student.id);
    await onDeleteStudent(student.id);
    setDeletingId(null);
  };

  if (loading && students.length === 0) {
    return (
      <div className="card table-card">
        <div className="empty-state">
          <div className="spinner" aria-label="Loading students"></div>
          <p className="font-mono">[///] Querying database records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div className="table-header-bar">
        <h2>
          <span className="ascii-bullet">[#]</span> Student Records
        </h2>
        <span className="badge badge-outline">
          {students.length} {students.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <pre className="ascii-empty-art" aria-hidden="true">{`       .------------------------.
      /  ______________________  \\
     |  |                      |  |
     |  |   [ NO DATA FOUND ]  |  |
     |  |                      |  |
     |  |   (o) EMPTY TABLE    |  |
     |  |______________________|  |
      \\__________________________/
          \\                  /
        .--\\----------------/--.
       /   ----------------    \\
      '------------------------'`}</pre>
          <p className="empty-title">
            {searchQuery
              ? `No student found matching "${searchQuery}"`
              : 'No student records in registry.'}
          </p>
          <p className="empty-subtitle">
            {searchQuery
              ? 'Try searching with a different register number or clear filter.'
              : 'Submit student details above to insert the first record.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Register No</th>
                <th scope="col">Student Name</th>
                <th scope="col">Department</th>
                <th scope="col">Year</th>
                <th scope="col">Email</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="font-mono font-bold">{student.register_no}</td>
                  <td>{student.name}</td>
                  <td>{student.department}</td>
                  <td>
                    <span className="badge badge-year">Year {student.year}</span>
                  </td>
                  <td className="text-muted">{student.email}</td>
                  <td className="text-right table-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditStudent(student)}
                      disabled={deletingId === student.id}
                      aria-label={`Edit ${student.register_no}`}
                    >
                      Edit [~]
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(student)}
                      disabled={deletingId === student.id}
                      aria-label={`Delete ${student.register_no}`}
                    >
                      {deletingId === student.id ? 'Deleting...' : 'Delete [x]'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
