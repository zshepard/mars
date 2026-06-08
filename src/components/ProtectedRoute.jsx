// src/components/ProtectedRoute.jsx
//
// Route guard — only authenticated (Google / email) users may access
// the inner dashboard. Guest users and unauthenticated visitors are
// redirected to /login.
//
// Rules:
//   1. Auth state still loading  → show loading splash (no flash of /login)
//   2. user is null              → redirect to /login
//   3. user.isGuest === true     → redirect to /login  (guests blocked)
//   4. real authenticated user   → render children
//
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Still resolving Firebase auth state
  if (loading) {
    return (
      <div className="full-screen-center">
        <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <span style={{ color: '#1D9E75' }}>M</span>ARS
        </div>
        <span style={{ fontSize: 13, opacity: 0.5, marginTop: 8 }}>Loading…</span>
      </div>
    );
  }

  // 2 & 3. Not signed in OR guest mode — redirect to login
  // Preserve the attempted URL so Login can redirect back after sign-in
  if (!user || user.isGuest) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4. Authenticated real user — allow through
  return children;
}
