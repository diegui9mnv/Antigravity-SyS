import React, { useState, useEffect } from 'react';
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
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, tipo, obra, assignedContacts, formatAgentName, onClose, onSave, initialData, defaultTitle }) => {
    if (!isOpen) return null;

    // Auto-generate title index (this is simplified as we don't have the list here, but could be passed if needed)
    // For now we'll just set a generic editable default
    const [title, setTitle] = useState(initialData?.title || defaultTitle || `Acta ${tipo} 001`);
    const [start, setStart] = useState(initialData?.start || obra?.fechaInicio || '');
    const [end, setEnd] = useState(initialData?.end || obra?.fechaFin || '');
    const [estado, setEstado] = useState(initialData?.estado || 'Planificada');
    const [coordinadorId, setCoordinadorId] = useState(initialData?.coordinadorId || '');

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || defaultTitle || `Acta ${tipo} 001`);
            setStart(initialData?.start || obra?.fechaInicio || '');
            setEnd(initialData?.end || obra?.fechaFin || '');
            setEstado(initialData?.estado || 'Planificada');
            setCoordinadorId(initialData?.coordinadorId || '');
        }
    }, [initialData, defaultTitle, tipo, obra, isOpen]);

    const handleSave = () => {
        if (!start || !end) {
            alert('Fechas de inicio y fin obligatorias.');
            return;
        }
        onSave({
            title, start, end, estado, coordinadorId
        });
        // reset state after save if opening again isn't unmounting
        setTitle(defaultTitle || `Acta ${tipo} 001`);
    };

    return (
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
            <Card style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-background)' }}>
                <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Programar nueva {tipo}</h3>
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
                            >
                                <option value="">Ninguno</option>
                                {obra.coordinadorSysId && <option value={obra.coordinadorSysId}>{formatAgentName(obra.coordinadorSysId, 'persona')} (Principal)</option>}
                                {assignedContacts.filter((c: any) => c.tipo === 'persona' && c.id !== obra.coordinadorSysId).map((c: any) => (
                                    <option key={c.id} value={c.id}>{formatAgentName(c.id, 'persona')}</option>
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
    );
};
