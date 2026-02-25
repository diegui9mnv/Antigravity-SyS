import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2, Users } from 'lucide-react';
import { getEmpresas, saveEmpresa, updateEmpresa, deleteEmpresa, getPersonas, savePersona, updatePersona, deletePersona } from '../store';
import { Button } from '../components/ui';

import { EmpresaModal, PersonaModal } from '../components/ContactModals';

export default function Agenda() {
    const [activeTab, setActiveTab] = useState<'empresas' | 'personas'>('empresas');
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [personas, setPersonas] = useState<any[]>([]);

    const [editingEmpresa, setEditingEmpresa] = useState<any | null>(null);
    const [showEmpresaModal, setShowEmpresaModal] = useState(false);

    const [editingPersona, setEditingPersona] = useState<any | null>(null);
    const [showPersonaModal, setShowPersonaModal] = useState(false);

    const loadData = () => {
        setEmpresas(getEmpresas());
        setPersonas(getPersonas());
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveEmpresa = (data: any) => {
        if (editingEmpresa) {
            updateEmpresa(editingEmpresa.id, data);
        } else {
            saveEmpresa({ ...data, id: `emp-${Date.now()}` });
        }
        setShowEmpresaModal(false);
        setEditingEmpresa(null);
        loadData();
    };

    const handleDeleteEmpresa = (id: string) => {
        if (confirm("¿Seguro que quieres eliminar esta empresa?")) {
            deleteEmpresa(id);
            loadData();
        }
    };

    const handleSavePersona = (data: any) => {
        if (editingPersona) {
            updatePersona(editingPersona.id, data);
        } else {
            savePersona({ ...data, id: `per-${Date.now()}` });
        }
        setShowPersonaModal(false);
        setEditingPersona(null);
        loadData();
    };

    const handleDeletePersona = (id: string) => {
        if (confirm("¿Seguro que quieres eliminar esta persona?")) {
            deletePersona(id);
            loadData();
        }
    };

    const getEmpresaName = (id: string) => {
        return empresas.find(e => e.id === id)?.razonSocial || 'Desconocida';
    };

    return (
        <div className="page-container animate-fade-in" style={{ padding: '2rem 0' }}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users size={28} style={{ color: 'var(--primary)' }} />
                    Agenda de Contactos
                </h1>

                {activeTab === 'empresas' ? (
                    <Button onClick={() => { setEditingEmpresa(null); setShowEmpresaModal(true); }} className="flex items-center gap-2">
                        <Plus size={18} /> Nueva Empresa
                    </Button>
                ) : (
                    <Button onClick={() => { setEditingPersona(null); setShowPersonaModal(true); }} className="flex items-center gap-2">
                        <Plus size={18} /> Nueva Persona
                    </Button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                <button
                    onClick={() => setActiveTab('empresas')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'empresas' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'empresas' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                    <Building2 size={18} /> Empresas
                </button>
                <button
                    onClick={() => setActiveTab('personas')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'personas' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'personas' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                    <Users size={18} /> Personas
                </button>
            </div>

            {activeTab === 'empresas' && (
                <div className="card">
                    <div className="table-responsive">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Razón Social</th>
                                    <th style={{ textAlign: 'left' }}>Dirección</th>
                                    <th style={{ textAlign: 'left' }}>Teléfono</th>
                                    <th style={{ textAlign: 'left' }}>Correo Electrónico</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empresas.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No hay empresas registradas
                                        </td>
                                    </tr>
                                )}
                                {empresas.map(emp => (
                                    <tr key={emp.id} className="hover:bg-gray-50">
                                        <td><strong>{emp.razonSocial}</strong></td>
                                        <td>{emp.direccion}</td>
                                        <td>{emp.telefono}</td>
                                        <td>{emp.correo}</td>
                                        <td>
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setEditingEmpresa(emp); setShowEmpresaModal(true); }} className="btn-icon text-gray-500 hover:text-primary">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteEmpresa(emp.id)} className="btn-icon text-gray-500 hover:text-red-500">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'personas' && (
                <div className="card">
                    <div className="table-responsive">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Nombre</th>
                                    <th style={{ textAlign: 'left' }}>Apellidos</th>
                                    <th style={{ textAlign: 'left' }}>Tipo</th>
                                    <th style={{ textAlign: 'left' }}>Empresa</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personas.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No hay personas registradas
                                        </td>
                                    </tr>
                                )}
                                {personas.map(per => (
                                    <tr key={per.id} className="hover:bg-gray-50">
                                        <td><strong>{per.nombre}</strong></td>
                                        <td>{per.apellidos}</td>
                                        <td><span className="badge badge-en-curso">{per.tipo}</span></td>
                                        <td>{getEmpresaName(per.empresaId)}</td>
                                        <td>
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setEditingPersona(per); setShowPersonaModal(true); }} className="btn-icon text-gray-500 hover:text-primary">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDeletePersona(per.id)} className="btn-icon text-gray-500 hover:text-red-500">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showEmpresaModal && (
                <EmpresaModal initialData={editingEmpresa} onClose={() => { setShowEmpresaModal(false); setEditingEmpresa(null); }} onSave={handleSaveEmpresa} />
            )}

            {showPersonaModal && (
                <PersonaModal initialData={editingPersona} empresas={empresas} onClose={() => { setShowPersonaModal(false); setEditingPersona(null); }} onSave={handleSavePersona} />
            )}

        </div>
    );
}
