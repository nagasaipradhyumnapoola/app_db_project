import { useState, useEffect } from 'react';
import { studentService, validateStudentInput } from '../services/studentService';

export default function StudentForm({ editingStudent, onSaveSuccess, onCancelEdit }) {
  const [formData, setFormData] = useState({
    register_no: '',
    name: '',
    department: '',
    year: '1',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Whenever editingStudent prop changes, update or reset the form
  useEffect(() => {
    if (editingStudent) {
      setFormData({
        register_no: editingStudent.register_no || '',
        name: editingStudent.name || '',
        department: editingStudent.department || '',
        year: String(editingStudent.year || '1'),
        email: editingStudent.email || '',
      });
      setFormError('');
      setFormSuccess('');
    } else {
      setFormData({
        register_no: '',
        name: '',
        department: '',
        year: '1',
        email: '',
      });
      setFormError('');
      setFormSuccess('');
    }
  }, [editingStudent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'register_no' ? value.toUpperCase() : value,
    }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Pre-flight client validation
    const validationError = validateStudentInput(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setLoading(true);

    if (editingStudent) {
      // UPDATE operation
      const { data, error } = await studentService.updateStudent(editingStudent.id, formData);
      setLoading(false);

      if (error) {
        setFormError(error);
      } else {
        setFormSuccess(`Student ${data.register_no} updated successfully.`);
        onSaveSuccess(data, 'update');
      }
    } else {
      // CREATE operation
      const { data, error } = await studentService.createStudent(formData);
      setLoading(false);

      if (error) {
        setFormError(error);
      } else {
        setFormSuccess(`Student ${data.register_no} added successfully.`);
        // Reset form after create
        setFormData({
          register_no: '',
          name: '',
          department: '',
          year: '1',
          email: '',
        });
        onSaveSuccess(data, 'create');
      }
    }
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <div>
          <h2>
            <span className="ascii-bullet">{editingStudent ? '[~]' : '[+]'}</span>{' '}
            {editingStudent ? 'Edit Student Record' : 'Add New Student'}
          </h2>
          <p className="card-description">
            {editingStudent
              ? `Modifying registry record for ${editingStudent.register_no}.`
              : 'Enter student details to register a new student record.'}
          </p>
        </div>
        {editingStudent && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancelEdit}
            disabled={loading}
          >
            Cancel [x]
          </button>
        )}
      </div>

      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      {formSuccess && (
        <div className="alert alert-success" role="status">
          {formSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit} className="student-form-grid">
        <div className="form-group">
          <label htmlFor="register_no">Register Number *</label>
          <input
            id="register_no"
            name="register_no"
            type="text"
            placeholder="e.g. 2024CS101"
            value={formData.register_no}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Student Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="department">Department *</label>
          <input
            id="department"
            name="department"
            type="text"
            placeholder="e.g. Computer Science"
            value={formData.department}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="year">Year of Study (1 - 4) *</label>
          <select
            id="year"
            name="year"
            value={formData.year}
            onChange={handleChange}
            disabled={loading}
            required
          >
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        <div className="form-group form-group-full">
          <label htmlFor="email">Email Address *</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="student@college.edu"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

        <div className="form-actions form-group-full">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Saving to Database...'
              : editingStudent
              ? 'Update Record'
              : 'Add Student'}
          </button>

          {editingStudent && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancelEdit}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

