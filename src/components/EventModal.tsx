import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardBody, CardFooter, Button } from './ui';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    tipo: 'reunion' | 'visita';
    obra: any;
    assignedContacts: any[];
    formatAgentName: (id: string, type: 'empresa' | 'persona') => string;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    defaultTitle?: string;
    mobileAnchorTop?: number | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, tipo, obra, assignedContacts, formatAgentName, onClose, onSave, initialData, defaultTitle, mobileAnchorTop }) => {
    const resolveTitle = () => initialData?.titulo || initialData?.title || defaultTitle || `Acta ${tipo} 001`;
    const resolveStart = () => initialData?.fecha_planificada || initialData?.start || obra?.fechaInicio || '';
    const resolveEnd = () => initialData?.fecha_fin || initialData?.end || obra?.fechaFin || '';
    const resolveEstado = () => initialData?.estado || 'Planificada';
    const resolveCoordinadorId = () => initialData?.coordinador_id || initialData?.coordinadorId || '';
    const resolveFrecuencia = () => initialData?.frecuencia || 'Puntual';

    const [title, setTitle] = useState(resolveTitle());
    const [start, setStart] = useState(resolveStart());
    const [end, setEnd] = useState(resolveEnd());
    const [estado, setEstado] = useState(resolveEstado());
    const [coordinadorId, setCoordinadorId] = useState(resolveCoordinadorId());
    const [frecuencia, setFrecuencia] = useState(resolveFrecuencia());

    useEffect(() => {
        if (isOpen) {
            setTitle(resolveTitle());
            setStart(resolveStart());
            setEnd(resolveEnd());
            setEstado(resolveEstado());
            setCoordinadorId(resolveCoordinadorId());
            setFrecuencia(resolveFrecuencia());
        }
    }, [initialData, defaultTitle, tipo, obra, isOpen]);

    // Scroll into view on mobile when opened using a ref
    const cardRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isOpen && typeof mobileAnchorTop === 'number' && cardRef.current) {
            // Small delay to ensure render is complete
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [isOpen, mobileAnchorTop]);

    if (!isOpen) return null;

    const hasAnchorTop = typeof mobileAnchorTop === 'number';

    const overlayStyle = {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: hasAnchorTop ? 'flex-start' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
    } as React.CSSProperties;

    const handleSave = () => {
        if (!start || !end) {
            alert('Fechas de inicio y fin obligatorias.');
            return;
        }
        onSave({
            title, start, end, estado, coordinadorId, frecuencia
        });
        // reset state after save if opening again isn't unmounting
        setTitle(resolveTitle());
    };

    const modalContent = (
        <div className="app-modal-overlay event-entry-overlay" style={overlayStyle}>
            <div ref={cardRef} style={{ marginTop: hasAnchorTop ? Math.max(0, mobileAnchorTop + 40) + 'px' : undefined, width: '100%', maxWidth: '500px' }}>
                <Card className="event-modal-card" style={{ maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--color-background)', marginBottom: '40px' }}>
                    <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{initialData ? `Editar ${tipo}` : `Programar nueva ${tipo}`}</h3>
                        <button onClick={onClose} className="btn-icon">
                            <X size={20} />
                        </button>
                    </CardHeader>
                    <CardBody>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            <div className="input-group">
                                <label className="input-label">Título *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Fecha planificada *</label>
                                <input
                                    type="date"
                                    value={start ? start.split('T')[0] : ''} // ensuring date format
                                    onChange={e => setStart(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Fecha fin *</label>
                                <input
                                    type="date"
                                    value={end ? end.split('T')[0] : ''} // ensuring date format
                                    onChange={e => setEnd(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Frecuencia</label>
                                <select
                                    value={frecuencia}
                                    onChange={e => setFrecuencia(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="Inicial">Inicial</option>
                                    <option value="Puntual">Puntual</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Trimestral">Trimestral</option>
                                </select>
                            </div>

                            {initialData && (
                                <div className="input-group">
                                    <label className="input-label">Estado</label>
                                    <select
                                        value={estado}
                                        onChange={e => setEstado(e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="Planificada">Planificada</option>
                                        <option value="Realizada">Realizada</option>
                                        <option value="Cancelada">Cancelada</option>
                                    </select>
                                </div>
                            )}

                            <div className="input-group">
                                <label className="input-label">Coordinador SyS</label>
                                <select
                                    value={coordinadorId}
                                    onChange={e => setCoordinadorId(e.target.value)}
                                    className="input-field"
                                    style={{ backgroundColor: 'white' }}
                                >
                                    <option value="">Ninguno</option>

                                    {/* Main Coordinators (from common obra fields) */}
                                    {(Array.isArray(obra.coordinadorSysId) ? obra.coordinadorSysId : [obra.coordinadorSysId]).filter(Boolean).map((id: string) => (
                                        <option key={id} value={id}>{formatAgentName(id, 'persona')} (Principal)</option>
                                    ))}

                                    {/* Additional Coordinators (from assigned contacts with role 'Coordinador' or type persona) */}
                                    {assignedContacts.filter((c: any) =>
                                        c.type === 'persona' &&
                                        !(Array.isArray(obra.coordinadorSysId) ? obra.coordinadorSysId : [obra.coordinadorSysId]).includes(c.agentId)
                                    ).map((c: any) => (
                                        <option key={c.agentId} value={c.agentId}>{formatAgentName(c.agentId, 'persona')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardBody>
                    <CardFooter>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', width: '100%' }}>
                            <Button variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleSave}>Guardar Registro</Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div >
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
};
