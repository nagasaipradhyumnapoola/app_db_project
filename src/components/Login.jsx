import { useState } from 'react';
import { supabase, teacherIdToEmail } from '../lib/supabase';
import { studentService } from '../services/studentService';
import AsciiFlower from './AsciiFlower';

export default function Login({ onLoginSuccess }) {
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = teacherId.trim();
    if (!trimmedId) {
      setErrorMessage('Please enter your Teacher ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try Authentication via Java Backend (:8080)
      const javaAuthResult = await studentService.login(trimmedId, password);
      if (javaAuthResult) {
        if (javaAuthResult.error) {
          setErrorMessage(javaAuthResult.error);
          setLoading(false);
          return;
        } else if (javaAuthResult.data?.session) {
          onLoginSuccess(javaAuthResult.data.session);
          setLoading(false);
          return;
        }
      }

      // 2. Direct Supabase Fallback
      const authEmail = teacherIdToEmail(trimmedId);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Invalid Teacher ID or password. Please verify and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Account email not confirmed. Please verify the account in Supabase.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          setErrorMessage('Connection failed: Unable to reach database. If using Brave Browser, please turn off Brave Shields for this site.');
        } else {
          setErrorMessage(error.message || 'Login failed.');
        }
      } else if (data.session) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setErrorMessage('Connection failed: Unable to reach database. If using Brave Browser, please turn off Brave Shields for this site.');
      } else {
        setErrorMessage(msg || 'An unexpected error occurred during sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-center">
      <div className="login-layout-wrapper">
        {/* Clean Login Card in Middle as Earlier */}
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.jpg" alt="Logo" className="login-logo-img" />
            <h1>Teacher Portal</h1>
            <p className="subtitle">
              Sign in with your assigned Teacher ID and password to access student records.
            </p>
          </div>

          {errorMessage && (
            <div className="alert alert-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="form-stack">
            <div className="form-group">
              <label htmlFor="teacherId">Teacher ID</label>
              <input
                id="teacherId"
                type="text"
                placeholder="e.g. T001 or t001@school.edu"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
              <span className="field-hint">
                Enter your Teacher ID (e.g. <code>T001</code>) or full email.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>Faculty Portal &bull; Secure Authentication</p>
          </div>
        </div>

        {/* Animated ASCII Flower & SRM in the Empty Space */}
        <div className="empty-space-ascii">
          <AsciiFlower />
        </div>
      </div>
    </div>
  );
}
