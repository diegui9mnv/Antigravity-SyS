import React, { useState } from 'react';
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
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, tipo, obra, assignedContacts, formatAgentName, onClose, onSave }) => {
    if (!isOpen) return null;
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [frecuencia, setFrecuencia] = useState('puntual');
    const [estado, setEstado] = useState('Planificada');
    const [coordinadorId, setCoordinadorId] = useState('');

    const handleSave = () => {
        if (!start || !end) {
            alert('Fechas de inicio y fin obligatorias.');
            return;
        }
        onSave({
            start, end, frecuencia, estado, coordinadorId
        });
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
                            <label className="input-label">Inicio *</label>
                            <input
                                type="datetime-local"
                                value={start}
                                onChange={e => setStart(e.target.value)}
                                className="input-field"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Fin *</label>
                            <input
                                type="datetime-local"
                                value={end}
                                onChange={e => setEnd(e.target.value)}
                                className="input-field"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Frecuencia</label>
                            <select
                                value={frecuencia}
                                onChange={e => setFrecuencia(e.target.value)}
                                className="input-field"
                            >
                                <option value="puntual">Puntual</option>
                                <option value="semanal">Semanal</option>
                                <option value="quincenal">Quincenal</option>
                                <option value="mensual">Mensual</option>
                                <option value="trimestral">Trimestral</option>
                            </select>
                        </div>

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
