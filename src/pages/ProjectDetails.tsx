import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Folders, File as FileIcon, UploadCloud, Trash2, Users, FileText, Building2, FileBadge, Shield, Menu, Calendar, Mail, FileStack, Briefcase } from 'lucide-react';
import { getObra, updateObra, fileStructureTemplate, getFiles, addFile, deleteReunion, getReuniones, saveReunion, updateReunion, deleteVisita, getVisitas, saveVisita, updateVisita, getEmpresa, getPersona, getContactosBase, getLibroSubcontratas, deleteLibroSubcontrata, saveLibroSubcontrata, deleteFile } from '../store';
import { Card, Badge, Button } from '../components/ui';
import { useDropzone } from 'react-dropzone';
import { EventModal } from '../components/EventModal';
import { EventReport } from '../components/EventReport';
import { EmpresaModal, PersonaModal } from '../components/ContactModals';
import { LibroSubcontrataModal } from '../components/LibroSubcontrataModal';

// Recursive component for rendering the document tree
const DocumentTreeNode = ({ node, level = 0, activeCategoryId, onSelectCategory, activeFolder, setFolderStack }: any) => {
    // Determine icon based on node name
    let NodeIcon = Folders;
    if (node.name.includes("Contactos")) NodeIcon = Users;
    else if (node.name.includes("Contratistas")) NodeIcon = Building2;
    else if (node.name.includes("Informes")) NodeIcon = FileText;
    else if (node.name.includes("Siniestralidad")) NodeIcon = Shield;
    else if (node.name.includes("PSS/DGP")) NodeIcon = FileBadge;
    else if (node.name.includes("Documentación") || node.name.includes("Proyecto")) NodeIcon = FileStack;
    else if (node.name.includes("Comunicados")) NodeIcon = Mail;
    else if (node.name.includes("Gestión")) NodeIcon = Briefcase;
    else if (node.name.includes("Visitas") || node.name.includes("Reuniones") || node.name.includes("Anotaciones")) NodeIcon = Calendar;
    else if (node.type === 'category') NodeIcon = FileIcon;

    // We only show root items here. Nested items are handled in the Content Area.
    if (level > 0) return null;

    const paddingLeft = `1rem`;

    const isCategory = node.type === 'category';
    const isActive = activeCategoryId === node.id;
    const isFolderActive = activeFolder?.id === node.id;

    const handleClick = () => {
        if (isCategory) {
            onSelectCategory(node);
            setFolderStack([]); // Clear stack when clicking a root category
        } else {
            setFolderStack([node]); // Set this folder as the active view
            onSelectCategory(null);
        }
    };

    return (
        <div style={{ userSelect: 'none' }}>
            <div
                onClick={handleClick}
                style={{
                    padding: `0.5rem 1rem 0.5rem ${paddingLeft}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: (isActive || isFolderActive) ? 'var(--color-surface-hover)' : 'transparent',
                    color: (isActive || isFolderActive) ? 'var(--color-primary-dark)' : 'var(--text-main)',
                    fontWeight: (isActive || isFolderActive) ? 600 : 400,
                    borderLeft: (isActive || isFolderActive) ? '3px solid var(--color-primary)' : '3px solid transparent',
                    transition: 'all var(--transition-fast)'
                }}
                className="hover:bg-surface"
            >
                {isCategory ? (
                    <NodeIcon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                ) : (
                    <NodeIcon size={16} style={{ color: 'var(--color-primary)' }} />
                )}
                <span style={{ fontSize: '0.875rem' }}>{node.name}</span>
            </div>
        </div>
    );
};

export default function ProjectDetails() {
    const { id } = useParams<{ id: string }>();
    const [obra, setObra] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<any>(null);
    const [folderStack, setFolderStack] = useState<any[]>([]); // Track folder drill-down
    const [files, setFiles] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [reuniones, setReuniones] = useState<any[]>([]);
    const [visitas, setVisitas] = useState<any[]>([]);
    const [libroSubcontratas, setLibroSubcontratas] = useState<any[]>([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [activeEvent, setActiveEvent] = useState<any>(null);

    // Contactos View State
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
    const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
    const [isLibroModalOpen, setIsLibroModalOpen] = useState(false);
    const [allPersonas, setAllPersonas] = useState<any[]>([]);
    const [allEmpresas, setAllEmpresas] = useState<any[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [assignedContacts, setAssignedContacts] = useState<any[]>([]);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);

    const loadObraData = () => {
        if (id) {
            const ob = getObra(id);
            setObra(ob);
            setAssignedContacts(ob?.agentes || []);
            const baseContacts = getContactosBase();
            setAllPersonas(baseContacts.personas || []);
            setAllEmpresas(baseContacts.empresas || []);
        }
    };

    useEffect(() => {
        loadObraData();
    }, [id]);

    useEffect(() => {
        if (id && activeCategory) {
            setFiles(getFiles(id, activeCategory.id));
            if (activeCategory.id === 'cat-reuniones') {
                setReuniones(getReuniones(id));
            } else if (activeCategory.id === 'cat-visitas') {
                setVisitas(getVisitas(id));
            } else if (activeCategory.id === 'cat-libro-subcontrata') {
                setLibroSubcontratas(getLibroSubcontratas(id));
            }
        } else {
            setFiles([]);
            setReuniones([]);
            setVisitas([]);
            setLibroSubcontratas([]);
        }
    }, [id, activeCategory]);

    // Helper to get all files for a given folder by reading its descendants
    const getAllFolderFiles = (folder: any) => {
        let allFiles: any[] = [];
        const processNode = (node: any, path: string) => {
            if (node.type === 'category') {
                const categoryFiles = getFiles(id!, node.id).map((f: any) => ({ ...f, path: `${path} / ${node.name}` }));
                allFiles = [...allFiles, ...categoryFiles];
            } else if (node.children) {
                node.children.forEach((child: any) => processNode(child, path === '' ? node.name : `${path} / ${node.name}`));
            }
        };
        processNode(folder, '');
        return allFiles;
    };

    const onDrop = (acceptedFiles: File[]) => {
        if (!id || !activeCategory) return;

        acceptedFiles.forEach(file => {
            const newFileObj = {
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                size: file.size,
                uploadDate: new Date().toISOString().split('T')[0]
            };
            addFile(id, activeCategory.id, newFileObj);
        });

        // Refresh files
        setFiles(getFiles(id, activeCategory.id));
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleSaveEvent = (tipo: 'reunion' | 'visita', record: any) => {
        if (!id) return;
        if (tipo === 'reunion') {
            saveReunion(id!, record);
            setReuniones(getReuniones(id!));
        } else {
            saveVisita(id!, record);
            setVisitas(getVisitas(id!));
        }
        setIsEventModalOpen(false);
    };

    const handleSaveEventReport = (eventId: string, updatedData: any) => {
        if (activeCategory?.id === 'cat-reuniones') {
            updateReunion(id!, eventId, updatedData);
            setReuniones(getReuniones(id!));
        } else {
            updateVisita(id!, eventId, updatedData);
            setVisitas(getVisitas(id!));
        }
        setActiveEvent(null);
    };

    const handleAssignAgent = (type: 'persona' | 'empresa', agentId: string) => {
        if (!agentId) return;
        const newContact = { id: `agt-${Date.now()}`, agentId, type, role: 'Colaborador' };
        const updated = [...assignedContacts, newContact];
        setAssignedContacts(updated);
        updateObra(obra.id, { agentes: updated });
    };

    const handleRemoveAgent = (agentRefId: string) => {
        if (window.confirm("¿Retirar asignación?")) {
            const updated = assignedContacts.filter(c => c.id !== agentRefId);
            setAssignedContacts(updated);
            updateObra(obra.id, { agentes: updated });
        }
    };

    const getProjectGlobalFiles = () => {
        let allProjectFiles: any[] = [];
        fileStructureTemplate.forEach(node => {
            allProjectFiles = [...allProjectFiles, ...getAllFolderFiles(node)];
        });
        return allProjectFiles;
    };

    // Helper to get current folder or category
    const activeFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
    const folderGlobalFiles = activeFolder && !activeCategory ? getAllFolderFiles(activeFolder) : [];
    const projectGlobalFiles = !activeCategory && !activeFolder ? getProjectGlobalFiles() : [];

    const formatAgentName = (agentId: string, type: 'persona' | 'empresa') => {
        if (type === 'persona') {
            const persona = getPersona(agentId);
            return persona ? `${persona.nombre} ${persona.apellidos}` : 'Desconocido';
        } else {
            const empresa = getEmpresa(agentId);
            return empresa ? empresa.razonSocial : 'Desconocido';
        }
    };

    const renderAgentsBadges = (ids: string | string[] | undefined, label: string, type: 'empresa' | 'persona') => {
        if (!ids) return null;
        const idsArray = Array.isArray(ids) ? ids : [ids];
        if (idsArray.length === 0) return null;
        return idsArray.map((id, index) => (
            <span key={`${id}-${index}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'white' }}>
                {label}: {formatAgentName(id, type)}
            </span>
        ));
    };

    if (!obra) return <div className="container" style={{ padding: '2rem 0' }}>Cargando obra...</div>;

    const renderFileItem = (f: { id: string, name: string, categoryId?: string, path?: string, size: number, uploadDate: string }, isGlobal: boolean = false) => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <FileIcon size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{f.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {isGlobal && f.path && (
                            <>
                                <span style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>{f.path}</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{formatSize(f.size)}</span>
                        <span>•</span>
                        <span>Subido: {f.uploadDate}</span>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button variant="ghost" style={{ color: '#ef4444', padding: '0.5rem' }} onClick={() => {
                    if (window.confirm("¿Eliminar archivo?")) {
                        const targetCat = isGlobal ? f.categoryId : activeCategory?.id;
                        if (targetCat) {
                            deleteFile(id!, targetCat, f.id);
                            // Refresh files
                            if (isGlobal) {
                                // Just force a re-render or refetch folder global files by updating state dummy. Wait, easiest is reloading files
                                setFiles(getFiles(id!, activeCategory?.id || ''));
                            } else {
                                setFiles(getFiles(id!, activeCategory.id));
                            }
                        }
                    }
                }}>
                    <Trash2 size={16} />
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <ArrowLeft size={16} /> Volver a Obras
                    </Link>
                    {!isSidebarOpen && (
                        <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(true)} style={{ display: 'flex', gap: '0.5rem' }}>
                            <Menu size={16} /> Mostrar Árbol
                        </Button>
                    )}
                </div>

                <div className="flex justify-between items-start" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{obra.denominacion}</h1>
                            <Badge status={obra.estado}>{obra.estado}</Badge>
                        </div>
                        <div className="flex gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            <span>Ref: {obra.codigoObra}</span>
                            <span>Exp: {obra.expediente}</span>
                        </div>
                        {/* Agents */}
                        <div className="flex flex-wrap gap-2">
                            {renderAgentsBadges(obra.promotorId, 'Promotor', 'empresa')}
                            {renderAgentsBadges(obra.contratistaId, 'Contratista', 'empresa')}
                            {renderAgentsBadges(obra.directorObraId, 'Dir. Obra', 'persona')}
                            {renderAgentsBadges(obra.coordinadorSysId, 'Coord. SyS', 'persona')}
                            {renderAgentsBadges(obra.jefeObraId, 'Jefe Obra', 'persona')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isSidebarOpen ? 'minmax(280px, 1fr) 3fr' : '1fr', gap: '2rem', height: 'calc(100vh - 220px)', minHeight: '600px', transition: 'all 0.3s ease' }}>
                    {/* Document Tree Sidebar */}
                    {isSidebarOpen && (
                        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header flex justify-between items-center" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                <button
                                    onClick={() => {
                                        setActiveCategory(null);
                                        setFolderStack([]);
                                        setActiveEvent(null);
                                    }}
                                    style={{
                                        fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-dark)',
                                        fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                                        outline: 'none'
                                    }}
                                    className="hover:bg-slate-100 transition-colors"
                                    title="Ir al resumen global"
                                >
                                    <Folders size={18} /> Árbol Documental
                                </button>
                                <button className="btn-icon" onClick={() => setIsSidebarOpen(false)} title="Ocultar panel">
                                    <Menu size={18} />
                                </button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                                {fileStructureTemplate.map((node) => (
                                    <DocumentTreeNode
                                        key={node.id}
                                        node={node}
                                        activeCategoryId={activeCategory?.id}
                                        onSelectCategory={setActiveCategory}
                                        activeFolder={folderStack.length > 0 ? folderStack[0] : null}
                                        setFolderStack={setFolderStack}
                                    />
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Content Area */}
                    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {activeEvent ? (
                            <div style={{ height: '100%', padding: '1.5rem', overflowY: 'auto' }}>
                                {/* We need to implement EventReport logic mapping here */}
                                <EventReport
                                    tipo={activeCategory?.id === 'cat-reuniones' ? 'reunion' : 'visita'}
                                    eventData={activeEvent}
                                    obra={obra}
                                    assignedContacts={assignedContacts}
                                    formatAgentName={formatAgentName}
                                    onClose={() => setActiveEvent(null)}
                                    onSave={handleSaveEventReport}
                                />
                            </div>
                        ) : (!activeCategory && activeFolder) ? (
                            <>
                                <div className="card-header" style={{ backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        {(activeFolder || folderStack.length > 0) && (
                                            <button
                                                onClick={() => {
                                                    if (folderStack.length > 1) {
                                                        setFolderStack(folderStack.slice(0, -1));
                                                    } else {
                                                        setFolderStack([]);
                                                    }
                                                    setActiveEvent(null);
                                                }}
                                                className="btn-icon" style={{ padding: '0.25rem' }}
                                            >
                                                <ArrowLeft size={16} />
                                            </button>
                                        )}
                                        <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                                            {activeFolder.name}
                                        </h3>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Selecciona una categoría para ver o subir archivos.</p>
                                </div>
                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                        {activeFolder.children?.map((child: any) => (
                                            <Card
                                                key={child.id}
                                                className="flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-surface-hover transition-colors"
                                                onClick={() => {
                                                    if (child.type === 'category') {
                                                        setActiveCategory(child);
                                                    } else {
                                                        setFolderStack([...folderStack, child]);
                                                    }
                                                }}
                                            >
                                                {child.type === 'category' ? (
                                                    <FileIcon size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                                                ) : (
                                                    <Folders size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                                                )}
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500, textAlign: 'center' }}>{child.name}</span>
                                            </Card>
                                        ))}
                                    </div>

                                    {folderGlobalFiles.length > 0 && (
                                        <div style={{ marginTop: '2rem' }}>
                                            <h4 style={{ marginBottom: '1rem', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                                Documentos en esta carpeta ({folderGlobalFiles.length})
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {folderGlobalFiles.map(f => renderFileItem(f, true))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (!activeCategory && !activeFolder) ? (
                            <>
                                <div className="card-header" style={{ backgroundColor: 'white' }}>
                                    <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                                        Resumen Global de Archivos
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Muestra todos los documentos de la obra de forma estructurada.</p>
                                </div>
                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                                    {projectGlobalFiles.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {projectGlobalFiles.map(f => renderFileItem(f, true))}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No hay archivos subidos en esta obra.</p>
                                    )}
                                </div>
                            </>
                        ) : activeCategory ? (
                            <>
                                <div className="card-header" style={{ backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <button
                                            onClick={() => {
                                                setActiveCategory(null);
                                                setActiveEvent(null);
                                            }}
                                            className="btn-icon" style={{ padding: '0.25rem' }}
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                        <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                                            {activeCategory.name}
                                        </h3>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sube y gestiona los archivos para esta sección.</p>
                                </div>

                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

                                    {activeCategory.id === 'cat-contactos' ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                                            {/* EMPRESAS COL */}
                                            <Card style={{ backgroundColor: 'var(--color-surface)' }}>
                                                <div className="card-header flex justify-between items-center" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={18} /> Empresas</h4>
                                                    <Button size="sm" variant="outline" onClick={() => setIsEmpresaModalOpen(true)}>+ Nueva</Button>
                                                </div>
                                                <div className="card-body flex flex-col gap-2" style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                                                    {/* Assigned Contratistas as placeholders for now */}
                                                    <div className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <strong>Promotor: </strong>
                                                            <div className="flex flex-col gap-1 mt-1">
                                                                {(Array.isArray(obra.promotorId) ? obra.promotorId : [obra.promotorId]).filter(Boolean).map((id: string) => (
                                                                    <span key={id} className="text-gray-600">• {formatAgentName(id, 'empresa')}</span>
                                                                ))}
                                                                {(!obra.promotorId || (Array.isArray(obra.promotorId) && obra.promotorId.length === 0)) && <span className="text-gray-400">Sin asignar</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <strong>Contratista Principal: </strong>
                                                            <div className="flex flex-col gap-1 mt-1">
                                                                {(Array.isArray(obra.contratistaId) ? obra.contratistaId : [obra.contratistaId]).filter(Boolean).map((id: string) => (
                                                                    <span key={id} className="text-gray-600">• {formatAgentName(id, 'empresa')}</span>
                                                                ))}
                                                                {(!obra.contratistaId || (Array.isArray(obra.contratistaId) && obra.contratistaId.length === 0)) && <span className="text-gray-400">Sin asignar</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Others mapping */}
                                                    {assignedContacts.filter(c => c.type === 'empresa').map((c) => (
                                                        <div key={c.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between group">
                                                            <div>
                                                                <strong>{c.role}: </strong>
                                                                <span className="text-gray-600">{formatAgentName(c.agentId, 'empresa')}</span>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="sm" onClick={() => { setEditingContactId(c.agentId); setIsEmpresaModalOpen(true); }} className="text-blue-500 hover:bg-blue-50" style={{ padding: '4px' }}><Building2 size={16} /></Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveAgent(c.id)} className="text-red-500 hover:bg-red-50" style={{ padding: '4px' }}><Trash2 size={16} /></Button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <div className="mt-2 text-sm flex gap-2">
                                                        <select className="input-field py-1 flex-1" value={selectedEmpresaId} onChange={e => setSelectedEmpresaId(e.target.value)}>
                                                            <option value="" disabled>Seleccione empresa...</option>
                                                            {allEmpresas.map(e => <option key={e.id} value={e.id}>{e.razonSocial}</option>)}
                                                        </select>
                                                        <Button size="sm" onClick={() => { handleAssignAgent('empresa', selectedEmpresaId); setSelectedEmpresaId(''); }}>Asignar</Button>
                                                    </div>
                                                </div>
                                            </Card>

                                            {/* PERSONAS COL */}
                                            <Card style={{ backgroundColor: 'var(--color-surface)' }}>
                                                <div className="card-header flex justify-between items-center" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Personas</h4>
                                                    <Button size="sm" variant="outline" onClick={() => setIsPersonaModalOpen(true)}>+ Nueva</Button>
                                                </div>
                                                <div className="card-body flex flex-col gap-2" style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                                                    {/* Core roles manually listed */}
                                                    <div className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <div className="text-xs text-primary font-bold mb-1"><FileBadge size={14} className="inline mr-1" />Director de Obra</div>
                                                            <div className="flex flex-col gap-1">
                                                                {(Array.isArray(obra.directorObraId) ? obra.directorObraId : [obra.directorObraId]).filter(Boolean).map((id: string) => (
                                                                    <span key={id} className="text-gray-700 font-medium">• {formatAgentName(id, 'persona')}</span>
                                                                ))}
                                                                {(!obra.directorObraId || (Array.isArray(obra.directorObraId) && obra.directorObraId.length === 0)) && <span className="text-gray-400">Sin asignar</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <div className="text-xs text-primary font-bold mb-1"><FileBadge size={14} className="inline mr-1" />Jefe de Obra</div>
                                                            <div className="flex flex-col gap-1">
                                                                {(Array.isArray(obra.jefeObraId) ? obra.jefeObraId : [obra.jefeObraId]).filter(Boolean).map((id: string) => (
                                                                    <span key={id} className="text-gray-700 font-medium">• {formatAgentName(id, 'persona')}</span>
                                                                ))}
                                                                {(!obra.jefeObraId || (Array.isArray(obra.jefeObraId) && obra.jefeObraId.length === 0)) && <span className="text-gray-400">Sin asignar</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <div className="text-xs text-primary font-bold mb-1"><Shield size={14} className="inline mr-1" />Coordinador SyS</div>
                                                            <div className="flex flex-col gap-1">
                                                                {(Array.isArray(obra.coordinadorSysId) ? obra.coordinadorSysId : [obra.coordinadorSysId]).filter(Boolean).map((id: string) => (
                                                                    <span key={id} className="text-gray-700 font-medium">• {formatAgentName(id, 'persona')}</span>
                                                                ))}
                                                                {(!obra.coordinadorSysId || (Array.isArray(obra.coordinadorSysId) && obra.coordinadorSysId.length === 0)) && <span className="text-gray-400">Sin asignar</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Custom user roles mapping */}
                                                    {assignedContacts.filter(c => c.type === 'persona').map((c) => (
                                                        <div key={c.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm flex items-center justify-between group">
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-1">{c.role}</div>
                                                                <span className="text-gray-700 font-medium">{formatAgentName(c.agentId, 'persona')}</span>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="sm" onClick={() => { setEditingContactId(c.agentId); setIsPersonaModalOpen(true); }} className="text-blue-500 hover:bg-blue-50" style={{ padding: '4px' }}><Users size={16} /></Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveAgent(c.id)} className="text-red-500 hover:bg-red-50" style={{ padding: '4px' }}><Trash2 size={16} /></Button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <div className="mt-2 text-sm flex gap-2">
                                                        <select className="input-field py-1 flex-1" value={selectedPersonaId} onChange={e => setSelectedPersonaId(e.target.value)}>
                                                            <option value="" disabled>Seleccione persona...</option>
                                                            {allPersonas.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                                                        </select>
                                                        <Button size="sm" onClick={() => { handleAssignAgent('persona', selectedPersonaId); setSelectedPersonaId(''); }}>Asignar</Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    ) : activeCategory.id === 'cat-libro-subcontrata' ? (
                                        <div>
                                            <div className="flex justify-between items-center" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem' }}>
                                                    Libro de Subcontratación ({libroSubcontratas.length} registros)
                                                </h4>
                                                <Button size="sm" onClick={() => setIsLibroModalOpen(true)}>+ Añadir Fila</Button>
                                            </div>
                                            {libroSubcontratas.length === 0 ? (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No hay registros en el libro de subcontratación.</p>
                                            ) : (
                                                <div className="table-container" style={{ margin: 0 }}>
                                                    <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                                                        <thead>
                                                            <tr>
                                                                <th>Nº Orden</th>
                                                                <th>Subcontratista / Autónomo</th>
                                                                <th>Nivel de subcontratación</th>
                                                                <th>Objeto / Trabajos</th>
                                                                <th>Fecha de inicio</th>
                                                                <th>Fecha de término</th>
                                                                <th>Nº Orden de comitente</th>
                                                                <th style={{ textAlign: 'center' }}>Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {libroSubcontratas.map((row: any, index: number) => (
                                                                <tr key={index}>
                                                                    <td style={{ textAlign: 'center' }}>{row.orden || index + 1}</td>
                                                                    <td>{formatAgentName(row.subcontrataId, 'empresa')}</td>
                                                                    <td style={{ textAlign: 'center' }}>{row.nivel}</td>
                                                                    <td>{row.objetoTrabajos}</td>
                                                                    <td>{row.fechaInicio}</td>
                                                                    <td>{row.fechaTermino || '---'}</td>
                                                                    <td style={{ textAlign: 'center' }}>{row.ordenComitente || '---'}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <button onClick={() => {
                                                                            if (window.confirm("¿Eliminar registro?")) {
                                                                                deleteLibroSubcontrata(id!, row.id || row.fallbackId);
                                                                                setLibroSubcontratas(getLibroSubcontratas(id!));
                                                                            }
                                                                        }} className="btn-icon text-red-500 hover:bg-red-50" title="Eliminar">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Dropzone */}
                                            {activeCategory.id !== 'cat-reuniones' && activeCategory.id !== 'cat-visitas' && (
                                                <div
                                                    {...getRootProps()}
                                                    style={{
                                                        border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                        borderRadius: 'var(--radius-lg)',
                                                        padding: '3rem 2rem',
                                                        textAlign: 'center',
                                                        backgroundColor: isDragActive ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                                        cursor: 'pointer',
                                                        transition: 'all var(--transition-fast)'
                                                    }}
                                                >
                                                    <input {...getInputProps()} />
                                                    <UploadCloud size={48} style={{ color: isDragActive ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 1rem' }} />
                                                    {isDragActive ? (
                                                        <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary-dark)' }}>Suelta los archivos aquí...</p>
                                                    ) : (
                                                        <div>
                                                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>Arrastra y suelta archivos aquí, o haz clic para seleccionar</p>
                                                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Soporta cualquier tipo de archivo relevante para la obra.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* File List or Event Table depending on category */}
                                            {activeCategory.id === 'cat-reuniones' || activeCategory.id === 'cat-visitas' ? (
                                                <div>
                                                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>
                                                            {activeCategory.id === 'cat-reuniones' ? `Reuniones (${reuniones.length})` : `Visitas (${visitas.length})`}
                                                        </h4>
                                                        <Button onClick={() => setIsEventModalOpen(true)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                                                            {activeCategory.id === 'cat-reuniones' ? '+ Nueva Reunión' : '+ Nueva Visita'}
                                                        </Button>
                                                    </div>

                                                    {/* TABLE RENDERER FOR MEETINGS/VISITS */}
                                                    {(activeCategory.id === 'cat-reuniones' && reuniones.length === 0) || (activeCategory.id === 'cat-visitas' && visitas.length === 0) ? (
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                                                            No hay {activeCategory.id === 'cat-reuniones' ? 'reuniones' : 'visitas'} registradas.
                                                        </p>
                                                    ) : (
                                                        <div className="table-container" style={{ margin: 0 }}>
                                                            <table className="table" style={{ width: '100%' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Asunto</th>
                                                                        <th>Fechas</th>
                                                                        <th style={{ textAlign: 'center' }}>Estado</th>
                                                                        <th>Frecuencia</th>
                                                                        <th>Coordinador</th>
                                                                        <th style={{ textAlign: 'center' }}>Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(activeCategory.id === 'cat-reuniones' ? reuniones : visitas).map((row: any, index: number) => (
                                                                        <tr key={index} style={{ cursor: 'pointer' }} onClick={() => setActiveEvent(row)} className="hover:bg-slate-50 transition-colors">
                                                                            <td>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                                                                                    <strong>{row.title}</strong>
                                                                                </div>
                                                                            </td>
                                                                            <td>
                                                                                <div style={{ fontSize: '0.85rem' }}>
                                                                                    <span style={{ color: 'var(--text-muted)' }}>Inicio:</span> {new Date(row.start).toLocaleString()}<br />
                                                                                    <span style={{ color: 'var(--text-muted)' }}>Fin:</span> {new Date(row.end).toLocaleString()}
                                                                                </div>
                                                                            </td>
                                                                            <td style={{ textAlign: 'center' }}><span className="badge badge-en-curso">{row.estado}</span></td>
                                                                            <td style={{ textTransform: 'capitalize' }}>{row.frecuencia}</td>
                                                                            <td>{formatAgentName(row.coordinadorId, 'persona')}</td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                                    <button onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setActiveEvent(row);
                                                                                    }} className="btn-icon text-primary hover:bg-blue-50" title="Abrir Informe">
                                                                                        <ArrowRight size={18} />
                                                                                    </button>
                                                                                    <button onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (window.confirm("¿Eliminar registro?")) {
                                                                                            if (activeCategory.id === 'cat-reuniones') {
                                                                                                deleteReunion(id!, row.id || row.fallbackId);
                                                                                                setReuniones(getReuniones(id!));
                                                                                            } else {
                                                                                                deleteVisita(id!, row.id || row.fallbackId);
                                                                                                setVisitas(getVisitas(id!));
                                                                                            }
                                                                                        }
                                                                                    }} className="btn-icon text-red-500 hover:bg-red-50" title="Eliminar">
                                                                                        <Trash2 size={18} />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                </div>
                                            ) : (
                                                <div>
                                                    <h4 style={{ marginBottom: '1rem', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Archivos ({files.length})</h4>
                                                    {files.length === 0 ? (
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No hay archivos en esta categoría.</p>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {files.map(f => renderFileItem(f))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                                <Folders size={64} style={{ color: 'var(--border-color)', marginBottom: '1.5rem' }} />
                                <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Selecciona una categoría</h3>
                                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                                    Navega por el árbol documental en la barra lateral e ingresa a una categoría para ver o subir archivos.
                                </p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Event Modals */}
                <EventModal
                    isOpen={isEventModalOpen}
                    onClose={() => setIsEventModalOpen(false)}
                    onSave={(data) => handleSaveEvent(activeCategory?.id === 'cat-reuniones' ? 'reunion' : 'visita', data)}
                    obra={obra}
                    tipo={activeCategory?.id === 'cat-reuniones' ? 'reunion' : 'visita'}
                    assignedContacts={assignedContacts}
                    formatAgentName={formatAgentName}
                />

                {/* Contactos Modals */}
            </div>

            {isPersonaModalOpen && (
                <PersonaModal
                    initialData={editingContactId ? getPersona(editingContactId) : null}
                    empresas={allEmpresas}
                    onClose={() => { setIsPersonaModalOpen(false); setEditingContactId(null); }}
                    onSave={() => {
                        setIsPersonaModalOpen(false);
                        setEditingContactId(null);
                        loadObraData();
                    }}
                />
            )}
            {isEmpresaModalOpen && (
                <EmpresaModal
                    initialData={editingContactId ? getEmpresa(editingContactId) : null}
                    onClose={() => { setIsEmpresaModalOpen(false); setEditingContactId(null); }}
                    onSave={() => {
                        setIsEmpresaModalOpen(false);
                        setEditingContactId(null);
                        loadObraData();
                    }}
                />
            )}

            <LibroSubcontrataModal
                isOpen={isLibroModalOpen}
                onClose={() => setIsLibroModalOpen(false)}
                empresas={allEmpresas}
                libroActual={libroSubcontratas}
                onSave={(data) => {
                    saveLibroSubcontrata(id!, data);
                    setLibroSubcontratas(getLibroSubcontratas(id!));
                    setIsLibroModalOpen(false);
                }}
            />
        </>
    );
}
