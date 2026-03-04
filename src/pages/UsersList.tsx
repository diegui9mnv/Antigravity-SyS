import { useState, useEffect } from 'react';
import { Users, Mail, Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { getUsuarios, saveUsuario, updateUsuario, deleteUsuario, getEmpresas, saveEmpresa, getEmpresa } from '../store';
import { EmpresaModal } from '../components/ContactModals';

export default function UsersList() {
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        nombre: '', email: '', tipo: 'CEMOSA', empresaId: ''
    });

    const loadData = () => {
        setUsuarios(getUsuarios());
        setEmpresas(getEmpresas());
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateUsuario(editingUser.id, formData);
        } else {
            saveUsuario({ ...formData, id: `usr-${Date.now()}` });
        }
        setIsUserModalOpen(false);
        setEditingUser(null);
        setFormData({ nombre: '', email: '', tipo: 'CEMOSA', empresaId: '' });
        loadData();
    };

    const handleEdit = (u: any) => {
        setEditingUser(u);
        setFormData({
            nombre: u.nombre || '',
            email: u.email || '',
            tipo: u.tipo || 'CEMOSA',
            empresaId: u.empresaId || ''
        });
        setIsUserModalOpen(false);
        setIsUserModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
            deleteUsuario(id);
            loadData();
        }
    };

    const handleSaveEmpresa = (data: any) => {
        const id = `emp-${Date.now()}`;
        saveEmpresa({ ...data, id });
        setIsEmpresaModalOpen(false);
        loadData();
        setFormData(prev => ({ ...prev, empresaId: id }));
    };

    return (
        <div style={{ padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                        <Users className="text-primary" size={32} />
                        Gestión de Usuarios
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>Administra los accesos de usuarios de CEMOSA y externos</p>
                </div>
                <Button onClick={() => {
                    setEditingUser(null);
                    setFormData({ nombre: '', email: '', tipo: 'CEMOSA', empresaId: '' });
                    setIsUserModalOpen(true);
                }}>
                    <Plus size={18} /> Nuevo Usuario
                </Button>
            </div>

            <Card style={{ backgroundColor: 'white' }}>
                <div className="table-container" style={{ margin: 0 }}>
                    <table className="table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Tipo</th>
                                <th>Empresa</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No hay usuarios registrados
                                    </td>
                                </tr>
                            ) : usuarios.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ fontWeight: 500, color: 'var(--color-primary-dark)' }}>{u.nombre}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            <Mail size={14} /> {u.email}
                                        </div>
                                    </td>
                                    <td>
                                        <Badge status={u.tipo === 'CEMOSA' ? 'en-curso' : 'solicitud'}>{u.tipo}</Badge>
                                    </td>
                                    <td>
                                        {u.tipo === 'Externo' && u.empresaId ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                                <Building2 size={14} /> {getEmpresa(u.empresaId)?.razonSocial || 'Desconocida'}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button onClick={() => handleEdit(u)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(u.id)} className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} title="Borrar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isUserModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
                    padding: '1rem'
                }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
                        <div className="card-header flex justify-between items-center">
                            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleSaveUser}>
                            <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Nombre Completo</label>
                                    <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="input-field" placeholder="Ej. Ana Sánchez" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Correo Electrónico</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="ejemplo@correo.com" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Tipo de Usuario</label>
                                    <select
                                        required
                                        value={formData.tipo}
                                        onChange={e => setFormData({ ...formData, tipo: e.target.value, empresaId: e.target.value === 'CEMOSA' ? '' : formData.empresaId })}
                                        className="input-field"
                                        style={{ backgroundColor: 'white' }}
                                    >
                                        <option value="CEMOSA">Personal CEMOSA</option>
                                        <option value="Externo">Externo (Contratista, Promotor...)</option>
                                    </select>
                                </div>

                                {formData.tipo === 'Externo' && (
                                    <div className="input-group">
                                        <label className="input-label">Empresa</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select
                                                required={formData.tipo === 'Externo'}
                                                value={formData.empresaId}
                                                onChange={e => setFormData({ ...formData, empresaId: e.target.value })}
                                                className="input-field"
                                                style={{ backgroundColor: 'white', flex: 1 }}
                                            >
                                                <option value="" disabled>Seleccionar Empresa...</option>
                                                {empresas.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
                                                ))}
                                            </select>
                                            <Button type="button" variant="outline" onClick={() => setIsEmpresaModalOpen(true)}>
                                                + Nueva
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="card-footer flex justify-end gap-4" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                                <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEmpresaModalOpen && (
                <EmpresaModal
                    onClose={() => setIsEmpresaModalOpen(false)}
                    onSave={handleSaveEmpresa}
                />
            )}
        </div>
    );
}
