// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="full-screen-center">
      <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
        <span style={{ color: '#1D9E75' }}>M</span>ARS
      </div>
      <span>Loading...</span>
    </div>
  );
  // Allow both logged-in users AND guest users through
  return user ? children : <Navigate to="/login" replace />;
}
