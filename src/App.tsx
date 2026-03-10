import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Waves } from 'lucide-react';
import ProjectsList from './pages/ProjectsList';
import ProjectsLocation from './pages/ProjectsLocation';
import ProjectsExcelTracking from './pages/ProjectsExcelTracking';
import ProjectDetails from './pages/ProjectDetails';
import Agenda from './pages/Agenda';
import UsersList from './pages/UsersList';
import Plantillas from './pages/Plantillas';
import Login from './pages/Login';
import { getSupabaseSession, loginWithEmailPassword, logoutSupabase, onAuthStateChange, type AuthSession } from './lib/auth';

const AppLayout = ({ children, session, onLogout }: { children: ReactNode; session: AuthSession; onLogout: () => void }) => {
  const location = useLocation();
  const isFluid = location.pathname.startsWith('/obra/');
  const containerClass = isFluid ? 'container-fluid' : 'container';

  const canManage = session.role === 'cemosa';
  const canUsers = session.role === 'cemosa';

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
  const canUsers = session.role === 'cemosa';

  return (
    <BrowserRouter>
      <AppLayout session={session} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/obras/localizacion" element={<ProjectsLocation />} />
          <Route path="/obras/seguimiento-excel" element={<ProjectsExcelTracking />} />
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
