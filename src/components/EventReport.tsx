import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button } from './ui';
import { ArrowLeft, Save, UploadCloud, Trash2, Camera, PenTool, Plus, FileText, Loader2, ExternalLink } from 'lucide-react';
import { getLibroSubcontratas } from '../store';
import { useDropzone } from 'react-dropzone';
import { createActaPdfUrl } from '../lib/actaPdf';

interface EventReportProps {
    tipo: 'reunion' | 'visita';
    eventData: any;
    obra: any;
    assignedContacts: any[];
    formatAgentName: (id: string, type: 'empresa' | 'persona') => string;
    onClose: () => void;
    onSave: (id: string, updatedData: any) => Promise<void> | void;
}

export const EventReport: React.FC<EventReportProps> = ({ tipo, eventData, obra, formatAgentName, onClose, onSave }) => {
    const ACTA_MARKER = '__acta_generada__';
    const [formData, setFormData] = useState<any>({
        // Original event data
        ...eventData,
        // Added report fields defaults
        tipoObra: eventData.tipoObra || eventData.tipo_obra || '',
        trabajosEnCurso: eventData.trabajosEnCurso || eventData.trabajos_en_curso || '',
        ubicacion: eventData.ubicacion || '',
        recursoPreventivo: eventData.recursoPreventivo || eventData.recurso_preventivo || '',
        nTrabajadores: eventData.nTrabajadores || eventData.n_trabajadores || '',
        subcontratas: eventData.subcontratas || '', // Will auto-fill if empty below
        unidadesEjecucion: eventData.unidadesEjecucion || eventData.unidades_ejecucion || '',
        epis: eventData.epis || '',
        mediosAuxiliares: eventData.mediosAuxiliares || eventData.medios_auxiliares || '',
        instalacionElectrica: eventData.instalacionElectrica || eventData.instalacion_electrica || '',
        condicionesAmbientales: eventData.condicionesAmbientales || eventData.condiciones_ambientales || '',
        organizacionObra: eventData.organizacionObra || eventData.organizacion_obra || '',
        coordenadas: eventData.coordenadas || '',
        fechaHora: eventData.fechaHora || eventData.fecha_hora || eventData.start || eventData.fecha_planificada || '',
        recordatorio: eventData.recordatorio || '',
        desarrolloReunion: eventData.desarrolloReunion || eventData.desarrollo_reunion || '',
        planificacionTrabajos: eventData.planificacionTrabajos || eventData.planificacion_trabajos || '',
        observaciones: eventData.observaciones || '',
        accidentes: eventData.accidentes || '',
        fotos: eventData.fotos || [], // Array of base64 images
        firmas: eventData.firmas || [], // Array of signature objects { id, nombre, empresa, fecha, url }
        adjuntos: eventData.adjuntos || [], // Array of files attached

        // New Reunion fields
        introduccion: eventData.introduccion || '',
        asistentes: eventData.asistentes || '',
        esReunionPuntual: eventData.esReunionPuntual !== undefined ? (eventData.esReunionPuntual === true || eventData.esReunionPuntual === 'true') : (eventData.es_reunion_puntual === true),
        ordenDelDia: eventData.ordenDelDia || eventData.orden_del_dia || `- Lectura del acta o conclusiones de la reunión anterior
- Situación de la documentación que debe aportarse por las empresas implicadas en la obra.
- Accidentes e incidentes ocurridos en la obra desde la reunión anterior.
- Planificación de trabajos para el próximo período. Detectar contradicciones, interferencias e incompatibilidades entre empresas y medidas a adoptar.
- Principales incidencias detectadas desde la última reunión.
- Equipos de trabajo (medios auxiliares, máquinas, herramientas y otros equipos).
- Medidas preventivas, protecciones colectivas e individuales, normas de seguridad y métodos de trabajo, conforme al Plan de Seguridad y Salud.
- Actualizaciones del Plan de Seguridad y Salud.
- Se enviará copia mediante correo electrónico a la Dirección Facultativa y a la contratista para que la reenvíen a las subcontratas que en el momento de la reunión intervienen en obra.
- Fecha celebración de la próxima reunión.
- Ruegos y preguntas`,
    });

    // Signature Pad State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [currentSigner, setCurrentSigner] = useState({ nombre: '', empresa: '' });

    // PDF Generation State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

    const hasPersistedActa = (data: any) =>
        Array.isArray(data?.adjuntos) &&
        data.adjuntos.some((a: any) => a?.name === ACTA_MARKER);
    const visibleAdjuntos = (Array.isArray(formData?.adjuntos) ? formData.adjuntos : []).filter((a: any) => a?.name !== ACTA_MARKER);

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        setGeneratedPdfUrl(null);

        try {
            const url = await createActaPdfUrl(tipo, formData, obra);
            setGeneratedPdfUrl(url);

            const markerAdjunto = { id: 'acta-marker', name: ACTA_MARKER, size: 0, type: 'marker', dataUrl: '' };
            const nextAdjuntos = Array.isArray(formData.adjuntos) ? [...formData.adjuntos] : [];
            if (!nextAdjuntos.some((a: any) => a?.name === ACTA_MARKER)) {
                nextAdjuntos.push(markerAdjunto);
            }

            const enriched = {
                ...formData,
                adjuntos: nextAdjuntos,
                actaGenerada: true,
                actaGeneradaAt: new Date().toISOString(),
                __keepOpen: true,
            };
            setFormData(enriched);
            await Promise.resolve(onSave(eventData.id || eventData.fallbackId, enriched));
        } catch (err: any) {
            console.error("Error generating PDF:", err);
            alert("Hubo un error al generar el PDF. Revisa que los datos introducidos sean correctos.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Auto-calculate Subcontratas based on Libro de Subcontratacion if empty
    useEffect(() => {
        if (!formData.subcontratas) {
            const libro = getLibroSubcontratas(obra.id);
            if (libro && libro.length > 0) {
                const names = libro.map((l: any) => formatAgentName(l.subcontrataId, 'empresa'));
                const uniqueNames = Array.from(new Set(names)).filter(n => n !== 'Desconocido');
                setFormData((prev: any) => ({ ...prev, subcontratas: uniqueNames.join('\n') }));
            }
        }
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleGetLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                handleChange('coordenadas', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }, () => {
                alert("Error obteniendo ubicación. Asegúrate de dar permisos al navegador.");
            });
        } else {
            alert("Tu navegador no soporta geolocalización.");
        }
    };

    const onDropFotos = (acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            acceptedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    setFormData((prev: any) => ({
                        ...prev,
                        fotos: [...(prev.fotos || []), { id: Date.now() + Math.random(), url: base64String }]
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const { getRootProps: getRootPropsFotos, getInputProps: getInputPropsFotos, isDragActive: isDragActiveFotos } = useDropzone({ onDrop: onDropFotos, accept: { 'image/*': [] } });

    const handleRemovePhoto = (photoId: number) => {
        setFormData((prev: any) => ({
            ...prev,
            fotos: prev.fotos.filter((p: any) => p.id !== photoId)
        }));
    };

    const onDropAdjuntos = (acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            // Store file references or process as needed. For now, assuming base64 storage for simplicity in the demo.
            acceptedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData((prev: any) => ({
                        ...prev,
                        adjuntos: [...(prev.adjuntos || []), {
                            id: Date.now() + Math.random(),
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            dataUrl: reader.result as string
                        }]
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const { getRootProps: getRootPropsAdjuntos, getInputProps: getInputPropsAdjuntos, isDragActive: isDragActiveAdjuntos } = useDropzone({ onDrop: onDropAdjuntos });

    const handleRemoveAdjunto = (adjuntoId: number) => {
        setFormData((prev: any) => ({
            ...prev,
            adjuntos: prev.adjuntos.filter((a: any) => a.id !== adjuntoId)
        }));
    };

    const handleSave = async () => {
        try {
            await Promise.resolve(onSave(eventData.id || eventData.fallbackId, formData));
            alert('Los cambios se han guardado correctamente.');
        } catch (error) {
            console.error('Error saving event report:', error);
            alert('No se pudieron guardar los cambios.');
        }
    };

    // --- Signature Pad Logic ---
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsSigning(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isSigning) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;
        if ('touches' in e) {
            // Prevent scrolling while drawing on mobile
            e.preventDefault();
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsSigning(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (!currentSigner.nombre) {
            alert("Por favor, introduce el nombre del firmante.");
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        setFormData((prev: any) => ({
            ...prev,
            firmas: [...(prev.firmas || []), {
                id: Date.now() + Math.random(),
                nombre: currentSigner.nombre,
                empresa: currentSigner.empresa,
                fecha: new Date().toLocaleString(),
                url: dataUrl
            }]
        }));

        setShowSignaturePad(false);
        setCurrentSigner({ nombre: '', empresa: '' });
    };

    const removeSignature = (id: number) => {
        setFormData((prev: any) => ({
            ...prev,
            firmas: prev.firmas.filter((f: any) => f.id !== id)
        }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
            {/* Header Sticky Bar */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 50,
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
                borderRadius: '8px',
                marginBottom: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={onClose} className="btn-icon" style={{ padding: '0.25rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                            Informe: {formData.titulo || formData.title || eventData.titulo || eventData.title || 'Sin título'}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Módulo de reportes y actas</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {(generatedPdfUrl || hasPersistedActa(formData)) && !isGeneratingPdf && (
                        <Button
                            onClick={async () => {
                                if (generatedPdfUrl) {
                                    window.open(generatedPdfUrl, '_blank');
                                    return;
                                }
                                const url = await createActaPdfUrl(tipo, formData, obra);
                                setGeneratedPdfUrl(url);
                                window.open(url, '_blank');
                            }}
                            style={{ backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                            className="hover:bg-emerald-600"
                        >
                            <ExternalLink size={16} /> Ver documento
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#3b82f6' }}
                        className="hover:bg-blue-50"
                    >
                        {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        {isGeneratingPdf ? 'Generando...' : 'Generar acta'}
                    </Button>

                    <Button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Save size={16} /> Guardar
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ position: 'relative', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

                {/* Loading Overlay */}
                {isGeneratingPdf && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px'
                    }}>
                        <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
                        <h3 className="text-xl font-semibold text-blue-900">Generando Acta...</h3>
                        <p className="text-gray-500">Recopilando información y firmas para el documento PDF.</p>
                    </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>

                    {/* Conditional Left Column Fields based on 'tipo' */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {tipo === 'visita' && (
                            <>
                                <Card>
                                    <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Datos Generales</h3></CardHeader>
                                    <CardBody>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="input-group">
                                                <label className="input-label">Fecha y Hora</label>
                                                <input type="datetime-local" value={formData.fechaHora} onChange={e => handleChange('fechaHora', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Coordenadas GPS</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input type="text" value={formData.coordenadas} onChange={e => handleChange('coordenadas', e.target.value)} className="input-field" placeholder="Latitud, Longitud" />
                                                    <Button variant="outline" onClick={handleGetLocation} title="Obtener ubicación actual" style={{ padding: '0.5rem' }}><Camera size={16} /></Button>
                                                </div>
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Ubicación / Sector</label>
                                                <input type="text" value={formData.ubicacion} onChange={e => handleChange('ubicacion', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Tipo de Obra</label>
                                                <input type="text" value={formData.tipoObra} onChange={e => handleChange('tipoObra', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Nº de Trabajadores</label>
                                                <input type="number" value={formData.nTrabajadores} onChange={e => handleChange('nTrabajadores', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Recurso Preventivo PRESENTE (SÍ/NO y DNI)</label>
                                                <input type="text" value={formData.recursoPreventivo} onChange={e => handleChange('recursoPreventivo', e.target.value)} className="input-field" />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Desarrollo Técnico</h3></CardHeader>
                                    <CardBody>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">Subcontratas Involucradas</label>
                                                <textarea value={formData.subcontratas} onChange={e => handleChange('subcontratas', e.target.value)} className="input-field" rows={3} placeholder="Lista de empresas trabajando actualmente..." />
                                            </div>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">Trabajos en Curso</label>
                                                <textarea value={formData.trabajosEnCurso} onChange={e => handleChange('trabajosEnCurso', e.target.value)} className="input-field" rows={3} />
                                            </div>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">Unidades en Ejecución</label>
                                                <textarea value={formData.unidadesEjecucion} onChange={e => handleChange('unidadesEjecucion', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Condiciones de Seguridad</h3></CardHeader>
                                    <CardBody>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">Protecciones y Medios Auxiliares</label>
                                                <textarea value={formData.mediosAuxiliares} onChange={e => handleChange('mediosAuxiliares', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Instalación Eléctrica</label>
                                                <input type="text" value={formData.instalacionElectrica} onChange={e => handleChange('instalacionElectrica', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">EPIs</label>
                                                <input type="text" value={formData.epis} onChange={e => handleChange('epis', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Organización de la Obra</label>
                                                <input type="text" value={formData.organizacionObra} onChange={e => handleChange('organizacionObra', e.target.value)} className="input-field" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Cond. Ambientales</label>
                                                <input type="text" value={formData.condicionesAmbientales} onChange={e => handleChange('condicionesAmbientales', e.target.value)} className="input-field" />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </>
                        )}

                        {tipo === 'reunion' && (
                            <Card>
                                <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Contenido de la Reunión</h3></CardHeader>
                                <CardBody>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="input-group">
                                            <label className="input-label">Introducción</label>
                                            <textarea value={formData.introduccion} onChange={e => handleChange('introduccion', e.target.value)} className="input-field" rows={3} placeholder="Breve introducción de la reunión..." />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Asistentes</label>
                                            <textarea value={formData.asistentes} onChange={e => handleChange('asistentes', e.target.value)} className="input-field" rows={2} placeholder="Lista de asistentes..." />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Desarrollo de la reunión</label>
                                            <textarea value={formData.desarrolloReunion} onChange={e => handleChange('desarrolloReunion', e.target.value)} className="input-field" rows={5} placeholder="Puntos tratados..." />
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.esReunionPuntual}
                                                onChange={(e) => handleChange('esReunionPuntual', e.target.checked ? "true" : "")}
                                                style={{ accentColor: 'var(--color-primary)' }}
                                            />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500 }}>¿Es una reunión puntual? (Sin orden del día)</span>
                                        </label>

                                        {!formData.esReunionPuntual && (
                                            <div className="input-group" style={{ marginTop: '0.5rem' }}>
                                                <label className="input-label">Orden del Día</label>
                                                <textarea
                                                    value={formData.ordenDelDia}
                                                    onChange={e => handleChange('ordenDelDia', e.target.value)}
                                                    className="input-field"
                                                    rows={8}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        )}

                        {tipo === 'visita' && (
                            <>
                                <Card>
                                    <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Condiciones de Seguridad</h3></CardHeader>
                                    <CardBody>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">EPI's (Equipos de Protección Individual)</label>
                                                <textarea value={formData.epis} onChange={e => handleChange('epis', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">Medios Auxiliares y Equipos de Trabajo</label>
                                                <textarea value={formData.mediosAuxiliares} onChange={e => handleChange('mediosAuxiliares', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Instalación Eléctrica</label>
                                                <textarea value={formData.instalacionElectrica} onChange={e => handleChange('instalacionElectrica', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Condiciones Ambientales</label>
                                                <textarea value={formData.condicionesAmbientales} onChange={e => handleChange('condicionesAmbientales', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                                <label className="input-label">Organización de la Obra (Acopios, limpieza, circulaciones)</label>
                                                <textarea value={formData.organizacionObra} onChange={e => handleChange('organizacionObra', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Acta de Visita</h3></CardHeader>
                                    <CardBody>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div className="input-group">
                                                <label className="input-label">Planificación de Trabajos Próximos</label>
                                                <textarea value={formData.planificacionTrabajos} onChange={e => handleChange('planificacionTrabajos', e.target.value)} className="input-field" rows={3} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Recordatorio de SyS</label>
                                                <textarea value={formData.recordatorio} onChange={e => handleChange('recordatorio', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Observaciones y Disconformidades</label>
                                                <textarea value={formData.observaciones} onChange={e => handleChange('observaciones', e.target.value)} className="input-field" rows={3} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Accidentes / Incidentes reportados</label>
                                                <textarea value={formData.accidentes} onChange={e => handleChange('accidentes', e.target.value)} className="input-field" rows={2} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Right Column: Photos and Signatures */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <Card>
                            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reporte Fotográfico</h3>
                            </CardHeader>
                            <CardBody>
                                <div
                                    {...getRootPropsFotos()}
                                    style={{
                                        border: `2px dashed ${isDragActiveFotos ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        backgroundColor: isDragActiveFotos ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)',
                                        marginBottom: formData.fotos && formData.fotos.length > 0 ? '1rem' : '0'
                                    }}
                                >
                                    <input {...getInputPropsFotos()} />
                                    <UploadCloud size={32} style={{ color: isDragActiveFotos ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                        {isDragActiveFotos ? "Suelta las imágenes aquí..." : "Arrastra imágenes o haz clic para subir"}
                                    </p>
                                </div>

                                {formData.fotos && formData.fotos.length > 0 && (
                                    <div
                                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        {formData.fotos.map((photo: any, index: number) => (
                                            <div
                                                key={photo.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', index.toString());
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                                    const toIndex = index;
                                                    if (fromIndex === toIndex) return;

                                                    const newFotos = [...formData.fotos];
                                                    const [movedItem] = newFotos.splice(fromIndex, 1);
                                                    newFotos.splice(toIndex, 0, movedItem);
                                                    setFormData((prev: any) => ({ ...prev, fotos: newFotos }));
                                                }}
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '1',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: '2px solid var(--border-color)',
                                                    cursor: 'grab',
                                                    transition: 'transform 0.2s',
                                                    backgroundColor: 'white'
                                                }}
                                                className="hover:scale-95 active:scale-90"
                                            >
                                                <img src={photo.url} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo.id); }}
                                                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '50%', color: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '10px', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontWeight: 'bold' }}>
                                                    {index + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Firmas Asistentes</h3>
                                {!showSignaturePad && (
                                    <Button variant="outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setShowSignaturePad(true)}>
                                        <Plus size={16} /> Añadir Firma
                                    </Button>
                                )}
                            </CardHeader>
                            <CardBody>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {showSignaturePad && (
                                        <div style={{ border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--color-surface)' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Nueva Firma</h4>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                                                <div className="input-group" style={{ marginBottom: 0 }}>
                                                    <label className="input-label">Nombre *</label>
                                                    <input type="text" className="input-field" value={currentSigner.nombre} onChange={e => setCurrentSigner({ ...currentSigner, nombre: e.target.value })} placeholder="Ej. Juan Pérez" />
                                                </div>
                                                <div className="input-group" style={{ marginBottom: 0 }}>
                                                    <label className="input-label">Empresa / Cargo</label>
                                                    <input type="text" className="input-field" value={currentSigner.empresa} onChange={e => setCurrentSigner({ ...currentSigner, empresa: e.target.value })} placeholder="Ej. Constructora SA" />
                                                </div>
                                            </div>

                                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'white', marginBottom: '1rem' }}>
                                                <canvas
                                                    ref={canvasRef}
                                                    width={400}
                                                    height={250}
                                                    style={{ width: '100%', height: '250px', touchAction: 'none', cursor: 'crosshair' }}
                                                    onMouseDown={startDrawing}
                                                    onMouseMove={draw}
                                                    onMouseUp={stopDrawing}
                                                    onMouseLeave={stopDrawing}
                                                    onTouchStart={startDrawing}
                                                    onTouchMove={draw}
                                                    onTouchEnd={stopDrawing}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <Button variant="outline" onClick={clearSignature} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Limpiar</Button>
                                                <Button variant="outline" onClick={() => setShowSignaturePad(false)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Cancelar</Button>
                                                <Button onClick={saveSignature} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Guardar Firma</Button>
                                            </div>
                                        </div>
                                    )}

                                    {formData.firmas && formData.firmas.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {formData.firmas.map((firma: any) => (
                                                <div key={firma.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white' }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{firma.nombre}</p>
                                                        {firma.empresa && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{firma.empresa}</p>}
                                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{firma.fecha}</p>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <img src={firma.url} alt={`Firma de ${firma.nombre}`} style={{ height: '40px', objectFit: 'contain', borderBottom: '1px solid var(--border-color)' }} />
                                                        <button onClick={() => removeSignature(firma.id)} className="btn-icon text-red-500">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !showSignaturePad && (
                                            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--color-surface)' }}>
                                                <PenTool size={24} style={{ margin: '0 auto 0.5rem' }} />
                                                <p style={{ margin: 0, fontSize: '0.875rem' }}>No hay firmas en el informe</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Archivos Adjuntos</h3>
                            </CardHeader>
                            <CardBody>
                                <div
                                    {...getRootPropsAdjuntos()}
                                    style={{
                                        border: `2px dashed ${isDragActiveAdjuntos ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        backgroundColor: isDragActiveAdjuntos ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)',
                                        marginBottom: visibleAdjuntos.length > 0 ? '1rem' : '0'
                                    }}
                                >
                                    <input {...getInputPropsAdjuntos()} />
                                    <UploadCloud size={32} style={{ color: isDragActiveAdjuntos ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                        {isDragActiveAdjuntos ? "Suelta los archivos aquí..." : "Arrastra documentos adicionales o haz clic"}
                                    </p>
                                </div>

                                {visibleAdjuntos.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {visibleAdjuntos.map((file: any) => (
                                            <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                    <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                        <UploadCloud size={16} style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>{file.name}</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveAdjunto(file.id)} className="btn-icon text-red-500 hover:bg-red-50" title="Eliminar archivo">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                    </div>
                </div>
            </div>
        </div >
    );
};
