import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Folders, File as FileIcon, UploadCloud, Trash2 } from 'lucide-react';
import { getObra, fileStructureTemplate, getFiles, addFile } from '../store';
import { Card, Badge, Button } from '../components/ui';
import { useDropzone } from 'react-dropzone';

// Recursive component for rendering the document tree
const DocumentTreeNode = ({ node, level = 0, activeCategoryId, onSelectCategory }: any) => {
    const [isOpen, setIsOpen] = useState(level < 1);
    const paddingLeft = `${level * 1.5 + 1}rem`;

    const isCategory = node.type === 'category';
    const isActive = activeCategoryId === node.id;

    const handleClick = () => {
        if (isCategory) {
            onSelectCategory(node);
        } else {
            setIsOpen(!isOpen);
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
                    backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
                    color: isActive ? 'var(--color-primary-dark)' : 'var(--text-main)',
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                    transition: 'all var(--transition-fast)'
                }}
                className="hover:bg-surface"
            >
                {isCategory ? (
                    <FileIcon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                ) : (
                    <Folders size={16} style={{ color: 'var(--color-primary)' }} />
                )}
                <span style={{ fontSize: '0.875rem' }}>{node.name}</span>
            </div>

            {!isCategory && isOpen && node.children && (
                <div className="animate-fade-in" style={{ animationDuration: '150ms' }}>
                    {node.children.map((child: any) => (
                        <DocumentTreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            activeCategoryId={activeCategoryId}
                            onSelectCategory={onSelectCategory}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function ProjectDetails() {
    const { id } = useParams<{ id: string }>();
    const [obra, setObra] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState<any>(null);
    const [files, setFiles] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            setObra(getObra(id));
        }
    }, [id]);

    useEffect(() => {
        if (id && activeCategory) {
            setFiles(getFiles(id, activeCategory.id));
        } else {
            setFiles([]);
        }
    }, [id, activeCategory]);

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

    if (!obra) return <div className="container" style={{ padding: '2rem 0' }}>Cargando obra...</div>;

    return (
        <div className="animate-fade-in">
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                <ArrowLeft size={16} /> Volver a Obras
            </Link>

            <div className="flex justify-between items-start" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>{obra.denominacion}</h1>
                    <div className="flex gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <span>Ref: {obra.codigoObra}</span>
                        <span>Exp: {obra.expediente}</span>
                    </div>
                </div>
                <Badge status={obra.estado}>{obra.estado}</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 3fr', gap: '2rem', height: 'calc(100vh - 220px)', minHeight: '600px' }}>
                {/* Document Tree Sidebar */}
                <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header">
                        <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Folders size={18} /> Árbol Documental
                        </h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                        {fileStructureTemplate.map((node) => (
                            <DocumentTreeNode
                                key={node.id}
                                node={node}
                                activeCategoryId={activeCategory?.id}
                                onSelectCategory={setActiveCategory}
                            />
                        ))}
                    </div>
                </Card>

                {/* Content Area */}
                <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {activeCategory ? (
                        <>
                            <div className="card-header" style={{ backgroundColor: 'white' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary-dark)' }}>
                                    {activeCategory.name}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sube y gestiona los archivos para esta sección.</p>
                            </div>

                            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

                                {/* Dropzone */}
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

                                {/* File List */}
                                <div>
                                    <h4 style={{ marginBottom: '1rem', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Archivos ({files.length})</h4>
                                    {files.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No hay archivos en esta categoría.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {files.map(f => (
                                                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <FileIcon size={20} style={{ color: 'var(--color-primary)' }} />
                                                        <div>
                                                            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{f.name}</p>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {formatSize(f.size)} • Subido: {f.uploadDate}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" style={{ color: '#ef4444', padding: '0.5rem' }}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

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
    );
}
