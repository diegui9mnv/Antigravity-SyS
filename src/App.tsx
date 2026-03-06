import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Waves } from 'lucide-react';
import ProjectsList from './pages/ProjectsList';
import ProjectsLocation from './pages/ProjectsLocation';
import ProjectDetails from './pages/ProjectDetails';
import Agenda from './pages/Agenda';
import UsersList from './pages/UsersList';
import Plantillas from './pages/Plantillas';
import Login from './pages/Login';
import {
  clearLocalRole,
  getAuthProvider,
  getLocalSession,
  initKeycloakSession,
  logoutKeycloak,
  saveLocalRole,
  startKeycloakRefresh,
  type AppRole,
  type AuthSession
} from './lib/keycloakAuth';

const AppLayout = ({ children, session, onLogout }: { children: ReactNode; session: AuthSession; onLogout: () => void }) => {
  const location = useLocation();
  const isFluid = location.pathname.startsWith('/obra/');
  const containerClass = isFluid ? 'container-fluid' : 'container';

  const canManage = session.role === 'admin' || session.role === 'cemosa';
  const canUsers = session.role === 'admin' || session.role === 'cemosa';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className={containerClass + ' header-content'}>
          <Link to="/" className="logo-area">
            <Waves size={28} />
            <span>Seguridad y Salud</span>
          </Link>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/" className="btn btn-ghost">Mis Obras</Link>
            <Link to="/agenda" className="btn btn-ghost">Agenda</Link>
            {canManage && (
              <Link to="/plantillas" className="btn btn-ghost">Plantillas</Link>
            )}
            {canUsers && (
              <Link to="/usuarios" className="btn btn-ghost">Usuarios</Link>
            )}
            <div style={{ marginLeft: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {session.displayName} ({session.role})
              </span>
              <button onClick={onLogout} className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>Salir</button>
            </div>
          </nav>
        </div>
      </header>
      <main className="app-main animate-fade-in">
        <div className={containerClass}>
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  const authProvider = useMemo(() => getAuthProvider(), []);
  const [session, setSession] = useState<AuthSession | null>(() => (authProvider === 'local' ? getLocalSession() : null));
  const [authLoading, setAuthLoading] = useState<boolean>(authProvider === 'keycloak');
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (authProvider !== 'keycloak') {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    const initAuth = async () => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const keycloakSession = await initKeycloakSession();
        if (!mounted) return;
        setSession(keycloakSession);
        if (keycloakSession.keycloak) {
          refreshTimerRef.current = startKeycloakRefresh(keycloakSession.keycloak);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Error inicializando Keycloak.';
          setAuthError(message);
          setSession(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [authProvider]);

  const handleLocalLogin = (role: AppRole) => {
    saveLocalRole(role);
    setSession({
      role,
      displayName: role.toUpperCase(),
      provider: 'local'
    });
  };

  const handleLogout = async () => {
    try {
      if (session?.provider === 'keycloak' && session.keycloak) {
        await logoutKeycloak(session.keycloak);
        return;
      }
    } catch (error) {
      console.error('Error al cerrar sesión en Keycloak:', error);
    }

    clearLocalRole();
    setSession(null);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Iniciando autenticación...
      </div>
    );
  }

  if (!session) {
    if (authProvider === 'keycloak') {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
          <h2 style={{ margin: 0 }}>Error de autenticación Keycloak</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{authError || 'No se pudo autenticar.'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      );
    }
    return <Login onLogin={handleLocalLogin} />;
  }

  const canManage = session.role === 'admin' || session.role === 'cemosa';
  const canUsers = session.role === 'admin' || session.role === 'cemosa';

  return (
    <BrowserRouter>
      <AppLayout session={session} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/obras/localizacion" element={<ProjectsLocation />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/plantillas" element={canManage ? <Plantillas /> : <Navigate to="/" />} />
          <Route path="/usuarios" element={canUsers ? <UsersList /> : <Navigate to="/" />} />
          <Route path="/obra/:id" element={<ProjectDetails />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;

