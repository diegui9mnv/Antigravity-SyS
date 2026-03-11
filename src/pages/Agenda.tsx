import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Users } from 'lucide-react';
import { getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa, getPersonas, createPersona, updatePersona, deletePersona, type Empresa, type Persona } from '../lib/api/agenda';
import { Button } from '../components/ui';

import { EmpresaModal, PersonaModal } from '../components/ContactModals';

export default function Agenda() {
    const [activeTab, setActiveTab] = useState<'empresas' | 'personas'>('empresas');
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);

    const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
    const [showEmpresaModal, setShowEmpresaModal] = useState(false);

    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
    const [showPersonaModal, setShowPersonaModal] = useState(false);

    const loadData = async () => {
        try {
            const [emps, pers] = await Promise.all([getEmpresas(), getPersonas()]);
            setEmpresas(emps);
            setPersonas(pers);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveEmpresa = async (data: any) => {
        try {
            if (editingEmpresa?.id) {
                await updateEmpresa(editingEmpresa.id, data);
            } else {
                await createEmpresa(data);
            }
            setShowEmpresaModal(false);
            setEditingEmpresa(null);
            loadData();
        } catch (error) {
            alert('Error al guardar la empresa');
        }
    };

    const handleDeleteEmpresa = async (id: string) => {
        if (confirm("¿Seguro que quieres eliminar esta empresa?")) {
            try {
                await deleteEmpresa(id);
                loadData();
            } catch (error) {
                alert('Error al eliminar la empresa');
            }
        }
    };

    const handleSavePersona = async (data: any) => {
        try {
            const payload = {
                ...data,
                correo: data?.correo || null,
                empresa_id: data?.empresa_id || null,
            };
            if (editingPersona?.id) {
                await updatePersona(editingPersona.id, payload);
            } else {
                await createPersona(payload);
            }
            setShowPersonaModal(false);
            setEditingPersona(null);
            loadData();
        } catch (error) {
            alert('Error al guardar la persona');
        }
    };

    const handleDeletePersona = async (id: string) => {
        if (confirm("¿Seguro que quieres eliminar esta persona?")) {
            try {
                await deletePersona(id);
                loadData();
            } catch (error) {
                alert('Error al eliminar la persona');
            }
        }
    };

    const getEmpresaName = (id: string | null) => {
        if (!id) return '-';
        return empresas.find(e => e.id === id)?.razon_social || 'Desconocida';
    };

    return (
        <>
            <div className="page-container animate-fade-in" style={{ padding: '2rem 0' }}>
                <div className="flex justify-between items-center mb-6 agenda-header" style={{ gap: '1rem', flexWrap: 'wrap' }}>
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

                <div className="agenda-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
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
                        <div className="table-container" style={{ margin: 0 }}>
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
                                    {empresas.map((emp: Empresa) => (
                                        <tr key={emp.id} className="hover:bg-gray-50">
                                            <td><strong>{emp.razon_social}</strong></td>
                                            <td>{emp.direccion}</td>
                                            <td>{emp.telefono}</td>
                                            <td>{emp.correo}</td>
                                            <td>
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="ghost" onClick={() => { setEditingEmpresa(emp); setShowEmpresaModal(true); }} style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar">
                                                        <Edit2 size={18} />
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => handleDeleteEmpresa(emp.id)} style={{ padding: '0.4rem', color: '#ef4444' }} title="Borrar">
                                                        <Trash2 size={18} />
                                                    </Button>
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
                        <div className="table-container" style={{ margin: 0 }}>
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Nombre</th>
                                        <th style={{ textAlign: 'left' }}>Apellidos</th>
                                        <th style={{ textAlign: 'left' }}>Tipo</th>
                                        <th style={{ textAlign: 'left' }}>Correo Electrónico</th>
                                        <th style={{ textAlign: 'left' }}>Empresa</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {personas.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                No hay personas registradas
                                            </td>
                                        </tr>
                                    )}
                                    {personas.map((per: Persona) => (
                                        <tr key={per.id} className="hover:bg-gray-50">
                                            <td><strong>{per.nombre}</strong></td>
                                            <td>{per.apellidos}</td>
                                            <td><span className="badge badge-en-curso">{per.tipo}</span></td>
                                            <td>{per.correo || '-'}</td>
                                            <td>{getEmpresaName(per.empresa_id)}</td>
                                            <td>
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="ghost" onClick={() => { setEditingPersona(per); setShowPersonaModal(true); }} style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar">
                                                        <Edit2 size={18} />
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => handleDeletePersona(per.id)} style={{ padding: '0.4rem', color: '#ef4444' }} title="Borrar">
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showEmpresaModal && (
                <EmpresaModal
                    initialData={editingEmpresa}
                    onClose={() => { setShowEmpresaModal(false); setEditingEmpresa(null); }}
                    onSave={handleSaveEmpresa}
                />
            )}

            {showPersonaModal && (
                <PersonaModal
                    initialData={editingPersona}
                    empresas={empresas}
                    onClose={() => { setShowPersonaModal(false); setEditingPersona(null); }}
                    onSave={handleSavePersona}
                />
            )}
        </>
    );
}
