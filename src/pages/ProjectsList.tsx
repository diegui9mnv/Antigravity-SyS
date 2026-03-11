import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, FileSpreadsheet, MapPinned, Plus, Search, Trash2 } from 'lucide-react';
import { deleteObra, getObras, type Obra } from '../lib/api/obras';
import { getEmpresas, getPersonas, type Empresa, type Persona } from '../lib/api/agenda';
import { Badge, Button, MultiSelect } from '../components/ui';
import CreateProjectModal from '../components/CreateProjectModal';

const normalizeObraStatus = (status: string | null | undefined): 'solicitud' | 'preparacion' | 'completada' => {
    const value = (status || '').trim().toLowerCase();
    if (value === 'completada') return 'completada';
    if (value === 'preparación' || value === 'preparacion' || value === 'en curso') return 'preparacion';
    return 'solicitud';
};

const formatObraStatus = (status: string | null | undefined): string => {
    const normalized = normalizeObraStatus(status);
    if (normalized === 'preparacion') return 'Preparación';
    if (normalized === 'completada') return 'Completada';
    return 'Solicitud';
};

const badgeStatusForObra = (status: string | null | undefined): 'solicitud' | 'en curso' | 'completada' => {
    const normalized = normalizeObraStatus(status);
    return normalized === 'preparacion' ? 'en curso' : normalized;
};

const toIdArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value === null || value === undefined || value === '') return [];
    return [value];
};

type ProjectFilters = {
    denominacion: string;
    municipio: string;
    expediente: string;
    cebe: string;
    estado: string;
    contratistaIds: string[];
    coordinadorSysIds: string[];
};

export default function ProjectsList() {
    const navigate = useNavigate();
    const [obras, setObras] = useState<Obra[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingObra, setEditingObra] = useState<Obra | null>(null);

    const [filters, setFilters] = useState<ProjectFilters>({
        denominacion: '',
        municipio: '',
        expediente: '',
        cebe: '',
        estado: '',
        contratistaIds: [],
        coordinadorSysIds: [],
    });

    useEffect(() => {
        loadObras();
        loadAgenda();
    }, []);

    const loadObras = async () => {
        try {
            const data = await getObras();
            data.sort((a: any, b: any) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
            setObras(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadAgenda = async () => {
        try {
            const [empresasData, personasData] = await Promise.all([getEmpresas(), getPersonas()]);
            setEmpresas(empresasData);
            setPersonas(personasData);
        } catch (error) {
            console.error('Error loading agenda for filters:', error);
        }
    };

    const handleCreated = () => {
        loadObras();
        setIsModalOpen(false);
        setEditingObra(null);
    };

    const handleDelete = async (e: React.MouseEvent, id: string, denominacion: string) => {
        e.stopPropagation();
        if (window.confirm(`¿Estás seguro de querer eliminar la obra "${denominacion}"? Esto no se puede deshacer.`)) {
            try {
                await deleteObra(id);
                loadObras();
            } catch {
                alert('Error al eliminar obra');
            }
        }
    };

    const openEditModal = (e: React.MouseEvent, obra: Obra) => {
        e.stopPropagation();
        setEditingObra(obra);
        setIsModalOpen(true);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const filteredObras = obras.filter((obra: any) => {
        const contratistas = toIdArray(obra?.contratista_ids ?? obra?.contratistaId);
        const coordinadores = toIdArray(obra?.coordinador_sys_ids ?? obra?.coordinadorSysId);

        return (
            obra.denominacion.toLowerCase().includes(filters.denominacion.toLowerCase())
            && (obra.municipio || '').toLowerCase().includes(filters.municipio.toLowerCase())
            && (obra.expediente || '').toLowerCase().includes(filters.expediente.toLowerCase())
            && (obra.cebe || '').toLowerCase().includes(filters.cebe.toLowerCase())
            && (filters.estado === '' || normalizeObraStatus(obra.estado) === filters.estado)
            && (
                filters.contratistaIds.length === 0
                || filters.contratistaIds.some((id) => contratistas.includes(id))
            )
            && (
                filters.coordinadorSysIds.length === 0
                || filters.coordinadorSysIds.some((id) => coordinadores.includes(id))
            )
        );
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1>Gestión de Obras</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Administra tus proyectos y su documentación técnica.</p>
                </div>
                <div className="projects-list-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Button variant="outline" onClick={() => navigate('/obras/localizacion')}>
                        <MapPinned size={18} />
                        Localización de Obras
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/obras/seguimiento-excel')}>
                        <FileSpreadsheet size={18} />
                        Seguimiento Excel
                    </Button>
                    <Button onClick={() => { setEditingObra(null); setIsModalOpen(true); }}>
                        <Plus size={18} />
                        Nueva Obra
                    </Button>
                </div>
            </div>

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
                    <div className="input-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                        <label className="input-label">CEBE</label>
                        <input name="cebe" value={filters.cebe} onChange={handleFilterChange} className="input-field" placeholder="Filtrar CEBE..." style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                        <label className="input-label">Estado</label>
                        <select name="estado" value={filters.estado} onChange={handleFilterChange} className="input-field" style={{ backgroundColor: 'white', width: '100%' }}>
                            <option value="">Todos</option>
                            <option value="solicitud">Solicitud</option>
                            <option value="preparacion">Preparación</option>
                            <option value="completada">Completada</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                        <label className="input-label">Contratista</label>
                        <MultiSelect
                            options={empresas.map((empresa) => ({ value: empresa.id, label: empresa.razon_social }))}
                            value={filters.contratistaIds}
                            onChange={(value: string[]) => setFilters((prev) => ({ ...prev, contratistaIds: value }))}
                            placeholder="Todos"
                        />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                        <label className="input-label">Coordinador SyS</label>
                        <MultiSelect
                            options={personas
                                .filter((persona) => persona.tipo === 'Coordinador SyS')
                                .map((persona) => ({ value: persona.id, label: `${persona.nombre} ${persona.apellidos || ''}`.trim() }))}
                            value={filters.coordinadorSysIds}
                            onChange={(value: string[]) => setFilters((prev) => ({ ...prev, coordinadorSysIds: value }))}
                            placeholder="Todos"
                        />
                    </div>
                </div>
            </div>

            <div className="table-container fade-in">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Denominación</th>
                            <th>Municipio</th>
                            <th>Exp./CEBE</th>
                            <th>Código</th>
                            <th>Estado</th>
                            <th>Fechas</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredObras.length > 0 ? (
                            filteredObras.map((obra) => (
                                <tr key={obra.id} onClick={() => navigate(`/obra/${obra.id}`)} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontWeight: 500, color: 'var(--color-primary-dark)' }}>{obra.denominacion}</td>
                                    <td>{obra.municipio || '-'}</td>
                                    <td>
                                        <div>{obra.expediente || '-'}</div>
                                        {obra.cebe && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CEBE: {obra.cebe}</div>}
                                    </td>
                                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{obra.codigo_obra || '-'}</span></td>
                                    <td>
                                        <Badge status={badgeStatusForObra(obra.estado)}>{formatObraStatus(obra.estado)}</Badge>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {obra.fecha_inicio} <br /> {obra.fecha_fin}
                                    </td>
                                    <td className="projects-actions-cell">
                                        <div className="actions-cell projects-actions-group">
                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/obras/localizacion?obraId=${obra.id}`); }} className="btn btn-ghost project-list-action-btn" style={{ color: 'var(--color-primary)' }} title="Ver Localización">
                                                <MapPinned size={18} />
                                            </button>
                                            <button onClick={(e) => openEditModal(e, obra)} className="btn btn-ghost project-list-action-btn" style={{ color: 'var(--text-main)' }} title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={(e) => handleDelete(e, obra.id, obra.denominacion)} className="btn btn-ghost project-list-action-btn" style={{ color: '#ef4444' }} title="Borrar">
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

