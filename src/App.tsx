import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LogOut, Waves } from 'lucide-react';
import ProjectsList from './pages/ProjectsList';
import ProjectsLocation from './pages/ProjectsLocation';
import ProjectsExcelTracking from './pages/ProjectsExcelTracking';
import ProjectDetails from './pages/ProjectDetails';
import Agenda from './pages/Agenda';
import Plantillas from './pages/Plantillas';
import Login from './pages/Login';
import { getSupabaseSession, loginWithEmailPassword, logoutSupabase, onAuthStateChange, type AuthSession } from './lib/auth';

const AppLayout = ({ children, session, onLogout }: { children: ReactNode; session: AuthSession; onLogout: () => void }) => {
  const location = useLocation();
  const isFluid = location.pathname.startsWith('/obra/');
  const containerClass = isFluid ? 'container-fluid' : 'container';

  const canManage = session.role === 'cemosa';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className={containerClass + ' header-content'}>
          <Link to="/" className="logo-area">
            <Waves size={28} />
            <span>Seguridad y Salud</span>
          </Link>
          <nav className="main-nav">
            <div className="main-nav-links">
              <Link to="/" className="btn btn-ghost">Mis Obras</Link>
              <Link to="/agenda" className="btn btn-ghost">Agenda</Link>
              {canManage && (
                <Link to="/plantillas" className="btn btn-ghost">Plantillas</Link>
              )}
              <button onClick={onLogout} className="btn main-nav-logout-mobile">
                <LogOut size={15} />
                Salir
              </button>
            </div>
            <div className="main-nav-account">
              <span className="main-nav-user">
                {session.displayName} ({session.role})
              </span>
              <button onClick={onLogout} className="btn btn-ghost main-nav-logout">Salir</button>
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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const initialSession = await getSupabaseSession();
        if (mounted) {
          setSession(initialSession);
        }
      } catch (error) {
        console.error('Error cargando sesion de Supabase:', error);
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    const { session: nextSession, error } = await loginWithEmailPassword(email, password);
    if (error) return error;
    setSession(nextSession);
    return null;
  };

  const handleLogout = async () => {
    try {
      await logoutSupabase();
    } catch (error) {
      console.error('Error cerrando sesion en Supabase:', error);
    } finally {
      setSession(null);
    }
  };

  const handleLogoutWithConfirm = () => {
    const shouldLogout = window.confirm('Vas a cerrar sesion. ¿Quieres salir ahora?');
    if (!shouldLogout) return;
    void handleLogout();
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Iniciando sesion...
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  const canManage = session.role === 'cemosa';

  return (
    <BrowserRouter>
      <AppLayout session={session} onLogout={handleLogoutWithConfirm}>
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/obras/localizacion" element={<ProjectsLocation />} />
          <Route path="/obras/seguimiento-excel" element={<ProjectsExcelTracking />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/plantillas" element={canManage ? <Plantillas /> : <Navigate to="/" />} />
          <Route path="/obra/:id" element={<ProjectDetails />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
