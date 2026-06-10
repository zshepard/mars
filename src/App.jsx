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
import Voice                                           from './pages/Voice';
import Platforms                                       from './pages/Platforms';
import Settings                                        from './pages/Settings';
import BackgroundPacks                                 from './pages/BackgroundPacks';
import { getPackById }                                 from './data/backgroundPacks';
import { usePreferences }                              from './hooks/usePreferences';
import { useAuth }                                     from './hooks/useAuth';
import PullToRefresh                                   from './components/PullToRefresh';
import RoutinePlayer                                   from './components/RoutinePlayer';
import './styles/global.css';
import './App.css';

/**
 * Detect whether the current environment should use the mobile layout.
 * True when:
 *   - Screen width ≤ 700 CSS pixels, OR
 *   - Running as a TWA / PWA in standalone/fullscreen display mode
 *     (covers Android TWA regardless of reported screen width)
 */
function getIsMobile() {
  const isNarrow = window.innerWidth <= 700;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true; // legacy Safari PWA
  return isNarrow || isStandalone;
}

function AppShell() {
  // ── Reactive mobile detection — updates on resize and display-mode change ──
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    function update() { setIsMobile(getIsMobile()); }
    window.addEventListener('resize', update);
    // Also listen for display-mode changes (rare but possible)
    const mq1 = window.matchMedia('(display-mode: standalone)');
    const mq2 = window.matchMedia('(display-mode: fullscreen)');
    mq1.addEventListener('change', update);
    mq2.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq1.removeEventListener('change', update);
      mq2.removeEventListener('change', update);
    };
  }, []);

  // Sidebar: always collapsed (icon-only rail) on desktop; closed on mobile/TWA.
  // The user requested the collapsed icon-only rail as the permanent desktop state.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep sidebarOpen closed when isMobile changes (e.g. window resize)
  useEffect(() => {
    setSidebarOpen(false);
  }, [isMobile]);

  // ── Subscribe to Firestore preferences so background + clock format sync
  // across devices without requiring the Settings or BackgroundPacks page to be open.
  const { user } = useAuth();
  usePreferences(user); // side-effect only — fires mirrorToLocal on every Firestore update

  // Restore saved background pack on every app load
  useEffect(() => {
    function applyPack(packId) {
      const pack = getPackById(packId);
      if (!pack) return;
      const root = document.documentElement;
      if (pack.background) {
        root.style.setProperty('--app-bg-override', pack.background);
      } else {
        root.style.removeProperty('--app-bg-override');
      }
      if (pack.cssVars) {
        Object.entries(pack.cssVars).forEach(([k, v]) => root.style.setProperty(k, v));
      }
    }
    // Apply on mount from localStorage
    const savedId = localStorage.getItem('mars-background-pack');
    if (savedId) applyPack(savedId);
    // Also apply when Firestore sync updates the pref (cross-device / refresh)
    const handler = (e) => applyPack(e.detail);
    window.addEventListener('mars:background-pack-changed', handler);
    return () => window.removeEventListener('mars:background-pack-changed', handler);
  }, []);

  // Swipe gestures removed — sidebar is permanently collapsed on desktop.
  const touchStart = useRef(null);
  const onTouchStart = useCallback(() => {}, []);
  const onTouchEnd   = useCallback(() => {}, []);

  return (
    <div
      className={`app-shell${isMobile ? ' app-shell--mobile' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Topbar — on mobile/TWA, hide the hamburger since BottomNav handles navigation */}
      <Topbar
        onMenuToggle={() => setSidebarOpen(p => !p)}
        hideBurger={true}
      />

      <div className="app-body" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
        {/* Sidebar — hidden on mobile/TWA via CSS, BottomNav takes over */}
        {!isMobile && (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        <main className="app-main app-main--mobile-padded">
          <Routes>
            <Route path="/"          element={<Dashboard />}   />
            <Route path="/alarms"    element={<Alarms />}      />
            <Route path="/links"     element={<Navigate to="/alarms" replace />} />
            <Route path="/routines"  element={<Navigate to="/alarms" replace />} />
            <Route path="/home"      element={<Navigate to="/settings" replace />} />
            <Route path="/health"    element={<Navigate to="/settings" replace />} />
            <Route path="/voice"     element={<Voice />}       />
            <Route path="/ai"        element={<Navigate to="/settings" replace />} />
            <Route path="/platforms" element={<Platforms />}   />
            <Route path="/settings"    element={<Settings />}        />
            <Route path="/backgrounds" element={<BackgroundPacks />}  />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Pull-to-refresh — mobile only, attaches to .app-main scroll container */}
      {isMobile && <PullToRefresh />}

      {/* Mobile/TWA: bottom nav bar + FAB */}
      {isMobile && <BottomNav />}
      {isMobile && <FAB />}

      {/* Global routine player overlay — activated by mars:start-routine event */}
      <RoutinePlayer />
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
