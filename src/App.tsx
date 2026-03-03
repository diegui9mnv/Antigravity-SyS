import { useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Waves } from 'lucide-react';
import ProjectsList from './pages/ProjectsList';
import ProjectDetails from './pages/ProjectDetails';
import Agenda from './pages/Agenda';
import UsersList from './pages/UsersList';
import Login from './pages/Login';

const AppLayout = ({ children, userType, onLogout }: { children: ReactNode, userType: string, onLogout: () => void }) => {
  const location = useLocation();
  const isFluid = location.pathname.startsWith('/obra/');
  const containerClass = isFluid ? 'container-fluid' : 'container';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className={containerClass + " header-content"}>
          <Link to="/" className="logo-area">
            <Waves size={28} />
            <span>Antigravity Obras</span>
          </Link>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/" className="btn btn-ghost">Mis Obras</Link>
            <Link to="/agenda" className="btn btn-ghost">Agenda</Link>
            {userType === 'CEMOSA' && <Link to="/usuarios" className="btn btn-ghost">Usuarios</Link>}
            <div style={{ marginLeft: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {userType}
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
  const [userType, setUserType] = useState<string | null>(localStorage.getItem('currentUser'));

  const handleLogin = (tipo: 'CEMOSA' | 'Externo') => {
    localStorage.setItem('currentUser', tipo);
    setUserType(tipo);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUserType(null);
  };

  if (!userType) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <AppLayout userType={userType} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/usuarios" element={<UsersList />} />
          <Route path="/obra/:id" element={<ProjectDetails />} />
        </Routes>
      </AppLayout>

    </BrowserRouter>
  );
}

export default App;
