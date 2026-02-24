import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { getObras, initStore, deleteObra } from '../store';
import { Badge, Button } from '../components/ui';
import CreateProjectModal from '../components/CreateProjectModal';

export default function ProjectsList() {
    const [obras, setObras] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingObra, setEditingObra] = useState<any>(null);

    const [filters, setFilters] = useState({
        denominacion: '',
        municipio: '',
        expediente: '',
        estado: ''
    });

    useEffect(() => {
        initStore();
        loadObras();
    }, []);

    const loadObras = () => {
        setObras(getObras());
    };

    const handleCreated = () => {
        loadObras();
        setIsModalOpen(false);
        setEditingObra(null);
    };

    const handleDelete = (id: string, denominacion: string) => {
        if (window.confirm(`¿Estás seguro de querer eliminar la obra "${denominacion}"? Esto no se puede deshacer.`)) {
            deleteObra(id);
            loadObras();
        }
    };

    const openEditModal = (obra: any) => {
        setEditingObra(obra);
        setIsModalOpen(true);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredObras = obras.filter(obra => {
        return (
            obra.denominacion.toLowerCase().includes(filters.denominacion.toLowerCase()) &&
            obra.municipio.toLowerCase().includes(filters.municipio.toLowerCase()) &&
            obra.expediente.toLowerCase().includes(filters.expediente.toLowerCase()) &&
            (filters.estado === '' || obra.estado === filters.estado)
        );
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>Gestión de Obras</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Administra tus proyectos y su documentación técnica.</p>
                </div>
                <Button onClick={() => { setEditingObra(null); setIsModalOpen(true); }}>
                    <Plus size={18} />
                    Nueva Obra
                </Button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label className="input-label">Denominación</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input name="denominacion" value={filters.denominacion} onChange={handleFilterChange} className="input-field" placeholder="Buscar..." style={{ paddingLeft: '2.25rem', width: '100%' }} />
                        </div>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                        <label className="input-label">Municipio</label>
                        <input name="municipio" value={filters.municipio} onChange={handleFilterChange} className="input-field" placeholder="Ej. Madrid" style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                        <label className="input-label">Expediente</label>
                        <input name="expediente" value={filters.expediente} onChange={handleFilterChange} className="input-field" placeholder="Ej. EXP-..." style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                        <label className="input-label">Estado</label>
                        <select name="estado" value={filters.estado} onChange={handleFilterChange} className="input-field" style={{ backgroundColor: 'white', width: '100%' }}>
                            <option value="">Todos</option>
                            <option value="solicitud">Solicitud</option>
                            <option value="en curso">En Curso</option>
                            <option value="completada">Completada</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-container fade-in">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Denominación</th>
                            <th>Municipio</th>
                            <th>Expediente</th>
                            <th>Código</th>
                            <th>Estado</th>
                            <th>Fechas</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredObras.length > 0 ? (
                            filteredObras.map(obra => (
                                <tr key={obra.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--color-primary-dark)' }}>{obra.denominacion}</td>
                                    <td>{obra.municipio}</td>
                                    <td>{obra.expediente}</td>
                                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{obra.codigoObra}</span></td>
                                    <td><Badge status={obra.estado}>{obra.estado}</Badge></td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {obra.fechaInicio} <br /> {obra.fechaFin}
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <Link to={`/obra/${obra.id}`} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} title="Ver Documentación">
                                                <FolderOpen size={18} />
                                            </Link>
                                            <button onClick={() => openEditModal(obra)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(obra.id, obra.denominacion)} className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} title="Borrar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                    No se encontraron obras que coincidan con los filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <CreateProjectModal
                    onClose={() => { setIsModalOpen(false); setEditingObra(null); }}
                    onCreated={handleCreated}
                    initialData={editingObra}
                />
            )}
        </div>
    );
}
