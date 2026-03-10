import { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<string | null>;
};

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const loginError = await onLogin(email, password);
    if (loginError) {
      setError(loginError);
    }

    setIsSubmitting(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '520px'
        }}
      >
        <div style={{ width: '100%', height: '220px', backgroundColor: '#e2e8f0', position: 'relative' }}>
          <img
            src="/welcome-bg.png"
            alt="Bienvenido a CEMOSA - Grupo Privado Seguridad y Salud"
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'white' }}
          />
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 600, textAlign: 'center' }}>
            Iniciar sesion
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>
            Accede con tu correo y contrasena
          </p>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '0.5rem', fontWeight: 500 }}>
                Correo electronico
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                />
                <input
                  required
                  type="email"
                  autoComplete="username"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@correo.com"
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.625rem',
                    padding: '0.7rem 0.75rem 0.7rem 2.4rem',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '0.5rem', fontWeight: 500 }}>
                Contrasena
              </label>
              <div style={{ position: 'relative' }}>
                <LockKeyhole
                  size={16}
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                />
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={isSubmitting}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contrasena"
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.625rem',
                    padding: '0.7rem 0.75rem 0.7rem 2.4rem',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  color: '#b91c1c',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.625rem',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.875rem'
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                border: 'none',
                borderRadius: '0.625rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#166534',
                color: 'white',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.75 : 1
              }}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
