import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Folders, File as FileIcon, UploadCloud, Trash2, Users, FileText, Building2, FileBadge, Shield, Menu, Calendar, Mail, FileStack, Briefcase, ChevronDown, ChevronUp, Download, Edit2, Pencil, StickyNote, X, Save } from 'lucide-react';
import { getObra, updateObra, fileStructureTemplate, getFiles, addFile, deleteReunion, getReuniones, saveReunion, updateReunion, deleteVisita, getVisitas, saveVisita, updateVisita, getEmpresa, getPersona, getContactosBase, getLibroSubcontratas, deleteLibroSubcontrata, saveLibroSubcontrata, deleteFile, updateFile, saveEmpresa, updateEmpresa, deleteEmpresa, savePersona, updatePersona, deletePersona } from '../store';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Card, Badge, Button, MultiSelect } from '../components/ui';
import { useDropzone } from 'react-dropzone';
import { EventModal } from '../components/EventModal';
import { EventReport } from '../components/EventReport';
import { EmpresaModal, PersonaModal } from '../components/ContactModals';
import { LibroSubcontrataModal } from '../components/LibroSubcontrataModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

const DocumentTreeNode = ({ node, level = 0, activeCategoryId, onSelectCategory, activeFolder, setFolderStack, obraId, onClearEvent }: any) => {
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

    // Calculate file counts dynamically
    const calculateFileCount = (n: any): number => {
        let count = 0;
        if (n.type === 'category') {
            count += getFiles(obraId, n.id).length;
        } else if (n.children) {
            n.children.forEach((child: any) => {
                count += calculateFileCount(child);
            });
        }
        return count;
    };
    const fileCount = calculateFileCount(node);

    const paddingLeft = `1rem`;

    const isCategory = node.type === 'category';
    const isActive = activeCategoryId === node.id;
    const isFolderActive = activeFolder?.id === node.id;
    const isRoot = level === 0;

    const handleClick = () => {
        onClearEvent?.(); // Clear any open report when navigating
        if (isCategory) {
            onSelectCategory(node);
            setFolderStack([]); // Clear stack when clicking a root category
        } else {
            setFolderStack([node]); // Set this folder as the active view
            onSelectCategory(null);
        }
    };

    return (
        <div style={{ userSelect: 'none', boxSizing: 'border-box' }}>
            <div
                onClick={handleClick}
                style={{
                    padding: isRoot ? `0.75rem 1rem` : `0.5rem 1rem 0.5rem ${paddingLeft}`,
                    margin: isRoot ? '0 0.85rem 0.5rem 0.85rem' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: (isActive || isFolderActive) ? 'var(--color-surface-hover)' : 'transparent',
                    color: (isActive || isFolderActive) ? 'var(--color-primary-dark)' : 'var(--text-main)',
                    fontWeight: (isActive || isFolderActive) ? 600 : 400,
                    border: isRoot ? '1px solid' : 'none',
                    borderColor: isRoot ? ((isActive || isFolderActive) ? 'var(--color-primary)' : 'var(--border-color)') : 'transparent',
                    borderLeft: (!isRoot && (isActive || isFolderActive)) ? '3px solid var(--color-primary)' : (!isRoot ? '3px solid transparent' : undefined),
                    borderRadius: isRoot ? 'var(--radius-md)' : '0',
                    marginBottom: isRoot ? '0.5rem' : '0',
                    transition: 'all var(--transition-fast)',
                    boxSizing: 'border-box'
                }}
                className={isRoot ? "hover:bg-surface-hover shadow-sm" : "hover:bg-surface"}
                onMouseEnter={(e) => {
                    if (isRoot) e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                    if (isRoot) e.currentTarget.style.borderColor = (isActive || isFolderActive) ? 'var(--color-primary)' : 'var(--border-color)';
                }}
            >
                {isCategory && !isRoot ? (
                    <NodeIcon size={isRoot ? 18 : 16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                ) : (
                    <NodeIcon size={isRoot ? 18 : 16} style={{ color: 'var(--color-primary)' }} />
                )}
                <span style={{ fontSize: '0.875rem', flex: 1 }}>{node.name}</span>
                {fileCount > 0 && (
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-surface-hover)', padding: '0.15rem 0.4rem', borderRadius: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {fileCount}
                    </span>
                )}
            </div>
        </div>
    );
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileItem = ({
    file: f,
    categoryId,
    isGlobal = false,
    onUpdate,
    onDelete
}: {
    file: any,
    categoryId: string,
    isGlobal?: boolean,
    onUpdate: (catId: string, fileId: string, field: string, value: any) => void,
    onDelete: (catId: string, fileId: string) => void
}) => {
    const isObsoleto = f.estado === 'Obsoleto';
    const bgColor = isObsoleto ? '#fee2e2' : 'white';
    const borderColor = isObsoleto ? '#fca5a5' : 'var(--border-color)';

    const handleNameClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const isPdf = f.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            // Document simulation for PDF (HTML view looks better than a blank blob)
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Vista Previa: ${f.name}</title>
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #525659; color: white; }
                        .paper { background: white; color: black; width: 600px; height: 800px; padding: 50px; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; flex-direction: column; }
                        h1 { color: #var(--color-primary-dark); border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="paper">
                        <h1>Documento: ${f.name}</h1>
                        <p><strong>Estado:</strong> ${f.estado || 'Actual'}</p>
                        <p><strong>Fecha Real:</strong> ${f.fechaReal || f.uploadDate}</p>
                        <hr/>
                        <p>Esta es una simulación de la vista previa del documento técnico.</p>
                        <p>Para documentos reales, aquí se mostraría el visor de PDFs del navegador.</p>
                        <div style="margin-top: auto; font-size: 0.8rem; color: #666;">ID del archivo: ${f.id}</div>
                    </div>
                </body>
                </html>
            `;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } else {
            // Simulation for non-PDF (Download)
            const blob = new Blob([`Contenido simulado de: ${f.name}`], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = f.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: '0.75rem 1rem', border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', backgroundColor: bgColor }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <FileIcon size={20} style={{ color: isObsoleto ? '#ef4444' : 'var(--color-primary)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <a href="#" onClick={handleNameClick} style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem', color: isObsoleto ? '#b91c1c' : 'var(--color-primary-dark)', textDecoration: 'none' }} className="hover:underline">
                        {f.name}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: isObsoleto ? '#991b1b' : 'var(--text-muted)' }}>
                        {isGlobal && f.path && (
                            <>
                                <span style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>{f.path}</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{formatSize(f.size)}</span>
                        <span>•</span>
                        <span>Subido: {f.uploadDate}</span>
                        <span>•</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label>Fecha Real:</label>
                            <input
                                type="date"
                                value={f.fechaReal || f.uploadDate}
                                onChange={(e) => onUpdate(categoryId, f.id, 'fechaReal', e.target.value)}
                                style={{ fontSize: '0.7rem', padding: '0.1rem 0.2rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <span>•</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label>Estado:</label>
                            <select
                                value={f.estado || 'Actual'}
                                onChange={(e) => onUpdate(categoryId, f.id, 'estado', e.target.value)}
                                style={{ fontSize: '0.7rem', padding: '0.1rem 0.2rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="Actual">Actual</option>
                                <option value="Obsoleto">Obsoleto</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button variant="ghost" style={{ color: '#ef4444', padding: '0.5rem' }} onClick={() => onDelete(categoryId, f.id)}>
                    <Trash2 size={16} />
                </Button>
            </div>
        </div>
    );
};

const GlobalSummarySection = ({ title, files, forceExpand, onUpdate, onDelete }: { title: string, files: any[], forceExpand?: boolean, onUpdate: any, onDelete: any }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (forceExpand !== undefined) {
            setIsExpanded(forceExpand);
        }
    }, [forceExpand]);

    return (
        <Card style={{ backgroundColor: 'white', padding: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none', paddingBottom: isExpanded ? '0.5rem' : '0', marginBottom: isExpanded ? '0.75rem' : '0' }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>
                    {title}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>({files.length} documentos)</span>
                </h4>
                <Button variant="ghost" size="sm" style={{ padding: '0.25rem' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Button>
            </div>
            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {files.map(f => (
                        <FileItem
                            key={f.id}
                            file={f}
                            categoryId={f.categoryId}
                            isGlobal={true}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </Card>
    );
};


const StandaloneCategoryDropzone = ({ obraId, category, onFilesChanged }: { obraId: string, category: any, onFilesChanged: () => void }) => {
    const [catFiles, setCatFiles] = useState<any[]>(getFiles(obraId, category.id));
    const [isExpanded, setIsExpanded] = useState(true);

    const onDrop = (acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const newFileObj = {
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                size: file.size,
                uploadDate: new Date().toISOString().split('T')[0],
                fechaReal: new Date().toISOString().split('T')[0],
                estado: 'Actual'
            };
            addFile(obraId, category.id, newFileObj);
        });
        setCatFiles(getFiles(obraId, category.id));
        onFilesChanged();
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });


    const handleDelete = (fileId: string) => {
        if (window.confirm("¿Eliminar archivo?")) {
            deleteFile(obraId, category.id, fileId);
            setCatFiles(getFiles(obraId, category.id));
            onFilesChanged();
        }
    };

    const handleUpdateFile = (_catId: string, fileId: string, field: string, value: any) => {
        updateFile(obraId, category.id, fileId, { [field]: value });
        setCatFiles(getFiles(obraId, category.id));
        onFilesChanged();
    };

    return (
        <Card style={{ backgroundColor: 'white', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isExpanded ? '1rem' : '0' }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>
                    {category.name}
                    {catFiles.length > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>({catFiles.length} documentos)</span>
                    )}
                </h4>
                <Button variant="ghost" size="sm" style={{ padding: '0.25rem' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Button>
            </div>
            {isExpanded && (
                <>
                    <div
                        {...getRootProps()}
                        style={{
                            border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-md)',
                            padding: '1.5rem',
                            textAlign: 'center',
                            backgroundColor: isDragActive ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            marginBottom: catFiles.length > 0 ? '1.5rem' : '0'
                        }}
                        className="hover:bg-surface-hover"
                    >
                        <input {...getInputProps()} />
                        <UploadCloud size={28} style={{ color: isDragActive ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                        {isDragActive ? (
                            <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary-dark)', fontSize: '0.85rem' }}>Suelta los archivos aquí...</p>
                        ) : (
                            <div>
                                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, fontSize: '0.85rem' }}>Arrastra y suelta o haz clic para subir</p>
                            </div>
                        )}
                    </div>

                    {catFiles.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {catFiles.map(f => (
                            <FileItem
                                key={f.id}
                                file={f}
                                categoryId={category.id}
                                onUpdate={handleUpdateFile}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                    }
                </>
            )}
        </Card>
    );
};

export default function ProjectDetails() {
    const { id } = useParams<{ id: string }>();
    const [obra, setObra] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<any>(null);
    const [folderStack, setFolderStack] = useState<any[]>([]); // Track folder drill-down
    const [files, setFiles] = useState<any[]>([]);
    const [expandAll, setExpandAll] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [reuniones, setReuniones] = useState<any[]>([]);
    const [visitas, setVisitas] = useState<any[]>([]);
    const [libroSubcontratas, setLibroSubcontratas] = useState<any[]>([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [activeEvent, setActiveEvent] = useState<any>(null);
    const [activeReportType, setActiveReportType] = useState<'reunion' | 'visita'>('visita');
    const [eventTypeToCreate, setEventTypeToCreate] = useState<'reunion' | 'visita'>('visita');

    // Contactos View State
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
    const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
    const [isLibroModalOpen, setIsLibroModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [internalNotes, setInternalNotes] = useState('');
    const [allPersonas, setAllPersonas] = useState<any[]>([]);
    const [allEmpresas, setAllEmpresas] = useState<any[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string[]>([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState<string[]>([]);
    const [assignedContacts, setAssignedContacts] = useState<any[]>([]);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [deleteModalState, setDeleteModalState] = useState<{
        isOpen: boolean;
        itemName: string;
        itemType: 'empresa' | 'persona';
        roleName: string;
        id: string;
        key?: string;
        isCoreRole: boolean;
        refId?: string;
    }>({
        isOpen: false,
        itemName: '',
        itemType: 'persona',
        roleName: '',
        id: '',
        isCoreRole: false
    });

    const handleSaveEmpresa = (data: any) => {
        if (editingContactId) {
            updateEmpresa(editingContactId, data);
        } else {
            const newId = `emp-${Date.now()}`;
            saveEmpresa({ id: newId, ...data });
        }
        setEditingContactId(null);
        setIsEmpresaModalOpen(false);
        loadObraData();
    };

    const handleSavePersona = (data: any) => {
        if (editingContactId) {
            updatePersona(editingContactId, data);
        } else {
            const newId = `per-${Date.now()}`;
            savePersona({ id: newId, ...data });
        }
        setEditingContactId(null);
        setIsPersonaModalOpen(false);
        loadObraData();
    };

    const executeDelete = () => {
        const { id, itemType, isCoreRole, refId, key } = deleteModalState;

        if (itemType === 'persona') {
            deletePersona(id);
        } else {
            deleteEmpresa(id);
        }

        if (isCoreRole && key) {
            const currentIds = obra[key];
            const updatedIds = Array.isArray(currentIds)
                ? currentIds.filter((cid: string) => cid !== id)
                : (currentIds === id ? null : currentIds);
            updateObra(obra.id, { [key]: updatedIds });
        } else if (refId) {
            const updated = assignedContacts.filter(c => c.id !== refId);
            updateObra(obra.id, { agentes: updated });
        }

        setDeleteModalState({ ...deleteModalState, isOpen: false });
        loadObraData();
    };

    const executeUnassign = () => {
        const { id, isCoreRole, refId, key } = deleteModalState;

        if (isCoreRole && key) {
            const currentIds = obra[key];
            const updatedIds = Array.isArray(currentIds)
                ? currentIds.filter((cid: string) => cid !== id)
                : (currentIds === id ? null : currentIds);
            updateObra(obra.id, { [key]: updatedIds });
        } else if (refId) {
            const updated = assignedContacts.filter(c => c.id !== refId);
            updateObra(obra.id, { agentes: updated });
        }

        setDeleteModalState({ ...deleteModalState, isOpen: false });
        loadObraData();
    };

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
            if (activeCategory.id === 'cat-reuniones') setReuniones(getReuniones(id));
            else if (activeCategory.id === 'cat-visitas') setVisitas(getVisitas(id));
            else if (activeCategory.id === 'cat-libro-subcontrata') setLibroSubcontratas(getLibroSubcontratas(id));
        } else if (id && folderStack.length > 0) {
            const activeFolder = folderStack[folderStack.length - 1];
            setFiles([]);
            setReuniones(activeFolder.id === 'fol-visitas-reuniones' ? getReuniones(id) : []);
            setVisitas(activeFolder.id === 'fol-visitas-reuniones' ? getVisitas(id) : []);
            setLibroSubcontratas(activeFolder.id === 'fol-contratistas' ? getLibroSubcontratas(id) : []);
        } else {
            setFiles([]);
            setReuniones([]);
            setVisitas([]);
            setLibroSubcontratas([]);
        }
    }, [id, activeCategory, folderStack]);

    // Helper to get all files for a given folder by reading its descendants
    const getAllFolderFiles = (folder: any) => {
        let allFiles: any[] = [];
        const processNode = (node: any, path: string) => {
            if (node.type === 'category') {
                const categoryFiles = getFiles(id!, node.id).map((f: any) => ({ ...f, path: `${path} / ${node.name}`, categoryId: node.id }));
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
        if (activeReportType === 'reunion' || activeCategory?.id === 'cat-reuniones') {
            updateReunion(id!, eventId, updatedData);
            setReuniones(getReuniones(id!));
        } else {
            updateVisita(id!, eventId, updatedData);
            setVisitas(getVisitas(id!));
        }
        setActiveEvent(null);
    };

    const handleAssignAgents = (type: 'persona' | 'empresa', agentIds: string[]) => {
        if (!agentIds || agentIds.length === 0) return;

        const newContacts = agentIds.map(agentId => ({
            id: `agt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            agentId,
            type,
            role: 'Colaborador'
        }));

        const updated = [...assignedContacts, ...newContacts];
        setAssignedContacts(updated);
        updateObra(obra.id, { agentes: updated });
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

    const handleUpdateGlobalFile = (categoryId: string, fileId: string, field: string, value: any) => {
        updateFile(id!, categoryId, fileId, { [field]: value });
        if (activeCategory) {
            setFiles(getFiles(id!, activeCategory.id));
        } else {
            setFiles([...files]);
        }
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        // Since projectGlobalFiles recalculates every render, we can get it:
        const allFiles = getProjectGlobalFiles();

        if (allFiles.length === 0) {
            alert('No hay archivos en la obra para descargar.');
            return;
        }

        allFiles.forEach(f => {
            const parts = f.path ? f.path.split('/').map((p: string) => p.trim()) : ['Sin Clasificar'];
            let currentFolder = zip;
            parts.forEach((p: string) => {
                currentFolder = currentFolder.folder(p)!;
            });
            currentFolder.file(f.name, `Contenido simulado del archivo: ${f.name}\nSubido el: ${f.uploadDate}\nFecha Real: ${f.fechaReal || f.uploadDate}\nEstado: ${f.estado || 'Actual'}`);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Documentacion_${obra.codigoObra}.zip`);
    };

    const renderEventsTable = (type: 'reunion' | 'visita', events: any[], onAdd: () => void) => {

        return (
            <Card style={{ backgroundColor: 'white', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>
                        {type === 'reunion' ? `Reuniones (${events.length})` : `Visitas (${events.length})`}
                    </h4>
                    <Button onClick={() => {
                        setEventTypeToCreate(type);
                        setActiveEvent(null);
                        onAdd();
                    }} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                        {type === 'reunion' ? '+ Nueva Reunión' : '+ Nueva Visita'}
                    </Button>
                </div>
                {events.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                        No hay {type === 'reunion' ? 'reuniones' : 'visitas'} registradas.
                    </p>
                ) : (
                    <div className="table-container" style={{ margin: 0 }}>
                        <table className="table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Título</th>
                                    <th>Fechas</th>
                                    <th style={{ textAlign: 'center' }}>Estado</th>
                                    <th>Coordinador</th>
                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((row: any, index: number) => (
                                    <tr key={index} style={{ cursor: 'pointer' }} onClick={() => { setActiveReportType(type); setActiveEvent(row); }} className="hover:bg-slate-50 transition-colors">
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                                                <strong>{row.title}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Planificada:</span> {new Date(row.start).toLocaleDateString()}<br />
                                                <span style={{ color: 'var(--text-muted)' }}>Fin:</span> {new Date(row.end).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}><Badge status={row.estado || 'Planificada'}>{row.estado || 'Planificada'}</Badge></td>
                                        <td>{formatAgentName(row.coordinadorId, 'persona')}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Abre el modal de eventos con los datos actuales para editar
                                                    setActiveReportType(type);
                                                    setActiveEvent(row);
                                                    setEditingContactId(row.id || row.fallbackId);
                                                    setEventTypeToCreate(type);
                                                    setIsEventModalOpen(true);
                                                }} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar Metadatos">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("¿Eliminar registro?")) {
                                                        if (type === 'reunion') {
                                                            deleteReunion(id!, row.id || row.fallbackId);
                                                            setReuniones(getReuniones(id!));
                                                        } else {
                                                            deleteVisita(id!, row.id || row.fallbackId);
                                                            setVisitas(getVisitas(id!));
                                                        }
                                                    }
                                                }} className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} title="Eliminar">
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
            </Card>
        );
    };
    if (!obra) return <div className="container" style={{ padding: '2rem 0' }}>Cargando obra...</div>;

    const renderFileItem = (f: { id: string, name: string, categoryId?: string, path?: string, size: number, uploadDate: string, fechaReal?: string, estado?: string }, isGlobal: boolean = false) => {
        return (
            <FileItem
                key={f.id}
                file={f}
                categoryId={isGlobal ? f.categoryId! : activeCategory!.id}
                isGlobal={isGlobal}
                onUpdate={handleUpdateGlobalFile}
                onDelete={(catId, fileId) => {
                    if (window.confirm("¿Eliminar archivo?")) {
                        deleteFile(id!, catId, fileId);
                        setFiles(getFiles(id!, activeCategory?.id || ''));
                    }
                }}
            />
        );
    };


    return (
        <>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <ArrowLeft size={16} /> Volver a Obras
                    </Link>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline" onClick={() => setIsNotesModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)' }}>
                            <StickyNote size={16} /> Notas Internas
                        </Button>
                        <Button onClick={handleDownloadZip} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={16} /> Descargar Documentación (ZIP)
                        </Button>
                    </div>
                </div>

                <div className="flex justify-between items-start" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', letterSpacing: '-0.025em' }}>{obra.denominacion}</h1>
                            <div className="flex items-center gap-2">
                                <Badge status={obra.estado}>{obra.estado}</Badge>
                                {obra.tipologia && <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500, marginLeft: '0.25rem' }}>{obra.tipologia}</span>}
                            </div>
                        </div>
                        <div className="flex gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            <span>Ref: {obra.codigoObra}</span>
                            <span>Exp: {obra.expediente}</span>
                            {obra.cebe && <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>CEBE: {obra.cebe}</span>}
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

                <div style={{ display: 'grid', gridTemplateColumns: isSidebarOpen ? 'minmax(280px, 1fr) 3fr' : 'auto 1fr', gap: '2rem', height: 'calc(100vh - 220px)', minHeight: '600px', transition: 'grid-template-columns 0.3s ease' }}>
                    {/* Document Tree Sidebar */}
                    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', width: isSidebarOpen ? 'auto' : 'fit-content' }}>
                        <div className={`flex ${isSidebarOpen ? 'justify-between' : 'justify-center'} items-center`} style={{ padding: '1rem', paddingBottom: '0.5rem', borderBottom: isSidebarOpen ? '1px solid var(--border-color)' : 'none' }}>
                            {isSidebarOpen && (
                                <button
                                    onClick={() => {
                                        setActiveCategory(null);
                                        setFolderStack([]);
                                        setActiveEvent(null);
                                    }}
                                    style={{
                                        fontSize: '0.95rem', margin: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'white', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--color-primary-dark)',
                                        fontWeight: 600, padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)',
                                        outline: 'none', transition: 'all var(--transition-fast)', boxShadow: 'var(--shadow-sm)'
                                    }}
                                    className="hover:bg-surface-hover"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                    }}
                                    title="Ir al resumen global"
                                >
                                    <Folders size={18} /> Árbol Documental
                                </button>
                            )}
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                title={isSidebarOpen ? "Ocultar panel" : "Mostrar panel"}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-main)',
                                    border: '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                className="hover:bg-surface-hover hover:border-border"
                            >
                                <Menu size={20} />
                            </button>
                        </div>
                        {isSidebarOpen && (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                                {fileStructureTemplate.map((node) => (
                                    <DocumentTreeNode
                                        key={node.id}
                                        node={node}
                                        activeCategoryId={activeCategory?.id}
                                        onSelectCategory={setActiveCategory}
                                        activeFolder={activeFolder}
                                        setFolderStack={setFolderStack}
                                        obraId={id!}
                                        onClearEvent={() => setActiveEvent(null)}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Content Area */}
                    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {activeEvent ? (
                            <div style={{ height: '100%', padding: '1.5rem', overflowY: 'auto' }}>
                                {/* We need to implement EventReport logic mapping here */}
                                <EventReport
                                    key={activeEvent?.id || 'new'}
                                    tipo={activeReportType}
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
                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', padding: (activeFolder && activeFolder.children && activeFolder.children.every((c: any) => c.type === 'category') && activeFolder.id !== 'fol-contratistas' && activeFolder.id !== 'fol-visitas-reuniones') ? '1rem' : undefined }}>
                                    {activeFolder.id === 'fol-contratistas' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {activeFolder.children.filter((c: any) => c.id !== 'cat-libro-subcontrata').map((child: any) => (
                                                    <StandaloneCategoryDropzone
                                                        key={child.id}
                                                        obraId={id!}
                                                        category={child}
                                                        onFilesChanged={() => setFiles([...files])}
                                                    />
                                                ))}
                                            </div>
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
                                        </div>
                                    ) : activeFolder.id === 'fol-visitas-reuniones' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {activeFolder.children.filter((c: any) => c.id === 'cat-li').map((child: any) => (
                                                    <StandaloneCategoryDropzone
                                                        key={child.id}
                                                        obraId={id!}
                                                        category={child}
                                                        onFilesChanged={() => setFiles([...files])}
                                                    />
                                                ))}
                                            </div>
                                            {renderEventsTable('visita', visitas, () => setIsEventModalOpen(true))}
                                            {renderEventsTable('reunion', reuniones, () => setIsEventModalOpen(true))}
                                        </div>
                                    ) : (activeFolder && activeFolder.children && activeFolder.children.every((c: any) => c.type === 'category')) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {activeFolder.children?.map((child: any) => (
                                                <StandaloneCategoryDropzone
                                                    key={child.id}
                                                    obraId={id!}
                                                    category={child}
                                                    onFilesChanged={() => {
                                                        // trigger a re-render to update folderGlobalFiles
                                                        setFiles([...files]);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
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
                                    )}

                                    {activeFolder?.id !== 'fol-contratistas' && activeFolder?.id !== 'fol-visitas-reuniones' && !(activeFolder && activeFolder.children && activeFolder.children.every((c: any) => c.type === 'category')) && folderGlobalFiles.length > 0 && (
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
                                <div className="card-header" style={{ backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                                            Resumen Global de Archivos
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Muestra todos los documentos de la obra de forma estructurada.</p>
                                    </div>
                                    {projectGlobalFiles.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setExpandAll(!expandAll)}
                                            style={{ backgroundColor: 'white' }}
                                        >
                                            {expandAll ? 'Replegar Todo' : 'Desplegar Todo'}
                                        </Button>
                                    )}
                                </div>
                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                                    {projectGlobalFiles.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {fileStructureTemplate.map(rootNode => {
                                                const filesInSection = getAllFolderFiles(rootNode);
                                                if (filesInSection.length === 0) return null;

                                                return <GlobalSummarySection
                                                    key={rootNode.id}
                                                    title={rootNode.name}
                                                    files={filesInSection}
                                                    forceExpand={expandAll}
                                                    onUpdate={handleUpdateGlobalFile}
                                                    onDelete={(catId: string, fileId: string) => {
                                                        if (window.confirm("¿Eliminar archivo?")) {
                                                            deleteFile(id!, catId, fileId);
                                                            // Force refresh by reloading files
                                                            setFiles(getFiles(id!, ''));
                                                        }
                                                    }}
                                                />
                                            })}
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

                                    {activeEvent ? (
                                        <div style={{ margin: '-1.5rem', flex: 1 }}>
                                            <EventReport
                                                key={activeEvent?.id || 'new'}
                                                tipo={activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita'}
                                                eventData={activeEvent}
                                                obra={obra}
                                                assignedContacts={assignedContacts}
                                                formatAgentName={formatAgentName}
                                                onClose={() => setActiveEvent(null)}
                                                onSave={(id, data) => handleSaveEvent(activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita', { ...data, id })}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {activeCategory.id === 'cat-contactos' ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                                                    {/* EMPRESAS COL */}
                                                    <Card style={{ backgroundColor: 'var(--color-surface)' }}>
                                                        <div className="card-header flex justify-between items-center" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={18} /> Empresas</h4>
                                                            <Button size="sm" variant="outline" onClick={() => setIsEmpresaModalOpen(true)}>+ Nueva</Button>
                                                        </div>
                                                        <div className="card-body flex flex-col gap-3" style={{ padding: '1.25rem', maxHeight: '500px', overflowY: 'auto' }}>
                                                            {/* REDESIGNED CARDS FOR COMPANIES */}
                                                            {[
                                                                { title: 'Promotor', key: 'promotorId', ids: obra.promotorId, icon: <Building2 size={14} /> },
                                                                { title: 'Contratista Principal', key: 'contratistaId', ids: obra.contratistaId, icon: <Building2 size={14} /> }
                                                            ].map(group => (
                                                                <div key={group.title} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                                                                    <div className="text-xs font-bold text-gray-900 mb-2 pb-1 flex items-center" style={{ fontWeight: 'bold', borderBottom: '2px solid #cbd5e1', gap: '0.5rem' }}>
                                                                        {group.icon} {group.title}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        {(Array.isArray(group.ids) ? group.ids : [group.ids]).filter(Boolean).map((id: string, index, arr) => (
                                                                            <div key={id} className="group flex items-center justify-between py-2" style={index < arr.length - 1 ? { borderBottom: '1px solid #e2e8f0' } : {}}>
                                                                                <span className="text-gray-700 font-medium text-sm">{formatAgentName(id, 'empresa')}</span>
                                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingContactId(id); setIsEmpresaModalOpen(true); }} className="text-blue-500 hover:bg-blue-50" style={{ padding: '6px', height: 'auto' }}><Pencil size={14} /></Button>
                                                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                                                        const emp = getEmpresa(id);
                                                                                        setDeleteModalState({
                                                                                            isOpen: true,
                                                                                            itemName: emp ? emp.razonSocial : 'Desconocido',
                                                                                            itemType: 'empresa',
                                                                                            roleName: group.title,
                                                                                            id: id,
                                                                                            key: group.key,
                                                                                            isCoreRole: true
                                                                                        });
                                                                                    }} className="text-red-500 hover:bg-red-50" style={{ padding: '6px', height: 'auto' }}><Trash2 size={14} /></Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {(!group.ids || (Array.isArray(group.ids) && group.ids.length === 0)) && <span className="text-gray-400 text-xs italic py-1">Sin asignar</span>}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Others mapping */}
                                                            {assignedContacts.filter(c => c.type === 'empresa').map((c) => (
                                                                <div key={c.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                                                                    <div className="text-xs font-bold text-gray-900 mb-2 pb-1 flex items-center" style={{ fontWeight: 'bold', borderBottom: '2px solid #cbd5e1', gap: '0.5rem' }}>
                                                                        <Building2 size={14} /> {c.role}
                                                                    </div>
                                                                    <div className="flex items-center justify-between group py-2">
                                                                        <div className="text-gray-700 font-medium text-sm">{formatAgentName(c.agentId, 'empresa')}</div>
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Button variant="ghost" size="sm" onClick={() => { setEditingContactId(c.agentId); setIsEmpresaModalOpen(true); }} className="text-blue-500 hover:bg-blue-50" style={{ padding: '6px', height: 'auto' }}><Pencil size={14} /></Button>
                                                                            <Button variant="ghost" size="sm" onClick={() => {
                                                                                const emp = getEmpresa(c.agentId);
                                                                                setDeleteModalState({
                                                                                    isOpen: true,
                                                                                    itemName: emp ? emp.razonSocial : 'Desconocido',
                                                                                    itemType: 'empresa',
                                                                                    roleName: c.role,
                                                                                    id: c.agentId,
                                                                                    isCoreRole: false,
                                                                                    refId: c.id
                                                                                });
                                                                            }} className="text-red-500 hover:bg-red-50" style={{ padding: '6px', height: 'auto' }}><Trash2 size={14} /></Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col gap-2">
                                                                <MultiSelect
                                                                    options={allEmpresas.map(e => ({ value: e.id, label: e.razonSocial }))}
                                                                    value={selectedEmpresaId}
                                                                    onChange={setSelectedEmpresaId}
                                                                    placeholder="Asignar otras empresas..."
                                                                    onAddNew={() => setIsEmpresaModalOpen(true)}
                                                                />
                                                                <Button size="sm" onClick={() => { handleAssignAgents('empresa', selectedEmpresaId); setSelectedEmpresaId([]); }} className="w-full">Asignar Seleccionados</Button>
                                                            </div>
                                                        </div>
                                                    </Card>

                                                    {/* PERSONAS COL */}
                                                    <Card style={{ backgroundColor: 'var(--color-surface)' }}>
                                                        <div className="card-header flex justify-between items-center" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Personas</h4>
                                                            <Button size="sm" variant="outline" onClick={() => setIsPersonaModalOpen(true)}>+ Nueva</Button>
                                                        </div>
                                                        <div className="card-body flex flex-col gap-3" style={{ padding: '1.25rem', maxHeight: '500px', overflowY: 'auto' }}>
                                                            {/* REDESIGNED CARDS FOR PERSONS */}
                                                            {[
                                                                { title: 'Director de Obra', key: 'directorObraId', ids: obra.directorObraId, icon: <FileBadge size={14} /> },
                                                                { title: 'Jefe de Obra', key: 'jefeObraId', ids: obra.jefeObraId, icon: <FileBadge size={14} /> },
                                                                { title: 'Coordinador SyS', key: 'coordinadorSysId', ids: obra.coordinadorSysId, icon: <Shield size={14} /> }
                                                            ].map(group => (
                                                                <div key={group.title} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                                                                    <div className="text-xs font-bold text-gray-900 mb-2 pb-1 flex items-center" style={{ fontWeight: 'bold', borderBottom: '2px solid #cbd5e1', gap: '0.5rem' }}>
                                                                        {group.icon} {group.title}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        {(Array.isArray(group.ids) ? group.ids : [group.ids]).filter(Boolean).map((id: string, index, arr) => (
                                                                            <div key={id} className="group flex items-center justify-between py-2" style={index < arr.length - 1 ? { borderBottom: '1px solid #e2e8f0' } : {}}>
                                                                                <span className="text-gray-700 font-medium text-sm">{formatAgentName(id, 'persona')}</span>
                                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingContactId(id); setIsPersonaModalOpen(true); }} className="text-blue-500 hover:bg-blue-50" style={{ padding: '6px', height: 'auto' }}><Pencil size={14} /></Button>
                                                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                                                        const person = getPersona(id);
                                                                                        setDeleteModalState({
                                                                                            isOpen: true,
                                                                                            itemName: person ? `${person.nombre} ${person.apellidos}` : 'Desconocido',
                                                                                            itemType: 'persona',
                                                                                            roleName: group.title,
                                                                                            id: id,
                                                                                            key: group.key,
                                                                                            isCoreRole: true
                                                                                        });
                                                                                    }} className="text-red-500 hover:bg-red-50" style={{ padding: '6px', height: 'auto' }}><Trash2 size={14} /></Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {(!group.ids || (Array.isArray(group.ids) && group.ids.length === 0)) && <span className="text-gray-400 text-xs italic py-1">Sin asignar</span>}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Custom user roles mapping */}
                                                            {assignedContacts.filter(c => c.type === 'persona').map((c) => {
                                                                const personData = allPersonas.find(p => p.id === c.agentId);
                                                                return (
                                                                    <div key={c.id} className="p-3 border border-gray-200 rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                                                                        <div className="text-xs font-bold text-gray-900 mb-2 pb-1 flex items-center" style={{ fontWeight: 'bold', borderBottom: '2px solid #cbd5e1', gap: '0.5rem' }}>
                                                                            <Users size={14} />
                                                                            <span>
                                                                                {c.role} {personData?.tipo && <span className="font-normal text-gray-500 text-[10px] ml-1">({personData.tipo})</span>}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between group py-2">
                                                                            <div className="text-gray-700 font-medium text-sm">{formatAgentName(c.agentId, 'persona')}</div>
                                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <Button variant="ghost" size="sm" onClick={() => { setEditingContactId(c.agentId); setIsPersonaModalOpen(true); }} className="text-blue-500 hover:bg-blue-50" style={{ padding: '6px', height: 'auto' }}><Pencil size={14} /></Button>
                                                                                <Button variant="ghost" size="sm" onClick={() => {
                                                                                    const person = getPersona(c.agentId);
                                                                                    setDeleteModalState({
                                                                                        isOpen: true,
                                                                                        itemName: person ? `${person.nombre} ${person.apellidos}` : 'Desconocido',
                                                                                        itemType: 'persona',
                                                                                        roleName: c.role,
                                                                                        id: c.agentId,
                                                                                        isCoreRole: false,
                                                                                        refId: c.id
                                                                                    });
                                                                                }} className="text-red-500 hover:bg-red-50" style={{ padding: '6px', height: 'auto' }}><Trash2 size={14} /></Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col gap-2">
                                                                <MultiSelect
                                                                    options={allPersonas.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                                                    value={selectedPersonaId}
                                                                    onChange={setSelectedPersonaId}
                                                                    placeholder="Asignar otras personas..."
                                                                    onAddNew={() => setIsPersonaModalOpen(true)}
                                                                />
                                                                <Button size="sm" onClick={() => { handleAssignAgents('persona', selectedPersonaId); setSelectedPersonaId([]); }} className="w-full">Asignar Seleccionados</Button>
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
                                                                                <tr key={index} style={{ cursor: 'pointer' }} onClick={() => { setActiveReportType(activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita'); setActiveEvent(row); }} className="hover:bg-slate-50 transition-colors">
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
                                                                                                setEventTypeToCreate(activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita');
                                                                                                setIsEventModalOpen(true);
                                                                                            }} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar Metadatos">
                                                                                                <Edit2 size={18} />
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
                                                                                            }} className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} title="Eliminar">
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
                    onClose={() => {
                        setIsEventModalOpen(false);
                        setActiveEvent(null);
                        setEditingContactId(null);
                    }}
                    onSave={(data) => {
                        handleSaveEvent(eventTypeToCreate, { id: editingContactId, ...data });
                        setEditingContactId(null);
                    }}
                    obra={obra}
                    tipo={eventTypeToCreate}
                    defaultTitle={eventTypeToCreate === 'reunion' ? `Acta reunión ${(reuniones.length + 1).toString().padStart(3, '0')}` : `Acta visita ${(visitas.length + 1).toString().padStart(3, '0')}`}
                    assignedContacts={assignedContacts}
                    formatAgentName={formatAgentName}
                    initialData={activeEvent}
                />

                {/* Contactos Modals */}
            </div>

            {isPersonaModalOpen && (
                <PersonaModal
                    initialData={editingContactId ? getPersona(editingContactId) : null}
                    empresas={allEmpresas}
                    onClose={() => { setIsPersonaModalOpen(false); setEditingContactId(null); }}
                    onSave={handleSavePersona}
                />
            )}
            {isEmpresaModalOpen && (
                <EmpresaModal
                    initialData={editingContactId ? getEmpresa(editingContactId) : null}
                    onClose={() => { setIsEmpresaModalOpen(false); setEditingContactId(null); }}
                    onSave={handleSaveEmpresa}
                />
            )}

            <DeleteConfirmModal
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
                onDelete={executeDelete}
                onUnassign={executeUnassign}
                itemName={deleteModalState.itemName}
                roleName={deleteModalState.roleName}
            />

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

            {/* Notas Internas Modal */}
            {isNotesModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
                                <StickyNote size={20} /> Notas Internas de la Obra
                            </h3>
                            <button onClick={() => setIsNotesModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            <textarea
                                value={internalNotes}
                                onChange={(e) => setInternalNotes(e.target.value)}
                                placeholder="Escribe aquí las notas, recordatorios o observaciones de la obra..."
                                style={{
                                    width: '100%',
                                    minHeight: '300px',
                                    padding: '1rem',
                                    border: '1px solid #fcd34d',
                                    borderRadius: '8px',
                                    backgroundColor: '#fffbeb',
                                    color: '#451a03',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <Button variant="outline" onClick={() => setIsNotesModalOpen(false)}>Cerrar</Button>
                            <Button onClick={() => {
                                updateObra(id!, { ...obra, notasInternas: internalNotes });
                                loadObraData();
                                setIsNotesModalOpen(false);
                            }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Save size={16} /> Guardar Notas
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
