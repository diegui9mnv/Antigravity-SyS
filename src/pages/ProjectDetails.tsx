import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Folders, File as FileIcon, UploadCloud, Trash2, Users, FileText, Building2, FileBadge, Shield, Menu, Calendar, Mail, FileStack, Briefcase, ChevronDown, ChevronUp, Download, Edit2, Pencil, StickyNote, X, Save, RotateCw, Copy } from 'lucide-react';
import { updateObra as updateObraLocal, fileStructureTemplate } from '../store';
import { getDocumentos, getTodosDocumentos, uploadDocumento, updateDocumentoMetadata, deleteDocumento, getDocumentoUrl, type DocumentoMetaData } from '../lib/api/documentos';
import { getEventos, createEvento, updateEvento, deleteEvento, type ObraEvento } from '../lib/api/eventos';
import { getLibroSubcontratas as getLibroSubcontratasDB, createLibroEntry, updateLibroEntry, deleteLibroEntry, type LibroSubcontrataEntry } from '../lib/api/subcontratas';
import { getObraWithRelations, updateObraAgentes, updateObraFields } from '../lib/api/obras';
import { getEmpresas as getEmpresasAPI, getPersonas as getPersonasAPI, createEmpresa as createEmpresaAPI, updateEmpresa as updateEmpresaAPI, deleteEmpresa as deleteEmpresaAPI, createPersona as createPersonaAPI, updatePersona as updatePersonaAPI, deletePersona as deletePersonaAPI } from '../lib/api/agenda';
import { getPlantillasByCategory as getPlantillasByCategoryDB, plantillaToFile } from '../lib/api/plantillas';
import { createActaPdfUrl } from '../lib/actaPdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Card, Badge, Button, MultiSelect } from '../components/ui';
import { useDropzone } from 'react-dropzone';
import { EventModal } from '../components/EventModal';
import { EventReport } from '../components/EventReport';
import { EmpresaModal, PersonaModal } from '../components/ContactModals';
import { LibroSubcontrataModal } from '../components/LibroSubcontrataModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

const getNodeFileCount = (node: any, allFiles: DocumentoMetaData[]): number => {
    if (node.type === 'category') {
        return allFiles.filter(f => f.category_id === node.id).length;
    }
    if (node.children) {
        return node.children.reduce((acc: number, child: any) => acc + getNodeFileCount(child, allFiles), 0);
    }
    return 0;
};

const OBRA_STATUS_SEQUENCE = ['solicitud', 'preparacion', 'completada'] as const;
const DEFAULT_QUICK_UPLOAD_CATEGORY_ID = 'cat-otros';
type ObraStatus = typeof OBRA_STATUS_SEQUENCE[number];

const normalizeObraStatus = (status: string | null | undefined): ObraStatus => {
    const value = (status || '').trim().toLowerCase();
    if (value === 'completada') return 'completada';
    if (value === 'preparación' || value === 'preparacion' || value === 'en curso') return 'preparacion';
    return 'solicitud';
};

const getNextObraStatus = (current: string | null | undefined): ObraStatus => {
    const normalized = normalizeObraStatus(current);
    const idx = OBRA_STATUS_SEQUENCE.indexOf(normalized);
    return OBRA_STATUS_SEQUENCE[(idx + 1) % OBRA_STATUS_SEQUENCE.length];
};

const formatObraStatus = (status: string | null | undefined): string => {
    const normalized = normalizeObraStatus(status);
    if (normalized === 'preparacion') return 'Preparación';
    if (normalized === 'completada') return 'Completada';
    return 'Solicitud';
};

const badgeStatusForObra = (status: string | null | undefined): string => {
    const normalized = normalizeObraStatus(status);
    return normalized === 'preparacion' ? 'en curso' : normalized;
};

const formatPem = (value: any): string => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value || '-');
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numeric);
};

const collectCategoryOptions = (nodes: any[], parentPath: string = ''): Array<{ id: string; label: string }> => {
    return nodes.flatMap((node: any) => {
        const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
        if (node.type === 'category') {
            return [{ id: node.id, label: currentPath }];
        }
        if (node.children) {
            return collectCategoryOptions(node.children, currentPath);
        }
        return [];
    });
};

const DocumentTreeNode = ({ node, level = 0, activeCategoryId, onSelectCategory, activeFolder, setFolderStack, onClearEvent, allObraFiles, onNodeSelected }: any) => {
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

    // Para esta migración, simplificaremos el contador quitándolo del árbol para evitar problemas de sincronía,
    // o calculándolo si le pasásemos todos los archivos. De momento, lo omitimos por simplicidad visual.
    const fileCount = getNodeFileCount(node, allObraFiles);

    const paddingLeft = `1rem`;

    const isCategory = node.type === 'category';
    const isActive = activeCategoryId === node.id;
    const isFolderActive = activeFolder?.id === node.id;
    const isNodeActive = isActive || isFolderActive;
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
        onNodeSelected?.();
    };

    return (
        <div style={{ userSelect: 'none', boxSizing: 'border-box' }}>
            <div
                onClick={handleClick}
                style={{
                    padding: isRoot ? `0.75rem 1rem` : `0.5rem 1rem 0.5rem ${paddingLeft}`,
                    margin: isRoot ? '0 0 0.5rem 0' : '0',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: isNodeActive ? 'var(--color-surface-hover)' : 'transparent',
                    color: isNodeActive ? 'var(--color-primary-dark)' : 'var(--text-main)',
                    fontWeight: isNodeActive ? 600 : 400,
                    border: 'none',
                    boxShadow: isRoot
                        ? `inset 0 0 0 1px ${isNodeActive ? 'var(--color-primary)' : 'var(--border-color)'}`
                        : 'none',
                    borderLeft: (!isRoot && isNodeActive) ? '3px solid var(--color-primary)' : (!isRoot ? '3px solid transparent' : undefined),
                    borderRadius: isRoot ? 'var(--radius-md)' : '0',
                    marginBottom: isRoot ? '0.5rem' : '0',
                    transition: 'all var(--transition-fast)',
                    boxSizing: 'border-box'
                }}
                className={isRoot ? "hover:bg-surface-hover shadow-sm" : "hover:bg-surface"}
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
    onDelete: (catId: string, fileId: string, filePath?: string | null) => void
}) => {
    const isObsoleto = f.estado === 'Obsoleto';
    const bgColor = isObsoleto ? '#fee2e2' : 'white';
    const borderColor = isObsoleto ? '#fca5a5' : 'var(--border-color)';

    const handleNameClick = (e: React.MouseEvent) => {
        e.preventDefault();

        if (f.file_path) {
            window.open(getDocumentoUrl(f.file_path), '_blank');
            return;
        }

        const isPdf = f.file_name.toLowerCase().endsWith('.pdf');

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
                        {f.file_name}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: isObsoleto ? '#991b1b' : 'var(--text-muted)' }}>
                        {isGlobal && f.path && (
                            <>
                                <span style={{ color: 'var(--color-primary-dark)', fontWeight: 500 }}>{f.path}</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{formatSize(f.file_size || 0)}</span>
                        <span>•</span>
                        <span>Subido: {f.upload_date}</span>
                        <span>•</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label>Fecha Real:</label>
                            <input
                                type="date"
                                value={f.fecha_real || f.upload_date || ''}
                                onChange={(e) => onUpdate(categoryId, f.id, 'fecha_real', e.target.value)}
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
                <Button variant="ghost" style={{ color: '#ef4444', padding: '0.5rem' }} onClick={() => onDelete(categoryId, f.id, f.file_path)}>
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
    const [catFiles, setCatFiles] = useState<DocumentoMetaData[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [plantillas, setPlantillas] = useState<any[]>([]);

    useEffect(() => {
        getDocumentos(obraId, category.id).then(setCatFiles).catch(console.error);
    }, [obraId, category.id]);

    useEffect(() => {
        let cancelled = false;
        getPlantillasByCategoryDB(category.id)
            .then((data) => {
                if (!cancelled) setPlantillas(data);
            })
            .catch((error) => {
                console.error('Error fetching templates for category:', category.id, error);
                if (!cancelled) setPlantillas([]);
            });
        return () => {
            cancelled = true;
        };
    }, [category.id]);

    const onDrop = async (acceptedFiles: File[]) => {
        setIsUploading(true);
        for (const file of acceptedFiles) {
            try {
                await uploadDocumento(obraId, category.id, file);
            } catch (e) {
                alert(`Error al subir ${file.name}`);
            }
        }
        const updatedFiles = await getDocumentos(obraId, category.id);
        setCatFiles(updatedFiles);
        setIsUploading(false);
        onFilesChanged();
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });


    const handleDelete = async (_catId: string, fileId: string, filePath: string | null = null) => {
        if (window.confirm("¿Eliminar archivo?")) {
            await deleteDocumento(fileId, filePath);
            const updatedFiles = await getDocumentos(obraId, category.id);
            setCatFiles(updatedFiles);
            onFilesChanged();
        }
    };

    const handleUpdateFile = async (_catId: string, fileId: string, field: string, value: any) => {
        await updateDocumentoMetadata(fileId, { [field]: value });
        const updatedFiles = await getDocumentos(obraId, category.id);
        setCatFiles(updatedFiles);
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
                    <div className="template-upload-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
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
                                flex: 2,
                                minWidth: 0
                            }}
                            className="hover:bg-surface-hover"
                        >
                            <input {...getInputProps()} />
                            <UploadCloud size={28} style={{ color: isDragActive ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                            {isDragActive ? (
                                <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary-dark)', fontSize: '0.85rem' }}>Suelta los archivos aquí...</p>
                            ) : isUploading ? (
                                <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary-dark)', fontSize: '0.85rem' }}>Subiendo archivos...</p>
                            ) : (
                                <div>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, fontSize: '0.85rem' }}>Arrastra y suelta o haz clic para subir</p>
                                </div>
                            )}
                        </div>

                        {plantillas.length > 0 && (
                            <div className="template-picker-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>O elegir plantilla:</label>
                                <div className="template-picker-row" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        value={selectedTemplateId}
                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                        className="input-field"
                                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', minWidth: 0 }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {plantillas.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        disabled={!selectedTemplateId}
                                        onClick={async () => {
                                            const plantilla = plantillas.find((p: any) => p.id === selectedTemplateId);
                                            if (plantilla) {
                                                setIsUploading(true);
                                                try {
                                                    const file = await plantillaToFile(plantilla);
                                                    await uploadDocumento(obraId, category.id, file);
                                                    const updatedFiles = await getDocumentos(obraId, category.id);
                                                    setCatFiles(updatedFiles);
                                                    onFilesChanged();
                                                    setSelectedTemplateId('');
                                                } catch (e) {
                                                    alert('Error al subir la plantilla');
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }
                                        }}
                                        className="btn btn-primary template-add-btn"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                    >
                                        Añadir
                                    </button>
                                </div>
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
    const [allObraFiles, setAllObraFiles] = useState<DocumentoMetaData[]>([]);
    const [expandAll, setExpandAll] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [reuniones, setReuniones] = useState<ObraEvento[]>([]);
    const [visitas, setVisitas] = useState<ObraEvento[]>([]);
    const [libroSubcontratas, setLibroSubcontratas] = useState<LibroSubcontrataEntry[]>([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [activeEvent, setActiveEvent] = useState<any>(null);
    const [activeReportType, setActiveReportType] = useState<'reunion' | 'visita'>('visita');
    const [eventTypeToCreate, setEventTypeToCreate] = useState<'reunion' | 'visita'>('visita');
    const [eventModalInitialData, setEventModalInitialData] = useState<any>(null);
    const [duplicateSourceEvent, setDuplicateSourceEvent] = useState<any>(null);
    const [eventModalAnchorTop, setEventModalAnchorTop] = useState<number | null>(null);

    // Contactos View State
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
    const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
    const [isLibroModalOpen, setIsLibroModalOpen] = useState(false);
    const [libroModalAnchorTop, setLibroModalAnchorTop] = useState<number | null>(null);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [isQuickUploadModalOpen, setIsQuickUploadModalOpen] = useState(false);
    const [quickUploadCategoryId, setQuickUploadCategoryId] = useState('');
    const [isQuickUploading, setIsQuickUploading] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [internalNotes, setInternalNotes] = useState('');
    const [allPersonas, setAllPersonas] = useState<any[]>([]);
    const [allEmpresas, setAllEmpresas] = useState<any[]>([]);
    const [activeCategoryTemplates, setActiveCategoryTemplates] = useState<any[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string[]>([]);
    const contentAreaRef = useRef<HTMLDivElement | null>(null);

    // Plantillas state
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
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
    const libroModalRestoreScrollRef = useRef<number | null>(null);

    const quickUploadCategories = useMemo(
        () => collectCategoryOptions(fileStructureTemplate),
        []
    );

    useEffect(() => {
        const categoryId = activeCategory?.id;
        if (!categoryId || categoryId === 'cat-reuniones' || categoryId === 'cat-visitas') {
            setActiveCategoryTemplates([]);
            return;
        }

        let cancelled = false;
        getPlantillasByCategoryDB(categoryId)
            .then((templates) => {
                if (!cancelled) setActiveCategoryTemplates(templates);
            })
            .catch((error) => {
                console.error('Error fetching active category templates:', error);
                if (!cancelled) setActiveCategoryTemplates([]);
            });

        return () => {
            cancelled = true;
        };
    }, [activeCategory?.id]);

    const persistAssignedContacts = async (next: any[]) => {
        const previous = assignedContacts;
        setAssignedContacts(next);
        if (!obra?.id) return;
        try {
            await updateObraAgentes(obra.id, next);
        } catch (error) {
            console.error('Error saving colaboradores:', error);
            setAssignedContacts(previous);
            alert('No se pudieron guardar los colaboradores en la base de datos.');
        }
    };

    const handleCycleObraStatus = async () => {
        if (!obra?.id || isStatusUpdating) return;
        const nextStatus = getNextObraStatus(obra.estado);
        setIsStatusUpdating(true);
        try {
            await updateObraFields(obra.id, { estado: nextStatus });
            setObra((prev: any) => ({ ...prev, estado: nextStatus }));
        } catch (error) {
            console.error('Error updating obra status:', error);
            alert('No se pudo actualizar el estado de la obra.');
        } finally {
            setIsStatusUpdating(false);
        }
    };

    const handleSaveInternalNotes = async () => {
        if (!obra?.id) return;
        try {
            await updateObraFields(obra.id, { notas_internas: internalNotes });
            setObra((prev: any) => ({ ...prev, notasInternas: internalNotes }));
            setIsNotesModalOpen(false);
        } catch (error) {
            console.error('Error saving internal notes:', error);
            alert('No se pudieron guardar las notas internas.');
        }
    };

    const openQuickUploadModal = () => {
        const defaultCategoryId =
            quickUploadCategories.find((opt) => opt.id === DEFAULT_QUICK_UPLOAD_CATEGORY_ID)?.id
            || quickUploadCategories[0]?.id
            || '';
        setQuickUploadCategoryId(defaultCategoryId);
        setIsQuickUploadModalOpen(true);
    };

    const scrollToContentAreaOnMobile = () => {
        if (typeof window === 'undefined' || window.innerWidth > 920) return;
        window.setTimeout(() => {
            contentAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 70);
    };

    const handleSaveEmpresa = async (data: any) => {
        try {
            if (editingContactId) {
                await updateEmpresaAPI(editingContactId, data);
            } else {
                await createEmpresaAPI(data);
            }
            setEditingContactId(null);
            setIsEmpresaModalOpen(false);
            await loadObraData();
        } catch (error) {
            console.error('Error saving empresa:', error);
            alert('No se pudo guardar la empresa.');
        }
    };

    const handleSavePersona = async (data: any) => {
        try {
            const payload = {
                ...data,
                correo: data?.correo || null,
                empresa_id: data?.empresa_id || null,
            };
            if (editingContactId) {
                await updatePersonaAPI(editingContactId, payload);
            } else {
                await createPersonaAPI({
                    nombre: payload.nombre,
                    apellidos: payload.apellidos,
                    correo: payload.correo,
                    tipo: payload.tipo,
                    empresa_id: payload.empresa_id
                });
            }
            setEditingContactId(null);
            setIsPersonaModalOpen(false);
            await loadObraData();
        } catch (error) {
            console.error('Error saving persona:', error);
            alert('No se pudo guardar la persona.');
        }
    };

    const executeDelete = async () => {
        const { id, itemType, isCoreRole, refId, key } = deleteModalState;

        try {
            if (itemType === 'persona') {
                await deletePersonaAPI(id);
            } else {
                await deleteEmpresaAPI(id);
            }

            if (isCoreRole && key) {
                const currentIds = obra[key];
                const updatedIds = Array.isArray(currentIds)
                    ? currentIds.filter((cid: string) => cid !== id)
                    : (currentIds === id ? null : currentIds);
                updateObraLocal(obra.id, { [key]: updatedIds });
            } else if (refId) {
                const updated = assignedContacts.filter(c => c.id !== refId);
                await persistAssignedContacts(updated);
            }

            setDeleteModalState({ ...deleteModalState, isOpen: false });
            await loadObraData();
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('No se pudo eliminar el contacto.');
        }
    };

    const executeUnassign = async () => {
        const { id, isCoreRole, refId, key } = deleteModalState;

        if (isCoreRole && key) {
            const currentIds = obra[key];
            const updatedIds = Array.isArray(currentIds)
                ? currentIds.filter((cid: string) => cid !== id)
                : (currentIds === id ? null : currentIds);
            updateObraLocal(obra.id, { [key]: updatedIds });
        } else if (refId) {
            const updated = assignedContacts.filter(c => c.id !== refId);
            await persistAssignedContacts(updated);
        }

        setDeleteModalState({ ...deleteModalState, isOpen: false });
        await loadObraData();
    };

    const normalizeObraForUi = (ob: any) => ({
        ...ob,
        codigoObra: ob.codigo_obra ?? ob.codigoObra ?? '',
        pem: ob.pem ?? null,
        promotorId: ob.promotor_ids ?? ob.promotorId ?? [],
        contratistaId: ob.contratista_ids ?? ob.contratistaId ?? [],
        coordinadorSysId: ob.coordinador_sys_ids ?? ob.coordinadorSysId ?? [],
        directorObraId: ob.director_obra_ids ?? ob.directorObraId ?? [],
        jefeObraId: ob.jefe_obra_ids ?? ob.jefeObraId ?? [],
        notasInternas: ob.notas_internas ?? ob.notasInternas ?? '',
    });

    const normalizeLibroRows = (rows: any[]) =>
        (rows || []).map((row: any, idx: number) => ({
            ...row,
            orden: row.orden ?? idx + 1,
            subcontrataId: row.subcontrata_id ?? row.subcontrataId,
            comitenteId: row.comitente_id ?? row.comitenteId,
            ordenComitente: row.orden_comitente ?? row.ordenComitente,
        }));

    const loadObraData = async () => {
        if (id) {
            try {
                const [obRaw, empresasApi, personasApi] = await Promise.all([
                    getObraWithRelations(id),
                    getEmpresasAPI(),
                    getPersonasAPI()
                ]);

                const ob = normalizeObraForUi(obRaw);
                setObra(ob);
                setInternalNotes(ob?.notasInternas || '');
                setAssignedContacts(ob?.agentes || []);

                const empresas = (empresasApi || []).map((e: any) => ({
                    ...e,
                    razonSocial: e.razon_social ?? e.razonSocial ?? ''
                }));
                const personas = (personasApi || []).map((p: any) => ({
                    ...p,
                    empresaId: p.empresa_id ?? p.empresaId ?? null
                }));

                setAllEmpresas(empresas);
                setAllPersonas(personas);

                // Fetch all files for counts and global view
                const allFiles = await getTodosDocumentos(id);
                setAllObraFiles(allFiles);
            } catch (error) {
                console.error('Error cargando obra:', error);
            }
        }
    };

    const refreshAllFiles = async () => {
        if (!id) return;
        const allFiles = await getTodosDocumentos(id);
        setAllObraFiles(allFiles);
    };

    useEffect(() => {
        loadObraData();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        const loadCategoryData = async () => {
            if (activeCategory) {
                try {
                    const docs = await getDocumentos(id, activeCategory.id);
                    setFiles(docs);
                    if (activeCategory.id === 'cat-reuniones') setReuniones(await getEventos(id, 'reunion'));
                    else if (activeCategory.id === 'cat-visitas') setVisitas(await getEventos(id, 'visita'));
                    else if (activeCategory.id === 'cat-libro-subcontrata') setLibroSubcontratas(normalizeLibroRows(await getLibroSubcontratasDB(id)));
                } catch (e) {
                    console.error('Error fetching category data', e);
                }
            } else if (folderStack.length > 0) {
                const activeFolder = folderStack[folderStack.length - 1];
                setFiles([]);
                if (activeFolder.id === 'fol-visitas-reuniones') {
                    setReuniones(await getEventos(id, 'reunion'));
                    setVisitas(await getEventos(id, 'visita'));
                } else if (activeFolder.id === 'fol-contratistas') {
                    setLibroSubcontratas(normalizeLibroRows(await getLibroSubcontratasDB(id)));
                }
            } else {
                // Global View
                setFiles(allObraFiles);
                setReuniones([]);
                setVisitas([]);
                setLibroSubcontratas([]);
            }
        };
        loadCategoryData();
    }, [id, activeCategory, folderStack, allObraFiles]);

    // Helper to get all files for a given folder by reading its descendants
    const getAllFolderFiles = (folder: any) => {
        let folderFiles: any[] = [];
        const processNode = (node: any, path: string) => {
            if (node.type === 'category') {
                const categoryFiles = allObraFiles
                    .filter(f => f.category_id === node.id)
                    .map((f: any) => ({ ...f, path: path === '' ? node.name : `${path} / ${node.name}`, categoryId: node.id }));
                folderFiles = [...folderFiles, ...categoryFiles];
            } else if (node.children) {
                node.children.forEach((child: any) => processNode(child, path === '' ? node.name : `${path} / ${node.name}`));
            }
        };
        processNode(folder, '');
        return folderFiles;
    };

    const getProjectGlobalFiles = () => {
        let allFiles: any[] = [];
        fileStructureTemplate.forEach(node => {
            const nodeFiles = getAllFolderFiles(node);
            allFiles = [...allFiles, ...nodeFiles];
        });
        return allFiles;
    };

    const onDrop = async (acceptedFiles: File[]) => {
        if (!id || !activeCategory) return;
        for (const file of acceptedFiles) {
            try {
                await uploadDocumento(id, activeCategory.id, file);
            } catch (e) {
                console.error("Error al subir archivo", e);
            }
        }
        setFiles(await getDocumentos(id, activeCategory.id));
        await refreshAllFiles();
    };

    const onDropQuickUpload = async (acceptedFiles: File[]) => {
        if (!id || !quickUploadCategoryId || acceptedFiles.length === 0) return;
        setIsQuickUploading(true);
        try {
            for (const file of acceptedFiles) {
                await uploadDocumento(id, quickUploadCategoryId, file);
            }
            await refreshAllFiles();
            if (activeCategory?.id === quickUploadCategoryId) {
                setFiles(await getDocumentos(id, quickUploadCategoryId));
            }
            setIsQuickUploadModalOpen(false);
        } catch (error) {
            console.error('Error in quick upload:', error);
            alert('No se pudieron subir los documentos.');
        } finally {
            setIsQuickUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
    const {
        getRootProps: getQuickUploadRootProps,
        getInputProps: getQuickUploadInputProps,
        isDragActive: isQuickUploadDragActive,
    } = useDropzone({
        onDrop: onDropQuickUpload,
        disabled: !quickUploadCategoryId || isQuickUploading,
    });


    const handleSaveEvent = async (tipo: 'reunion' | 'visita', record: any): Promise<string | null> => {
        if (!id) return null;
        const eventId = record.id || record.eventId || null;
        const dbRecord = {
            obra_id: id,
            tipo: tipo,
            titulo: record.title || record.titulo || 'Nuevo Evento',
            fecha_planificada: record.start || record.fecha_planificada,
            fecha_fin: record.end || record.fecha_fin,
            frecuencia: record.frecuencia || null,
            estado: record.estado || 'Planificada',
            coordinador_id: record.coordinadorId || record.coordinador_id || null,
        };
        let savedEventId = eventId;
        if (eventId) {
            await updateEvento(eventId, dbRecord);
        } else {
            const created = await createEvento(dbRecord);
            savedEventId = created.id;
        }
        if (tipo === 'reunion') setReuniones(await getEventos(id, 'reunion'));
        else setVisitas(await getEventos(id, 'visita'));
        setIsEventModalOpen(false);
        setEditingContactId(null);
        setEventModalInitialData(null);
        setDuplicateSourceEvent(null);
        setEventModalAnchorTop(null);
        return savedEventId;
    };

    const handleSaveEventReport = async (eventId: string, updatedData: any) => {
        const updates: any = {
            titulo: updatedData.title || updatedData.titulo, // Handle both possible keys depending on origin
            fecha_planificada: updatedData.start || updatedData.fecha_planificada,
            fecha_fin: updatedData.end || updatedData.fecha_fin,
            estado: updatedData.estado,
            coordinador_id: updatedData.coordinadorId || updatedData.coordinador_id,

            // New Report Fields mappings
            introduccion: updatedData.introduccion,
            asistentes: updatedData.asistentes,
            es_reunion_puntual: updatedData.esReunionPuntual === 'true' || updatedData.esReunionPuntual === true,
            orden_del_dia: updatedData.ordenDelDia,
            desarrollo_reunion: updatedData.desarrolloReunion,
            ubicacion: updatedData.ubicacion,
            tipo_obra: updatedData.tipoObra,
            recurso_preventivo: updatedData.recursoPreventivo,
            n_trabajadores: updatedData.nTrabajadores,
            trabajos_en_curso: updatedData.trabajosEnCurso,
            subcontratas: updatedData.subcontratas,
            unidades_ejecucion: updatedData.unidadesEjecucion,
            epis: updatedData.epis,
            medios_auxiliares: updatedData.mediosAuxiliares,
            instalacion_electrica: updatedData.instalacionElectrica,
            condiciones_ambientales: updatedData.condicionesAmbientales,
            organizacion_obra: updatedData.organizacionObra,
            observaciones: updatedData.observaciones,
            accidentes: updatedData.accidentes,
            recordatorio: updatedData.recordatorio,
            planificacion_trabajos: updatedData.planificacionTrabajos,
            coordenadas: updatedData.coordenadas,
            fecha_hora: updatedData.fechaHora,
            fotos: updatedData.fotos || [],
            firmas: updatedData.firmas || [],
            adjuntos: updatedData.adjuntos || [],
        };

        // Remove undefined keys to avoid overriding with nulls accidentally if not present
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        await updateEvento(eventId, updates);
        if (activeReportType === 'reunion' || activeCategory?.id === 'cat-reuniones') {
            setReuniones(await getEventos(id!, 'reunion'));
        } else {
            setVisitas(await getEventos(id!, 'visita'));
        }
        if (!updatedData.__keepOpen) {
            setActiveEvent(null);
        }
    };

    const handleAssignAgents = async (type: 'persona' | 'empresa', agentIds: string[]) => {
        if (!agentIds || agentIds.length === 0) return;

        const newContacts = agentIds.map(agentId => ({
            id: `agt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            agentId,
            type,
            role: 'Colaborador'
        }));

        const updated = [...assignedContacts, ...newContacts];
        await persistAssignedContacts(updated);
    };

    const activeFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
    const mainTreeNodes = fileStructureTemplate.filter((node: any) => node.id !== DEFAULT_QUICK_UPLOAD_CATEGORY_ID);
    const otrosTreeNode = fileStructureTemplate.find((node: any) => node.id === DEFAULT_QUICK_UPLOAD_CATEGORY_ID) || null;
    const isOtrosActive = activeCategory?.id === DEFAULT_QUICK_UPLOAD_CATEGORY_ID;

    // Global file summaries
    const projectGlobalFiles = getProjectGlobalFiles();
    const folderGlobalFiles = activeFolder ? getAllFolderFiles(activeFolder) : [];

    const findPersonaById = (agentId: string) => allPersonas.find((p: any) => p.id === agentId);
    const findEmpresaById = (agentId: string) => allEmpresas.find((e: any) => e.id === agentId);

    const formatAgentName = (agentId: string, type: 'persona' | 'empresa') => {
        if (type === 'persona') {
            const persona = findPersonaById(agentId);
            return persona ? `${persona.nombre} ${persona.apellidos || ''}`.trim() : 'Desconocido';
        } else {
            const empresa = findEmpresaById(agentId);
            return empresa ? (empresa.razonSocial || empresa.razon_social) : 'Desconocido';
        }
    };

    const formatComitenteName = (row: any) => {
        const comitenteRowId = row?.comitenteId;
        if (!comitenteRowId) return 'Contratista principal';
        if (comitenteRowId === row?.id && row?.ordenComitente) {
            return formatAgentName(row.ordenComitente, 'empresa');
        }
        const parent = libroSubcontratas.find((r: any) => r.id === comitenteRowId);
        if (!parent) return '---';
        return formatAgentName(parent.subcontrataId ?? parent.subcontrata_id, 'empresa');
    };

    const hasGeneratedActa = (row: any) =>
        row?.acta_generada === true ||
        row?.actaGenerada === true ||
        !!row?.acta_generada_at ||
        !!row?.actaGeneradaAt ||
        (Array.isArray(row?.adjuntos) && row.adjuntos.some((a: any) => a?.name === '__acta_generada__'));

    const handleOpenActaPreview = async (tipo: 'reunion' | 'visita', row: any) => {
        try {
            const url = await createActaPdfUrl(tipo, row, obra);
            window.open(url, '_blank');
        } catch (error) {
            console.error(error);
            alert('No se pudo generar la vista del acta.');
        }
    };

    const getEventTitle = (row: any) => row?.titulo || row?.title || 'Sin título';
    const getEventStart = (row: any) => row?.fecha_planificada || row?.start || '';
    const getEventEnd = (row: any) => row?.fecha_fin || row?.end || '';
    const getEventCoordinatorId = (row: any) => row?.coordinador_id || row?.coordinadorId || '';

    const buildDuplicateEventDraft = (source: any) => {
        const title = getEventTitle(source);
        const baseTitle = /\(copia\)$/i.test(title.trim()) ? title : `${title} (Copia)`;
        return {
            ...source,
            id: null,
            titulo: baseTitle,
            title: baseTitle,
            fecha_planificada: getEventStart(source),
            start: getEventStart(source),
            fecha_fin: getEventEnd(source) || getEventStart(source),
            end: getEventEnd(source) || getEventStart(source),
            frecuencia: source?.frecuencia || null,
            estado: source?.estado || 'Planificada',
            coordinador_id: getEventCoordinatorId(source) || null,
            coordinadorId: getEventCoordinatorId(source) || null,
        };
    };

    const buildDuplicatedReportUpdates = (source: any) => {
        const sourceEsPuntual =
            source?.es_reunion_puntual !== undefined && source?.es_reunion_puntual !== null
                ? source.es_reunion_puntual
                : (source?.esReunionPuntual === true || source?.esReunionPuntual === 'true');

        return {
            introduccion: source?.introduccion ?? null,
            asistentes: source?.asistentes ?? null,
            es_reunion_puntual: sourceEsPuntual,
            orden_del_dia: source?.orden_del_dia ?? source?.ordenDelDia ?? null,
            desarrollo_reunion: source?.desarrollo_reunion ?? source?.desarrolloReunion ?? null,
            ubicacion: source?.ubicacion ?? null,
            tipo_obra: source?.tipo_obra ?? source?.tipoObra ?? null,
            recurso_preventivo: source?.recurso_preventivo ?? source?.recursoPreventivo ?? null,
            n_trabajadores: source?.n_trabajadores ?? source?.nTrabajadores ?? null,
            trabajos_en_curso: source?.trabajos_en_curso ?? source?.trabajosEnCurso ?? null,
            subcontratas: source?.subcontratas ?? null,
            unidades_ejecucion: source?.unidades_ejecucion ?? source?.unidadesEjecucion ?? null,
            epis: source?.epis ?? null,
            medios_auxiliares: source?.medios_auxiliares ?? source?.mediosAuxiliares ?? null,
            instalacion_electrica: source?.instalacion_electrica ?? source?.instalacionElectrica ?? null,
            condiciones_ambientales: source?.condiciones_ambientales ?? source?.condicionesAmbientales ?? null,
            organizacion_obra: source?.organizacion_obra ?? source?.organizacionObra ?? null,
            observaciones: source?.observaciones ?? null,
            accidentes: source?.accidentes ?? null,
            recordatorio: source?.recordatorio ?? null,
            planificacion_trabajos: source?.planificacion_trabajos ?? source?.planificacionTrabajos ?? null,
            coordenadas: source?.coordenadas ?? null,
            fecha_hora: source?.fecha_hora ?? source?.fechaHora ?? null,
            fotos: [],
            firmas: [],
            adjuntos: [],
        };
    };

    const applyDuplicatedReportData = async (type: 'reunion' | 'visita', newEventId: string, source: any) => {
        if (!id) return;
        const reportUpdates = buildDuplicatedReportUpdates(source);
        await updateEvento(newEventId, reportUpdates);
        if (type === 'reunion') {
            setReuniones(await getEventos(id, 'reunion'));
        } else {
            setVisitas(await getEventos(id, 'visita'));
        }
    };

    const resolveEventModalAnchorTop = (triggerElement?: HTMLElement | null): number | null => {
        if (typeof window === 'undefined' || !triggerElement) return null;
        if (window.innerWidth > 920) return null; // keep centered on desktop
        const triggerRect = triggerElement.getBoundingClientRect();
        return Math.max(10, Math.round(triggerRect.top));
    };

    const resolveLibroModalAnchorTop = (triggerElement?: HTMLElement | null): number | null => {
        if (typeof window === 'undefined' || !triggerElement) return null;
        if (window.innerWidth > 920) return null;
        const triggerRect = triggerElement.getBoundingClientRect();
        return Math.max(10, Math.round(triggerRect.top));
    };

    const openLibroModal = (triggerElement?: HTMLElement | null) => {
        if (typeof window !== 'undefined' && window.innerWidth <= 920) {
            libroModalRestoreScrollRef.current = window.scrollY;
        } else {
            libroModalRestoreScrollRef.current = null;
        }
        setLibroModalAnchorTop(resolveLibroModalAnchorTop(triggerElement));
        setIsLibroModalOpen(true);
    };

    const closeLibroModal = () => {
        setIsLibroModalOpen(false);
        setLibroModalAnchorTop(null);
        const restoreTop = libroModalRestoreScrollRef.current;
        libroModalRestoreScrollRef.current = null;
        if (typeof window !== 'undefined' && typeof restoreTop === 'number' && window.innerWidth <= 920) {
            window.setTimeout(() => {
                window.scrollTo({ top: restoreTop, behavior: 'smooth' });
            }, 100);
        }
    };

    const openCreateEventModal = (type: 'reunion' | 'visita', triggerElement?: HTMLElement | null) => {
        setEventTypeToCreate(type);
        setActiveEvent(null);
        setEditingContactId(null);
        setEventModalInitialData(null);
        setDuplicateSourceEvent(null);
        setEventModalAnchorTop(resolveEventModalAnchorTop(triggerElement));
        setIsEventModalOpen(true);
    };

    const openEditEventModal = (type: 'reunion' | 'visita', row: any, triggerElement?: HTMLElement | null) => {
        setActiveReportType(type);
        setActiveEvent(null);
        setEditingContactId(row.id);
        setEventTypeToCreate(type);
        setEventModalInitialData(row);
        setDuplicateSourceEvent(null);
        setEventModalAnchorTop(resolveEventModalAnchorTop(triggerElement));
        setIsEventModalOpen(true);
    };

    const openDuplicateEventModal = (type: 'reunion' | 'visita', row: any, triggerElement?: HTMLElement | null) => {
        setEventTypeToCreate(type);
        setEditingContactId(null);
        setDuplicateSourceEvent(row);
        setEventModalInitialData(buildDuplicateEventDraft(row));
        setActiveEvent(null);
        setEventModalAnchorTop(resolveEventModalAnchorTop(triggerElement));
        setIsEventModalOpen(true);
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

    const handleUpdateGlobalFile = async (_categoryId: string, fileId: string, field: string, value: any) => {
        await updateDocumentoMetadata(fileId, { [field]: value });
        await refreshAllFiles();
        if (activeCategory) {
            setFiles(await getDocumentos(id!, activeCategory.id));
        }
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        // Since projectGlobalFiles recalculates every render, we can get it:
        const allFiles = projectGlobalFiles;

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

    const renderEventsTable = (type: 'reunion' | 'visita', events: any[]) => {

        return (
            <Card style={{ backgroundColor: 'white', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>
                        {type === 'reunion' ? `Reuniones (${events.length})` : `Visitas (${events.length})`}
                    </h4>
                    <Button onClick={(e) => {
                        openCreateEventModal(type, e.currentTarget);
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
                        <table className="table events-table" style={{ width: '100%' }}>
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
                                                <strong>{getEventTitle(row)}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Planificada:</span> {new Date(getEventStart(row)).toLocaleDateString()}<br />
                                                <span style={{ color: 'var(--text-muted)' }}>Fin:</span> {new Date(getEventEnd(row)).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}><Badge status={row.estado || 'Planificada'}>{row.estado || 'Planificada'}</Badge></td>
                                        <td>{formatAgentName(getEventCoordinatorId(row), 'persona')}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="events-actions-group" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                {hasGeneratedActa(row) && (
                                                    <button onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await handleOpenActaPreview(type, row);
                                                    }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} title="Ver Acta">
                                                        <FileText size={18} />
                                                    </button>
                                                )}
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditEventModal(type, row, e.currentTarget as HTMLElement);
                                                }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar Metadatos">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDuplicateEventModal(type, row, e.currentTarget as HTMLElement);
                                                }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: '#0284c7' }} title="Duplicar">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm("¿Eliminar registro?")) {
                                                        await deleteEvento(row.id);
                                                        if (type === 'reunion') {
                                                            setReuniones(await getEventos(id!, 'reunion'));
                                                        } else {
                                                            setVisitas(await getEventos(id!, 'visita'));
                                                        }
                                                    }
                                                }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: '#ef4444' }} title="Eliminar">
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

    const renderFileItem = (f: DocumentoMetaData, isGlobal: boolean = false) => {
        return (
            <FileItem
                key={f.id}
                file={f}
                categoryId={isGlobal ? f.category_id! : activeCategory!.id}
                isGlobal={isGlobal}
                onUpdate={handleUpdateGlobalFile}
                onDelete={async (_catId, fileId, filePath) => {
                    if (window.confirm("¿Eliminar archivo?")) {
                        await deleteDocumento(fileId, filePath || null);
                        loadObraData();
                    }
                }}
            />
        );
    };


    return (
        <>
            <div className="animate-fade-in">
                <div className="project-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <ArrowLeft size={16} /> Volver a Obras
                    </Link>
                    <div className="project-topbar-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setInternalNotes(obra?.notasInternas || '');
                                setIsNotesModalOpen(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)' }}
                        >
                            <StickyNote size={16} /> Notas Internas
                        </Button>
                        <Button variant="outline" onClick={openQuickUploadModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UploadCloud size={16} /> Subida rápida
                        </Button>
                        <Button onClick={handleDownloadZip} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={16} /> Descargar Documentación (ZIP)
                        </Button>
                    </div>
                </div>

                <div className="project-summary flex justify-between items-start" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div>
                        <div className="project-summary-header flex items-center gap-4 mb-2">
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)', letterSpacing: '-0.025em' }}>{obra.denominacion}</h1>
                            <div className="project-status-actions flex items-center gap-2">
                                <Badge status={badgeStatusForObra(obra.estado)}>{formatObraStatus(obra.estado)}</Badge>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCycleObraStatus}
                                    disabled={isStatusUpdating}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'normal', textAlign: 'left' }}
                                    title={`Cambiar a ${formatObraStatus(getNextObraStatus(obra.estado))}`}
                                >
                                    <RotateCw size={14} />
                                    {isStatusUpdating ? 'Actualizando...' : `Pasar a ${formatObraStatus(getNextObraStatus(obra.estado))}`}
                                </Button>
                                {obra.tipologia && <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500, marginLeft: '0.25rem' }}>{obra.tipologia}</span>}
                            </div>
                        </div>
                        <div className="project-summary-meta flex gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            <span>Ref: {obra.codigoObra}</span>
                            <span>Exp: {obra.expediente}</span>
                            {obra.pem !== null && obra.pem !== undefined && obra.pem !== '' && <span>P.E.M.: {formatPem(obra.pem)}</span>}
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

                <div className="project-details-grid" style={{ display: 'grid', gridTemplateColumns: isSidebarOpen ? 'minmax(280px, 1fr) 3fr' : 'auto 1fr', gap: '2rem', height: 'calc(100vh - 220px)', minHeight: '600px', transition: 'grid-template-columns 0.3s ease' }}>
                    {/* Document Tree Sidebar */}
                    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', width: isSidebarOpen ? 'auto' : 'fit-content' }}>
                        <div className={`flex ${isSidebarOpen ? 'justify-between' : 'justify-center'} items-center`} style={{ padding: '1rem', paddingBottom: '0.5rem', borderBottom: isSidebarOpen ? '1px solid var(--border-color)' : 'none' }}>
                            {isSidebarOpen && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0.5rem', flex: 1, minWidth: 0 }}>
                                    <button
                                        onClick={() => {
                                            setActiveCategory(null);
                                            setFolderStack([]);
                                            setActiveEvent(null);
                                        }}
                                        style={{
                                            fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
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
                                    {otrosTreeNode && (
                                        <button
                                            onClick={() => {
                                                setActiveCategory(otrosTreeNode);
                                                setFolderStack([]);
                                                setActiveEvent(null);
                                            }}
                                            style={{
                                                fontSize: '0.85rem',
                                                background: isOtrosActive ? 'var(--color-surface-hover)' : 'white',
                                                border: `1px solid ${isOtrosActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                cursor: 'pointer',
                                                color: 'var(--color-primary-dark)',
                                                fontWeight: 600,
                                                padding: '0.45rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                outline: 'none',
                                                transition: 'all var(--transition-fast)',
                                                boxShadow: 'var(--shadow-sm)',
                                                whiteSpace: 'nowrap'
                                            }}
                                            className="hover:bg-surface-hover"
                                            title="Acceso rápido a Otros"
                                        >
                                            Otros
                                        </button>
                                    )}
                                </div>
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
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.85rem' }}>
                                {mainTreeNodes.map((node) => (
                                    <DocumentTreeNode
                                        key={node.id}
                                        node={node}
                                        activeCategoryId={activeCategory?.id}
                                        onSelectCategory={setActiveCategory}
                                        activeFolder={activeFolder}
                                        setFolderStack={setFolderStack}
                                        onClearEvent={() => setActiveEvent(null)}
                                        allObraFiles={allObraFiles}
                                        onNodeSelected={scrollToContentAreaOnMobile}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Content Area */}
                    <div ref={contentAreaRef} style={{ height: '100%' }}>
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
                                    allPersonas={allPersonas}
                                    allEmpresas={allEmpresas}
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
                                                        onFilesChanged={refreshAllFiles}
                                                    />
                                                ))}
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>
                                                        Libro de Subcontratación ({libroSubcontratas.length} registros)
                                                    </h4>
                                                    <Button size="sm" onClick={(e) => openLibroModal(e.currentTarget as HTMLElement)}>+ Añadir Fila</Button>
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
                                                                    <th>Comitente</th>
                                                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {libroSubcontratas.map((row: any, index: number) => (
                                                                    <tr key={index}>
                                                                        <td style={{ textAlign: 'center' }}>{row.orden || index + 1}</td>
                                                                        <td>{formatAgentName(row.subcontrataId, 'empresa')}</td>
                                                                        <td style={{ textAlign: 'center' }}>{row.nivel}</td>
                                                                        <td style={{ textAlign: 'center' }}>{formatComitenteName(row)}</td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <button onClick={async () => {
                                                                                if (window.confirm("¿Eliminar registro?")) {
                                                                                    await deleteLibroEntry(row.id);
                                                                                    setLibroSubcontratas(normalizeLibroRows(await getLibroSubcontratasDB(id!)));
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
                                            {renderEventsTable('visita', visitas)}
                                            {renderEventsTable('reunion', reuniones)}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {activeFolder.children.filter((c: any) => c.id === 'cat-li').map((child: any) => (
                                                    <StandaloneCategoryDropzone
                                                        key={child.id}
                                                        obraId={id!}
                                                        category={child}
                                                        onFilesChanged={refreshAllFiles}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (activeFolder && activeFolder.children && activeFolder.children.every((c: any) => c.type === 'category')) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {activeFolder.children?.map((child: any) => (
                                                <StandaloneCategoryDropzone
                                                    key={child.id}
                                                    obraId={id!}
                                                    category={child}
                                                    onFilesChanged={() => {
                                                        refreshAllFiles();
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                            {activeFolder.children?.map((child: any) => {
                                                const count = getNodeFileCount(child, allObraFiles);
                                                return (
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
                                                        style={{ position: 'relative' }}
                                                    >
                                                        {count > 0 && (
                                                            <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.7rem', backgroundColor: 'var(--color-surface)', padding: '0.15rem 0.4rem', borderRadius: '12px', color: 'var(--text-muted)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                                                                {count}
                                                            </span>
                                                        )}
                                                        {child.type === 'category' ? (
                                                            <FileIcon size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                                                        ) : (
                                                            <Folders size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                                                        )}
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, textAlign: 'center' }}>{child.name}</span>
                                                    </Card>
                                                );
                                            })}
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
                                                    onDelete={async (_catId: string, fileId: string, filePath?: string | null) => {
                                                        if (window.confirm("¿Eliminar archivo?")) {
                                                            await deleteDocumento(fileId, filePath || null);
                                                            loadObraData();
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
                                <div className="card-header" style={{ backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <button
                                                onClick={() => {
                                                    setActiveCategory(null);
                                                    setActiveEvent(null);
                                                    setFolderStack([]);
                                                }}
                                                className="btn-icon" style={{ padding: '0.25rem' }}
                                            >
                                                <ArrowLeft size={16} />
                                            </button>
                                            <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                                                {activeCategory.name}
                                            </h3>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sube y gestiona los archivos para esta Sección.</p>
                                    </div>
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
                                                allPersonas={allPersonas}
                                                allEmpresas={allEmpresas}
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
                                                                                        const emp = findEmpresaById(id);
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
                                                                                const emp = findEmpresaById(c.agentId);
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
                                                                                        const person = findPersonaById(id);
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
                                                                                    const person = findPersonaById(c.agentId);
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
                                                        <Button size="sm" onClick={(e) => openLibroModal(e.currentTarget as HTMLElement)}>+ Añadir Fila</Button>
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
                                                                        <th>Comitente</th>
                                                                        <th style={{ textAlign: 'center' }}>Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {libroSubcontratas.map((row: any, index: number) => (
                                                                        <tr key={index}>
                                                                            <td style={{ textAlign: 'center' }}>{row.orden || index + 1}</td>
                                                                            <td>{formatAgentName(row.subcontrataId, 'empresa')}</td>
                                                                            <td style={{ textAlign: 'center' }}>{row.nivel}</td>
                                                                            <td style={{ textAlign: 'center' }}>{formatComitenteName(row)}</td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                <button onClick={async () => {
                                                                                    if (window.confirm("¿Eliminar registro?")) {
                                                                                        await deleteLibroEntry(row.id);
                                                                                        setLibroSubcontratas(normalizeLibroRows(await getLibroSubcontratasDB(id!)));
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
                                                    {/* Dropzone with Template Selection */}
                                                    {activeCategory.id !== 'cat-reuniones' && activeCategory.id !== 'cat-visitas' && (
                                                        <div className="template-upload-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                                                            <div
                                                                {...getRootProps()}
                                                                style={{
                                                                    border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                                    borderRadius: 'var(--radius-lg)',
                                                                    padding: '3rem 2rem',
                                                                    textAlign: 'center',
                                                                    backgroundColor: isDragActive ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all var(--transition-fast)',
                                                                    flex: 2,
                                                                    minWidth: 0
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

                                                            {activeCategoryTemplates.length > 0 && (
                                                                <div className="template-picker-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                                                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>O elegir plantilla de {activeCategory.name}:</label>
                                                                    <div className="template-picker-row" style={{ display: 'flex', gap: '0.5rem' }}>
                                                                        <select
                                                                            value={selectedTemplateId}
                                                                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                                                                            className="input-field"
                                                                            style={{ flex: 1, padding: '0.625rem 0.75rem', minWidth: 0 }}
                                                                        >
                                                                            <option value="">Seleccionar...</option>
                                                                            {activeCategoryTemplates.map((p: any) => (
                                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button
                                                                            disabled={!selectedTemplateId}
                                                                            onClick={async () => {
                                                                                const plantilla = activeCategoryTemplates.find((p: any) => p.id === selectedTemplateId);
                                                                                if (plantilla) {
                                                                                    const file = await plantillaToFile(plantilla);
                                                                                    await uploadDocumento(id!, activeCategory.id, file);
                                                                                    setFiles(await getDocumentos(id!, activeCategory.id));
                                                                                    await refreshAllFiles();
                                                                                    setSelectedTemplateId('');
                                                                                }
                                                                            }}
                                                                            className="btn btn-primary template-add-btn"
                                                                            style={{ padding: '0.625rem 1rem' }}
                                                                        >
                                                                            Añadir
                                                                        </button>
                                                                    </div>
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
                                                                <Button onClick={(e) => {
                                                                    openCreateEventModal(
                                                                        activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita',
                                                                        e.currentTarget
                                                                    );
                                                                }} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
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
                                                                    <table className="table events-table" style={{ width: '100%' }}>
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
                                                                                            <strong>{getEventTitle(row)}</strong>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td>
                                                                                        <div style={{ fontSize: '0.85rem' }}>
                                                                                            <span style={{ color: 'var(--text-muted)' }}>Inicio:</span> {new Date(getEventStart(row)).toLocaleString()}<br />
                                                                                            <span style={{ color: 'var(--text-muted)' }}>Fin:</span> {new Date(getEventEnd(row)).toLocaleString()}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td style={{ textAlign: 'center' }}><span className="badge badge-en-curso">{row.estado}</span></td>
                                                                                    <td style={{ textTransform: 'capitalize' }}>{row.frecuencia}</td>
                                                                                    <td>{formatAgentName(getEventCoordinatorId(row), 'persona')}</td>
                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                        <div className="events-actions-group" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                                            {hasGeneratedActa(row) && (
                                                                                                <button onClick={async (e) => {
                                                                                                    e.stopPropagation();
                                                                                                    await handleOpenActaPreview(activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita', row);
                                                                                                }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} title="Ver Acta">
                                                                                                    <FileText size={18} />
                                                                                                </button>
                                                                                            )}
                                                                                            <button onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openEditEventModal(
                                                                                                    activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita',
                                                                                                    row,
                                                                                                    e.currentTarget as HTMLElement
                                                                                                );
                                                                                            }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: 'var(--text-main)' }} title="Editar Metadatos">
                                                                                                <Edit2 size={18} />
                                                                                            </button>
                                                                                            <button onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openDuplicateEventModal(
                                                                                                    activeCategory.id === 'cat-reuniones' ? 'reunion' : 'visita',
                                                                                                    row,
                                                                                                    e.currentTarget as HTMLElement
                                                                                                );
                                                                                            }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: '#0284c7' }} title="Duplicar">
                                                                                                <Copy size={18} />
                                                                                            </button>
                                                                                            <button onClick={async (e) => {
                                                                                                e.stopPropagation();
                                                                                                if (window.confirm("¿Eliminar registro?")) {
                                                                                                    await deleteEvento(row.id);
                                                                                                    if (activeCategory.id === 'cat-reuniones') {
                                                                                                        setReuniones(await getEventos(id!, 'reunion'));
                                                                                                    } else {
                                                                                                        setVisitas(await getEventos(id!, 'visita'));
                                                                                                    }
                                                                                                }
                                                                                            }} className="btn btn-ghost event-action-btn" style={{ padding: '0.4rem', color: '#ef4444' }} title="Eliminar">
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

                                                    {/* Sección de Plantillas si aplican a esta categoría - ELIMINADA DE AQUÍ (MOVIDA AL HEADER) */}
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
                </div>

                {/* Event Modals */}
                <EventModal
                    isOpen={isEventModalOpen}
                    onClose={() => {
                        setIsEventModalOpen(false);
                        setActiveEvent(null);
                        setEditingContactId(null);
                        setEventModalInitialData(null);
                        setDuplicateSourceEvent(null);
                        setEventModalAnchorTop(null);
                    }}
                    onSave={async (data) => {
                        try {
                            const isEditing = Boolean(editingContactId);
                            const eventId = editingContactId || null;
                            const savedEventId = await handleSaveEvent(eventTypeToCreate, { id: eventId, ...data });
                            if (!isEditing && duplicateSourceEvent && savedEventId) {
                                try {
                                    await applyDuplicatedReportData(eventTypeToCreate, savedEventId, duplicateSourceEvent);
                                } catch (copyError) {
                                    console.error('Error copiando datos de informe en duplicado:', copyError);
                                    alert('El evento se creó, pero no se pudieron copiar los datos del informe.');
                                }
                            }
                        } catch (error) {
                            console.error('Error guardando evento:', error);
                            alert('No se pudo guardar el evento.');
                        }
                    }}
                    obra={obra}
                    tipo={eventTypeToCreate}
                    defaultTitle={eventTypeToCreate === 'reunion' ? `Acta Reunión ${(reuniones.length + 1).toString().padStart(3, '0')}` : `Acta visita ${(visitas.length + 1).toString().padStart(3, '0')}`}
                    assignedContacts={assignedContacts}
                    formatAgentName={formatAgentName}
                    initialData={eventModalInitialData}
                    mobileAnchorTop={eventModalAnchorTop}
                />

                {/* Contactos Modals */}
            </div >

            {isPersonaModalOpen && (
                <PersonaModal
                    initialData={editingContactId ? findPersonaById(editingContactId) : null}
                    empresas={allEmpresas}
                    onClose={() => { setIsPersonaModalOpen(false); setEditingContactId(null); }}
                    onSave={handleSavePersona}
                />
            )
            }
            {
                isEmpresaModalOpen && (
                    <EmpresaModal
                        initialData={editingContactId ? findEmpresaById(editingContactId) : null}
                        onClose={() => { setIsEmpresaModalOpen(false); setEditingContactId(null); }}
                        onSave={handleSaveEmpresa}
                    />
                )
            }

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
                onClose={closeLibroModal}
                mobileAnchorTop={libroModalAnchorTop}
                empresas={allEmpresas}
                libroActual={libroSubcontratas}
                defaultContratistaIds={Array.isArray(obra?.contratistaId) ? obra.contratistaId : (obra?.contratistaId ? [obra.contratistaId] : [])}
                onSave={async (data) => {
                    const created = await createLibroEntry({
                        obra_id: id!,
                        subcontrata_id: data.subcontrataId,
                        nivel: data.nivel,
                        comitente_id: data.comitenteId || null,
                        orden_comitente: data.contratistaId || null,
                    } as any);
                    if (!created.comitente_id) {
                        await updateLibroEntry(created.id, { comitente_id: created.id });
                    }
                    setLibroSubcontratas(normalizeLibroRows(await getLibroSubcontratasDB(id!)));
                    closeLibroModal();
                }}
            />

            {/* Notas Internas Modal */}
            {
                isNotesModalOpen && (
                    <div className="app-modal-overlay" style={{
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
                                <Button onClick={handleSaveInternalNotes} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={16} /> Guardar Notas
                                </Button>
                            </div>
                        </Card>
                    </div>
                )
            }

            {isQuickUploadModalOpen && (
                <div className="app-modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '640px', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UploadCloud size={20} /> Subida rápida de documentos
                            </h3>
                            <button onClick={() => setIsQuickUploadModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Categoría destino</label>
                                <select
                                    value={quickUploadCategoryId}
                                    onChange={(e) => setQuickUploadCategoryId(e.target.value)}
                                    className="input-field"
                                    style={{ backgroundColor: 'white' }}
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {quickUploadCategories.map((opt) => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div
                                {...getQuickUploadRootProps()}
                                style={{
                                    border: `2px dashed ${isQuickUploadDragActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '2.5rem 1.5rem',
                                    textAlign: 'center',
                                    backgroundColor: isQuickUploadDragActive ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                    cursor: quickUploadCategoryId && !isQuickUploading ? 'pointer' : 'not-allowed',
                                    opacity: quickUploadCategoryId ? 1 : 0.65,
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                <input {...getQuickUploadInputProps()} />
                                <UploadCloud size={36} style={{ color: isQuickUploadDragActive ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                                {!quickUploadCategoryId ? (
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Selecciona una categoría para subir archivos.</p>
                                ) : isQuickUploading ? (
                                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary-dark)' }}>Subiendo archivos...</p>
                                ) : isQuickUploadDragActive ? (
                                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary-dark)' }}>Suelta los archivos aquí...</p>
                                ) : (
                                    <p style={{ margin: 0 }}>Arrastra y suelta archivos aquí, o haz clic para seleccionar.</p>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <Button variant="outline" onClick={() => setIsQuickUploadModalOpen(false)} disabled={isQuickUploading}>
                                Cerrar
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}







