import type { ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Waves } from 'lucide-react';
import ProjectsList from './pages/ProjectsList';
import ProjectDetails from './pages/ProjectDetails';

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="container header-content">
          <Link to="/" className="logo-area">
            <Waves size={28} />
            <span>Antigravity Obras</span>
          </Link>
          <nav>
            <Link to="/" className="btn btn-ghost">Mis Obras</Link>
          </nav>
        </div>
      </header>
      <main className="app-main animate-fade-in">
        <div className="container">
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
          <Route path="/obra/:id" element={<ProjectDetails />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
