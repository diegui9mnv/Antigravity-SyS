import { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardBody, Badge } from '../components/ui';
import { UploadCloud, Folder, FileText, Trash2, Search, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { fileStructureTemplate, getPlantillasByCategory, savePlantilla, deletePlantilla } from '../store';

// Helper to flatten the categories for easy searching and selection
const flattenCategories = (nodes: any[], parentPath = ''): { id: string, name: string, path: string }[] => {
    let result: { id: string, name: string, path: string }[] = [];
    for (const node of nodes) {
        const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
        if (node.type === 'category') {
            result.push({ id: node.id, name: node.name, path: currentPath });
        }
        if (node.children) {
            result = result.concat(flattenCategories(node.children, currentPath));
        }
    }
    return result;
};

export default function Plantillas() {
    const allCategories = useMemo(() => flattenCategories(fileStructureTemplate), []);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string, path: string } | null>(null);
    const [templates, setTemplates] = useState<any[]>([]);

    const filteredCategories = useMemo(() => {
        if (!searchTerm) return allCategories;
        const lowerTerm = searchTerm.toLowerCase();
        return allCategories.filter(cat =>
            cat.name.toLowerCase().includes(lowerTerm) ||
            cat.path.toLowerCase().includes(lowerTerm)
        );
    }, [allCategories, searchTerm]);

    const handleSelectCategory = (cat: { id: string, name: string, path: string }) => {
        setSelectedCategory(cat);
        setTemplates(getPlantillasByCategory(cat.id));
        setSearchTerm('');
    };

    const handleClearSelection = () => {
        setSelectedCategory(null);
        setTemplates([]);
    };

    const handleDelete = (templateId: string) => {
        if (!selectedCategory) return;
        if (window.confirm('¿Está seguro de que desea eliminar esta plantilla?')) {
            deletePlantilla(selectedCategory.id, templateId);
            setTemplates(getPlantillasByCategory(selectedCategory.id));
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (!selectedCategory || acceptedFiles.length === 0) return;

        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newPlantilla = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target?.result as string,
                    dateAdded: new Date().toISOString()
                };
                savePlantilla(selectedCategory.id, newPlantilla);
                setTemplates(getPlantillasByCategory(selectedCategory.id));
            };
            reader.readAsDataURL(file);
        });
    }, [selectedCategory]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div style={{ padding: '2rem 0', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileText size={28} />
                    Gestión de Plantillas (CEMOSA)
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Sube y administra documentos base que podrán ser utilizados como plantillas en todas las obras.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                {/* Categorías Sidebar */}
                <Card style={{ height: 'fit-content' }}>
                    <CardHeader>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Folder size={18} />
                            Seleccionar Subsección
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <div style={{ padding: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o ruta..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input-field"
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map(cat => (
                                        <div
                                            key={cat.id}
                                            onClick={() => handleSelectCategory(cat)}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: selectedCategory?.id === cat.id ? '#f0f7ff' : 'var(--color-background)',
                                                border: `1px solid ${selectedCategory?.id === cat.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                boxShadow: selectedCategory?.id === cat.id ? '0 2px 4px rgba(59, 130, 246, 0.1)' : 'none',
                                                transition: 'all 0.2s ease',
                                            }}
                                            className="hover:border-blue-300"
                                        >
                                            <div style={{ fontWeight: 600, color: selectedCategory?.id === cat.id ? 'var(--color-primary-dark)' : 'var(--text-main)' }}>
                                                {cat.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: selectedCategory?.id === cat.id ? '#3b82f6' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                {cat.path}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                        No se encontraron categorías.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Área Principal de Plantillas */}
                <div>
                    {!selectedCategory ? (
                        <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '400px' }}>
                                <Folder size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Ninguna subsección seleccionada</h3>
                                <p>Selecciona una categoría de la lista de la izquierda para ver o subir plantillas asociadas a esa sección.</p>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Header de la categoría */}
                            <Card>
                                <CardBody>
                                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary)', border: '1px solid #e2e8f0' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary-dark)', fontWeight: 700 }}>{selectedCategory.name}</h2>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Folder size={14} /> {selectedCategory.path}
                                            </div>
                                        </div>
                                        <button onClick={handleClearSelection} className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--text-muted)' }} title="Deseleccionar">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Zona de Subida */}
                            <Card>
                                <CardHeader>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Subir Nueva Plantilla</h3>
                                </CardHeader>
                                <CardBody>
                                    <div {...getRootProps()} style={{
                                        border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                        borderRadius: '12px',
                                        padding: '3rem 2rem',
                                        textAlign: 'center',
                                        backgroundColor: isDragActive ? 'var(--color-primary-light)' : 'var(--color-background)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}>
                                        <input {...getInputProps()} />
                                        <UploadCloud size={48} style={{ margin: '0 auto 1rem', color: isDragActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                                        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                                            {isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra un archivo o haz clic aquí'}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            Los documentos subidos aquí estarán disponibles para usar como plantilla en todas las obras.
                                        </p>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Lista de Plantillas */}
                            <Card>
                                <CardHeader>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Plantillas Disponibles
                                        <Badge status={templates.length > 0 ? "Completada" : "default"}>{templates.length}</Badge>
                                    </h3>
                                </CardHeader>
                                <CardBody>
                                    <div>
                                        {templates.length === 0 ? (
                                            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No hay plantillas subidas para esta subsección.
                                            </div>
                                        ) : (
                                            <div className="table-container" style={{ margin: 0 }}>
                                                <table className="table" style={{ width: '100%' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Nombre del Archivo</th>
                                                            <th>Tamaño</th>
                                                            <th>Fecha de Subida</th>
                                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {templates.map(tpl => (
                                                            <tr key={tpl.id}>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <FileText size={16} className="text-blue-500" />
                                                                        <span style={{ fontWeight: 500 }}>{tpl.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                                    {formatBytes(tpl.size)}
                                                                </td>
                                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                                    {new Date(tpl.dateAdded).toLocaleDateString()}
                                                                </td>
                                                                <td style={{ textAlign: 'right' }}>
                                                                    <button
                                                                        onClick={() => handleDelete(tpl.id)}
                                                                        className="btn btn-ghost"
                                                                        style={{ color: 'var(--color-danger)', padding: '0.4rem' }}
                                                                        title="Eliminar plantilla"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
