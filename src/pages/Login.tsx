import { Building2, User } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (tipo: 'CEMOSA' | 'Externo') => void }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '600px',
                textAlign: 'center'
            }}>
                <div style={{ width: '100%', height: '300px', backgroundColor: '#e2e8f0', position: 'relative' }}>
                    {/* Fallback color if image is missing */}
                    <img
                        src="/welcome-bg.png"
                        alt="Bienvenido a CEMOSA - Grupo Privado Seguridad y Salud"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'white' }}
                        onError={(e) => {
                            // Fallback rendering in case image doesn't exist yet
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #0052cc 0%, #003d99 100%); color: white;">
                                    <h1 style="font-size: 2rem; margin-bottom: 0.5rem;">Cemosa</h1>
                                    <p style="font-size: 1.25rem; opacity: 0.9;">Seguridad y Salud - Grupo Privado</p>
                                    <p style="font-size: 0.8rem; margin-top: 2rem; opacity: 0.7;">(Coloca 'welcome-bg.png' en la carpeta public)</p>
                                </div>
                            `;
                        }}
                    />
                </div>

                <div style={{ padding: '3rem 2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 600 }}>Bienvenido</h2>
                    <p style={{ color: '#64748b', marginBottom: '2.5rem' }}>Selecciona tu perfil para acceder a la plataforma</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                            onClick={() => onLogin('CEMOSA')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1rem',
                                padding: '2rem 1rem',
                                backgroundColor: '#f0fdf4',
                                border: '2px solid #bbf7d0',
                                borderRadius: '0.75rem',
                                color: '#166534',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontWeight: 500,
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                        >
                            <Building2 size={32} />
                            Entrar como CEMOSA
                        </button>

                        <button
                            onClick={() => onLogin('Externo')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1rem',
                                padding: '2rem 1rem',
                                backgroundColor: '#fffedd',
                                border: '2px solid #fef08a',
                                borderRadius: '0.75rem',
                                color: '#854d0e',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontWeight: 500,
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef9c3'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fffedd'}
                        >
                            <User size={32} />
                            Entrar como Externo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
