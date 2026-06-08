// src/App.jsx
import { useState, useRef, useCallback, useEffect }   from 'react';
import { BrowserRouter, Routes, Route, Navigate }     from 'react-router-dom';
import { AuthProvider }                                from './hooks/useAuth';
import ProtectedRoute                                  from './components/ProtectedRoute';
import Topbar                                          from './components/Topbar';
import Sidebar                                         from './components/Sidebar';
import BottomNav                                       from './components/BottomNav';
import FAB                                             from './components/FAB';
import Login                                           from './pages/Login';
import Dashboard                                       from './pages/Dashboard';
import Alarms                                          from './pages/Alarms';
import HomeControl                                     from './pages/HomeControl';
import Health                                          from './pages/Health';
import Voice                                           from './pages/Voice';
import AI                                              from './pages/AI';
import Platforms                                       from './pages/Platforms';
import Settings                                        from './pages/Settings';
import BackgroundPacks                                 from './pages/BackgroundPacks';
import { getPackById }                                 from './data/backgroundPacks';
import './styles/global.css';
import './App.css';

function AppShell() {
  // Sidebar: open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 700);
  const isMobile = window.innerWidth <= 700;

  // Restore saved background pack on every app load
  useEffect(() => {
    const savedId = localStorage.getItem('mars-background-pack');
    if (savedId) {
      const pack = getPackById(savedId);
      if (pack?.background) {
        document.documentElement.style.setProperty('--app-bg-override', pack.background);
      }
    }
  }, []);

  // ── Swipe to open/close sidebar (desktop only — mobile uses BottomNav) ──
  const touchStart = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (window.innerWidth > 700) {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    }
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = Math.abs(t.clientY - touchStart.current.y);
    touchStart.current = null;
    if (Math.abs(dx) < 50 || dy > 60) return;
    if (dx > 0) setSidebarOpen(true);
    else        setSidebarOpen(false);
  }, []);

  return (
    <div
      className="app-shell"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Topbar — on mobile, hide the hamburger since BottomNav handles navigation */}
      <Topbar
        onMenuToggle={() => setSidebarOpen(p => !p)}
        hideBurger={isMobile}
      />

      <div className="app-body">
        {/* Sidebar — hidden on mobile via CSS, BottomNav takes over */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="app-main app-main--mobile-padded">
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
            <Route path="/settings"    element={<Settings />}        />
            <Route path="/backgrounds" element={<BackgroundPacks />}  />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile-only: bottom nav bar + FAB */}
      <BottomNav />
      <FAB />
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
