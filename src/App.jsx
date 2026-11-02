import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import StudentsPage from './pages/StudentsPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // 1. Check local session storage
    const saved = localStorage.getItem('faculty_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.access_token || parsed.user) {
          setSession(parsed);
          setCheckingAuth(false);
        }
      } catch (ignored) {}
    }

    // 2. Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        localStorage.setItem('faculty_session', JSON.stringify(session));
      }
      setCheckingAuth(false);
    }).catch(() => setCheckingAuth(false));

    // 3. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        localStorage.setItem('faculty_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('faculty_session');
      }
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('faculty_session');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSession(null);
    }
  };

  // Initial authentication check spinner
  if (checkingAuth) {
    return (
      <div className="app-loader">
        <div className="spinner"></div>
        <p>Initializing secure session...</p>
      </div>
    );
  }

  // Protected View: Screen 1 (Login) or Screen 2 (Student Database)
  return session ? (
    <StudentsPage session={session} onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={(newSession) => setSession(newSession)} />
  );
}
