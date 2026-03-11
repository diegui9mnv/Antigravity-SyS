import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button } from './ui';
import { ArrowLeft, Save, UploadCloud, Trash2, Camera, PenTool, Plus, FileText, Loader2, ExternalLink, Mail, Send } from 'lucide-react';
import { getLibroSubcontratas } from '../store';
import { useDropzone } from 'react-dropzone';
import { createActaPdfBlob, createActaPdfUrl } from '../lib/actaPdf';

type PhotoLayoutType = 'foto' | 'libro_incidencias' | 'otros_documentos';

const normalizePhotoLayoutType = (value: any): PhotoLayoutType => {
    const normalized = String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s-]+/g, '_');
    if (
        normalized === 'libro_incidencias' ||
        normalized === 'libroincidencias' ||
        normalized === 'libro' ||
        normalized.includes('libro')
    ) {
        return 'libro_incidencias';
    }
    if (
        normalized === 'otros_documentos' ||
        normalized === 'otrosdocumentos' ||
        normalized === 'otros' ||
        normalized.includes('otro')
    ) {
        return 'otros_documentos';
    }
    return 'foto';
};

const normalizePhotos = (raw: any[]): any[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((photo: any, index: number) => {
            const url = photo?.url || photo?.dataUrl || '';
            if (!url) return null;
            return {
                id: photo?.id ?? Date.now() + index + Math.random(),
                url,
                tipo: normalizePhotoLayoutType(photo?.tipo ?? photo?.tipoFoto ?? photo?.layoutType ?? photo?.section),
                descripcion: typeof photo?.descripcion === 'string'
                    ? photo.descripcion
                    : (typeof photo?.description === 'string' ? photo.description : ''),
            };
        })
        .filter(Boolean);
};

interface EventReportProps {
    tipo: 'reunion' | 'visita';
    eventData: any;
    obra: any;
    assignedContacts: any[];
    allPersonas: any[];
    allEmpresas: any[];
    formatAgentName: (id: string, type: 'empresa' | 'persona') => string;
    onClose: () => void;
    onSave: (id: string, updatedData: any) => Promise<void> | void;
}

type RecipientOption = {
    key: string;
    type: 'empresa' | 'persona';
    agentId: string;
    name: string;
    email: string;
    roles: string[];
    emailOrigin: 'direct' | 'empresa' | 'none';
};

export const EventReport: React.FC<EventReportProps> = ({ tipo, eventData, obra, assignedContacts, allPersonas, allEmpresas, formatAgentName, onClose, onSave }) => {
    const ACTA_MARKER = '__acta_generada__';
    const initialFotos = normalizePhotos(eventData.fotos || []);
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
        fotos: initialFotos, // Array of images with layout/description
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
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [selectedRecipientKeys, setSelectedRecipientKeys] = useState<string[]>([]);

    const hasPersistedActa = (data: any) =>
        Array.isArray(data?.adjuntos) &&
        data.adjuntos.some((a: any) => a?.name === ACTA_MARKER);
    const visibleAdjuntos = (Array.isArray(formData?.adjuntos) ? formData.adjuntos : []).filter((a: any) => a?.name !== ACTA_MARKER);
    const hasGeneratedDocument = (Boolean(generatedPdfUrl) || hasPersistedActa(formData)) && !isGeneratingPdf;

    const normalizeEmail = (value: any): string => {
        if (typeof value !== 'string') return '';
        const email = value.trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
    };

    const toArray = (value: any): string[] => {
        if (Array.isArray(value)) return value.filter(Boolean);
        return value ? [value] : [];
    };

    const getEmpresaById = (id: string) => allEmpresas.find((empresa: any) => empresa?.id === id);
    const getPersonaById = (id: string) => allPersonas.find((persona: any) => persona?.id === id);

    const getEmpresaEmail = (empresa: any) =>
        normalizeEmail(
            empresa?.correo ||
            empresa?.email ||
            empresa?.mail ||
            ''
        );

    const resolvePersonaEmail = (persona: any): { email: string; origin: 'direct' | 'empresa' | 'none' } => {
        const directEmail = normalizeEmail(
            persona?.correo ||
            persona?.email ||
            persona?.mail ||
            ''
        );
        if (directEmail) {
            return { email: directEmail, origin: 'direct' };
        }

        const personaEmpresaId = persona?.empresaId || persona?.empresa_id || persona?.empresa?.id;
        if (!personaEmpresaId) {
            return { email: '', origin: 'none' };
        }

        const empresa = getEmpresaById(personaEmpresaId);
        const companyEmail = getEmpresaEmail(empresa);
        if (!companyEmail) {
            return { email: '', origin: 'none' };
        }
        return { email: companyEmail, origin: 'empresa' };
    };

    const recipientOptions = React.useMemo<RecipientOption[]>(() => {
        const optionsMap = new Map<string, RecipientOption>();

        const addRecipient = (type: 'empresa' | 'persona', agentId: string, role: string) => {
            if (!agentId) return;

            const key = `${type}:${agentId}`;
            const existing = optionsMap.get(key);
            if (existing) {
                if (role && !existing.roles.includes(role)) {
                    existing.roles.push(role);
                }
                return;
            }

            const name = formatAgentName(agentId, type);
            if (type === 'empresa') {
                const empresa = getEmpresaById(agentId);
                const email = getEmpresaEmail(empresa);
                optionsMap.set(key, {
                    key,
                    type,
                    agentId,
                    name,
                    email,
                    roles: role ? [role] : [],
                    emailOrigin: email ? 'direct' : 'none',
                });
                return;
            }

            const persona = getPersonaById(agentId);
            const emailData = resolvePersonaEmail(persona);
            optionsMap.set(key, {
                key,
                type,
                agentId,
                name,
                email: emailData.email,
                roles: role ? [role] : [],
                emailOrigin: emailData.origin,
            });
        };

        toArray(obra?.promotorId).forEach((agentId) => addRecipient('empresa', agentId, 'Promotor'));
        toArray(obra?.contratistaId).forEach((agentId) => addRecipient('empresa', agentId, 'Contratista principal'));
        toArray(obra?.coordinadorSysId).forEach((agentId) => addRecipient('persona', agentId, 'Coordinador SyS'));
        toArray(obra?.directorObraId).forEach((agentId) => addRecipient('persona', agentId, 'Director de obra'));
        toArray(obra?.jefeObraId).forEach((agentId) => addRecipient('persona', agentId, 'Jefe de obra'));

        if (Array.isArray(assignedContacts)) {
            assignedContacts.forEach((contact) => {
                if (!contact?.type || !contact?.agentId) return;
                addRecipient(contact.type, contact.agentId, contact.role || 'Colaborador');
            });
        }

        const coordinatorId =
            formData?.coordinadorId ||
            formData?.coordinador_id ||
            eventData?.coordinador_id ||
            '';
        if (coordinatorId) {
            addRecipient('persona', coordinatorId, 'Coordinador del evento');
        }

        return Array.from(optionsMap.values()).sort((a, b) => {
            const aHasEmail = Boolean(a.email);
            const bHasEmail = Boolean(b.email);
            if (aHasEmail !== bHasEmail) return aHasEmail ? -1 : 1;
            return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        });
    }, [
        assignedContacts,
        obra,
        allPersonas,
        allEmpresas,
        formData?.coordinadorId,
        formData?.coordinador_id,
        eventData?.coordinador_id,
        formatAgentName,
    ]);

    const openEmailModal = () => {
        const recipientsWithEmail = recipientOptions.filter((recipient) => recipient.email).map((recipient) => recipient.key);
        setSelectedRecipientKeys(recipientsWithEmail);
        setIsEmailModalOpen(true);
    };

    const toggleRecipientSelection = (recipientKey: string) => {
        setSelectedRecipientKeys((prev) =>
            prev.includes(recipientKey)
                ? prev.filter((key) => key !== recipientKey)
                : [...prev, recipientKey]
        );
    };

    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo convertir el PDF.'));
            reader.onloadend = () => {
                if (typeof reader.result !== 'string') {
                    reject(new Error('Resultado invalido al convertir el PDF.'));
                    return;
                }
                const commaIndex = reader.result.indexOf(',');
                resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result);
            };
            reader.readAsDataURL(blob);
        });

    const buildActaFilename = () => {
        const rawTitle = formData.titulo || formData.title || eventData.titulo || eventData.title || `${tipo}-sin-titulo`;
        const sanitizedTitle = String(rawTitle)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60) || `${tipo}-acta`;
        return `Acta_${tipo}_${sanitizedTitle}.pdf`;
    };

    const handleSendNotificationEmail = async () => {
        const recipients = recipientOptions.filter(
            (recipient) => recipient.email && selectedRecipientKeys.includes(recipient.key)
        );

        if (recipients.length === 0) {
            alert('Selecciona al menos un destinatario con correo valido.');
            return;
        }

        setIsSendingEmail(true);
        try {
            const actaBlob = await createActaPdfBlob(tipo, formData, obra);
            const actaBase64 = await blobToBase64(actaBlob);
            const endpoint =
                import.meta.env.VITE_EMAIL_NOTIFICATION_ENDPOINT || '/.netlify/functions/send-event-notification';

            const response = await fetch(
                endpoint,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: tipo,
                        obra: {
                            denominacion: obra?.denominacion || '',
                            municipio: obra?.municipio || '',
                            codigoObra: obra?.codigoObra || obra?.codigo_obra || '',
                            expediente: obra?.expediente || '',
                        },
                        evento: {
                            titulo: formData.titulo || formData.title || eventData.titulo || eventData.title || '',
                            fechaPlanificada: formData.start || formData.fecha_planificada || eventData.fecha_planificada || '',
                            fechaFin: formData.end || formData.fecha_fin || eventData.fecha_fin || '',
                            fechaHora: formData.fechaHora || formData.fecha_hora || eventData.fecha_hora || '',
                            ubicacion: formData.ubicacion || eventData.ubicacion || obra?.municipio || '',
                            estado: formData.estado || eventData.estado || '',
                        },
                        recipients: recipients.map((recipient) => ({
                            name: recipient.name,
                            email: recipient.email,
                            role: recipient.roles.join(', '),
                        })),
                        attachment: {
                            filename: buildActaFilename(),
                            contentType: 'application/pdf',
                            contentBase64: actaBase64,
                        },
                    }),
                }
            );

            const rawResponseBody = await response.text();
            let result: any = null;
            try {
                result = rawResponseBody ? JSON.parse(rawResponseBody) : null;
            } catch {
                result = null;
            }

            if (!response.ok) {
                let message = result?.error || `No se pudo enviar el correo (HTTP ${response.status}).`;

                if (
                    response.status === 404 &&
                    endpoint === '/.netlify/functions/send-event-notification' &&
                    import.meta.env.DEV
                ) {
                    message =
                        'No se encontro la funcion de envio de correo en local. Ejecuta con Netlify Dev (netlify dev) o define VITE_EMAIL_NOTIFICATION_ENDPOINT.';
                }

                if (rawResponseBody && !result) {
                    message = `${message} Respuesta: ${rawResponseBody.slice(0, 180)}`;
                }

                throw new Error(message);
            }

            alert(`Correo enviado correctamente a ${recipients.length} destinatario(s).`);
            setIsEmailModalOpen(false);
        } catch (error: any) {
            console.error('Error enviando correo de notificacion:', error);
            const message =
                error?.message ||
                'No se pudo enviar la notificacion por correo. Revisa SMTP_* en Netlify y que la funcion este disponible.';
            alert(message);
        } finally {
            setIsSendingEmail(false);
        }
    };

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
                        fotos: [...(prev.fotos || []), {
                            id: Date.now() + Math.random(),
                            url: base64String,
                            tipo: 'foto',
                            descripcion: ''
                        }]
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const { getRootProps: getRootPropsFotos, getInputProps: getInputPropsFotos, isDragActive: isDragActiveFotos } = useDropzone({ onDrop: onDropFotos, accept: { 'image/*': [] } });

    const handleRemovePhoto = (photoId: string | number) => {
        setFormData((prev: any) => ({
            ...prev,
            fotos: prev.fotos.filter((p: any) => p.id !== photoId)
        }));
    };

    const handlePhotoTypeChange = (photoId: string | number, tipoFoto: PhotoLayoutType) => {
        setFormData((prev: any) => ({
            ...prev,
            fotos: (prev.fotos || []).map((p: any) =>
                p.id === photoId ? { ...p, tipo: tipoFoto } : p
            )
        }));
    };

    const handlePhotoDescriptionChange = (photoId: string | number, descripcion: string) => {
        setFormData((prev: any) => ({
            ...prev,
            fotos: (prev.fotos || []).map((p: any) =>
                p.id === photoId ? { ...p, descripcion } : p
            )
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

    const recipientsWithEmail = recipientOptions.filter((recipient) => Boolean(recipient.email));
    const recipientsWithoutEmail = recipientOptions.filter((recipient) => !recipient.email);
    const allRecipientsSelected =
        recipientsWithEmail.length > 0 &&
        recipientsWithEmail.every((recipient) => selectedRecipientKeys.includes(recipient.key));

    return (
        <div className="event-report-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
            {/* Header Sticky Bar */}
            <div className="event-report-header" style={{
                position: 'sticky', top: 0, zIndex: 50,
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
                borderRadius: '8px',
                marginBottom: '1rem'
            }}>
                <div className="event-report-header-main" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                <div className="event-report-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {hasGeneratedDocument && (
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
                    {hasGeneratedDocument && (
                        <Button
                            variant="outline"
                            onClick={openEmailModal}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#0ea5e9', color: '#0ea5e9' }}
                            className="hover:bg-sky-50"
                        >
                            <Mail size={16} /> Enviar correo
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
                <div className="event-report-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>

                    {/* Conditional Left Column Fields based on 'tipo' */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {tipo === 'visita' && (
                            <>
                                <Card>
                                    <CardHeader><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Datos Generales</h3></CardHeader>
                                    <CardBody>
                                        <div className="event-report-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                                <label className="input-label">Recurso Preventivo</label>
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
                                        <div className="event-report-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        {formData.fotos.map((photo: any, index: number) => (
                                            <div
                                                key={photo.id}
                                                className="event-photo-item hover:scale-95 active:scale-90"
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
                                                    borderRadius: '8px',
                                                    border: '2px solid var(--border-color)',
                                                    cursor: 'grab',
                                                    transition: 'transform 0.2s',
                                                    backgroundColor: 'white',
                                                    padding: '0.75rem',
                                                    display: 'grid',
                                                    gridTemplateColumns: '120px 1fr',
                                                    gap: '0.75rem',
                                                    alignItems: 'start'
                                                }}
                                            >
                                                <img src={photo.url} alt="Evidencia" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ marginBottom: '0.25rem' }}>Tipo de uso en acta</label>
                                                        <select
                                                            className="input-field"
                                                            value={normalizePhotoLayoutType(photo.tipo)}
                                                            onChange={(e) => handlePhotoTypeChange(photo.id, normalizePhotoLayoutType(e.target.value))}
                                                            style={{ backgroundColor: 'white' }}
                                                        >
                                                            <option value="foto">Foto</option>
                                                            <option value="libro_incidencias">Libro de incidencias</option>
                                                            <option value="otros_documentos">Otros documentos</option>
                                                        </select>
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ marginBottom: '0.25rem' }}>Descripción (opcional)</label>
                                                        <textarea
                                                            className="input-field"
                                                            rows={2}
                                                            value={photo.descripcion || ''}
                                                            onChange={(e) => handlePhotoDescriptionChange(photo.id, e.target.value)}
                                                            placeholder="Texto que aparecerá debajo de la imagen en el acta"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo.id); }}
                                                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '50%', color: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
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
            {isEmailModalOpen && (
                <div
                    className="app-modal-overlay report-email-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.45)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                    }}
                >
                    <Card style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflow: 'hidden', backgroundColor: 'white' }}>
                        <CardHeader style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Enviar notificacion por correo</h3>
                                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Selecciona los agentes relacionados con la obra que deben recibir el acta adjunta.
                                    </p>
                                </div>
                                <button onClick={() => setIsEmailModalOpen(false)} className="btn-icon" title="Cerrar">
                                    ×
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody style={{ maxHeight: 'calc(90vh - 180px)', overflowY: 'auto', paddingTop: '1rem' }}>
                            {recipientOptions.length === 0 ? (
                                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                    No hay agentes asignados a esta obra para enviar la notificacion.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (allRecipientsSelected) {
                                                    setSelectedRecipientKeys([]);
                                                } else {
                                                    setSelectedRecipientKeys(recipientsWithEmail.map((recipient) => recipient.key));
                                                }
                                            }}
                                            disabled={recipientsWithEmail.length === 0}
                                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                                        >
                                            {allRecipientsSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                        </Button>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {recipientsWithEmail.length} con correo disponible
                                        </span>
                                        {recipientsWithoutEmail.length > 0 && (
                                            <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
                                                {recipientsWithoutEmail.length} sin correo
                                            </span>
                                        )}
                                    </div>

                                    {recipientOptions.map((recipient) => {
                                        const isChecked = selectedRecipientKeys.includes(recipient.key);
                                        const isDisabled = !recipient.email;
                                        return (
                                            <label
                                                key={recipient.key}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'auto 1fr',
                                                    gap: '0.75rem',
                                                    alignItems: 'start',
                                                    padding: '0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    backgroundColor: isDisabled ? '#fff7ed' : (isChecked ? '#f0f9ff' : 'white'),
                                                    opacity: isDisabled ? 0.8 : 1,
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={isDisabled}
                                                    onChange={() => toggleRecipientSelection(recipient.key)}
                                                    style={{ marginTop: '0.2rem' }}
                                                />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary-dark)' }}>{recipient.name}</strong>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {recipient.roles.length > 0 ? recipient.roles.join(' | ') : 'Agente de obra'}
                                                    </span>
                                                    {recipient.email ? (
                                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                                                            {recipient.email}
                                                            {recipient.emailOrigin === 'empresa' ? ' (correo de empresa)' : ''}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.82rem', color: '#b45309' }}>
                                                            Sin correo configurado
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </CardBody>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.75rem',
                                borderTop: '1px solid var(--border-color)',
                                padding: '0.85rem 1.25rem',
                            }}
                        >
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Se adjuntara el documento PDF generado del informe.
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} disabled={isSendingEmail}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSendNotificationEmail}
                                    disabled={isSendingEmail || selectedRecipientKeys.length === 0}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    {isSendingEmail ? 'Enviando...' : 'Enviar correo'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div >
    );
};
