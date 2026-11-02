import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import StudentsPage from './pages/StudentsPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // 1. Check active session on initial application load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    // 2. Listen for auth changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
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
