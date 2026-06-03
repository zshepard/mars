// src/App.jsx
import { useState, useEffect }                         from 'react';
import { BrowserRouter, Routes, Route, Navigate }     from 'react-router-dom';
import { AuthProvider }                                from './hooks/useAuth';
import ProtectedRoute                                  from './components/ProtectedRoute';
import Topbar                                          from './components/Topbar';
import Sidebar                                         from './components/Sidebar';
import Login                                           from './pages/Login';
import Dashboard                                       from './pages/Dashboard';
import Alarms                                          from './pages/Alarms';
import Routines                                        from './pages/Routines';
import HomeControl                                     from './pages/HomeControl';
import Health                                          from './pages/Health';
import Voice                                           from './pages/Voice';
import AI                                              from './pages/AI';
import Platforms                                       from './pages/Platforms';
import Settings                                        from './pages/Settings';
import ScheduledLinks                                  from './pages/ScheduledLinks';
import './styles/global.css';
import './App.css';

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isWebView = /MARS-App|wv|WebView/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Android') && /Version\/\d/.test(navigator.userAgent));

  return (
    <div className={`app-shell${isWebView ? ' mars-webview' : ''}`}>
      <Topbar onMenuToggle={() => setSidebarOpen((p) => !p)} />
      <div className="app-body">
        <Sidebar open={sidebarOpen} />
        <main className="app-main">
          <Routes>
            <Route path="/"          element={<Dashboard />}   />
            <Route path="/alarms"    element={<Alarms />}      />
            <Route path="/links"     element={<ScheduledLinks />} />
            <Route path="/routines"  element={<Routines />}    />
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
