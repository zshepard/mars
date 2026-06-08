// src/App.jsx
import { useState, useEffect, useRef, useCallback }   from 'react';
import { BrowserRouter, Routes, Route, Navigate }     from 'react-router-dom';
import { AuthProvider }                                from './hooks/useAuth';
import ProtectedRoute                                  from './components/ProtectedRoute';
import Topbar                                          from './components/Topbar';
import Sidebar                                         from './components/Sidebar';
import Login                                           from './pages/Login';
import Dashboard                                       from './pages/Dashboard';
import Alarms                                          from './pages/Alarms';
// Routines merged into Alarms page as a tab
import HomeControl                                     from './pages/HomeControl';
import Health                                          from './pages/Health';
import Voice                                           from './pages/Voice';
import AI                                              from './pages/AI';
import Platforms                                       from './pages/Platforms';
import Settings                                        from './pages/Settings';
// ScheduledLinks merged into Alarms page
import './styles/global.css';
import './App.css';

function AppShell() {
  // Start closed on mobile so content is the first thing the user sees
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 700);
  const isWebView = /MARS-App|wv|WebView/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Android') && /Version\/\d/.test(navigator.userAgent));

  // ── Swipe-to-open/close sidebar ─────────────────────────────────
  const touchStart = useRef(null);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = Math.abs(t.clientY - touchStart.current.y);
    touchStart.current = null;
    // Only register horizontal swipes (dy < 60px drift)
    if (Math.abs(dx) < 50 || dy > 60) return;
    if (dx > 0) setSidebarOpen(true);   // swipe right → open
    else        setSidebarOpen(false);  // swipe left  → close
  }, []);

  return (
    <div
      className={`app-shell${isWebView ? ' mars-webview' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Topbar onMenuToggle={() => setSidebarOpen((p) => !p)} />
      <div className="app-body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="app-main">
          <Routes>
            <Route path="/"          element={<Dashboard />}   />
            <Route path="/alarms"    element={<Alarms />}      />
            <Route path="/links"     element={<Navigate to="/alarms" replace />} />
            <Route path="/routines"  element={<Navigate to="/alarms" replace />} />
            <Route path="/home"      element={<HomeControl />} />
            <Route path="/health"    element={<Health />}      />
            <Route path="/voice"     element={<Voice />}       />
            <Route path="/ai"        element={<AI />}          />
            <Route path="/platforms" element={<Platforms />}   />
            <Route path="/settings"  element={<Settings />}    />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
