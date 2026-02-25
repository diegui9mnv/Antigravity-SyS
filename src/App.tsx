import type { ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Waves } from 'lucide-react';
import ProjectsList from './pages/ProjectsList';
import ProjectDetails from './pages/ProjectDetails';
import Agenda from './pages/Agenda';

const AppLayout = ({ children }: { children: ReactNode }) => {
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
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/" className="btn btn-ghost">Mis Obras</Link>
            <Link to="/agenda" className="btn btn-ghost">Agenda</Link>
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
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/obra/:id" element={<ProjectDetails />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
