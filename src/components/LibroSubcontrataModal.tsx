import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Button } from './ui';
import { X } from 'lucide-react';

interface LibroSubcontrataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    empresas: any[];
    libroActual: any[];
}

export const LibroSubcontrataModal: React.FC<LibroSubcontrataModalProps> = ({ isOpen, onClose, onSave, empresas, libroActual }) => {
    const [formData, setFormData] = useState<any>({
        subcontrataId: '',
        comitenteId: '', // ID of the specific libro row that is contracting them
        objetoTrabajos: '',
        fechaInicio: '',
        fechaTermino: ''
    });

    if (!isOpen) return null;

    const handleSave = () => {
        if (!formData.subcontrataId || !formData.objetoTrabajos || !formData.fechaInicio) {
            alert('Por favor complete todos los campos obligatorios.');
            return;
        }

        // Calculate Level and Comitente Order
        let nivel = 1; // Contratista principal -> 1er subcontratista es nivel 1
        let ordenComitente = '';

        if (formData.comitenteId) {
            const parentRow = libroActual.find(r => r.id === formData.comitenteId || r.fallbackId === formData.comitenteId);
            if (parentRow) {
                nivel = (parseInt(parentRow.nivel) || 0) + 1;
                ordenComitente = parentRow.orden || parentRow.fallbackId; // Fallback to index theoretically
            }
        } else {
            // Contratado directamente por el contratista principal
            nivel = 1;
        }

        const newRow = {
            ...formData,
            nivel,
            ordenComitente
        };
        onSave(newRow);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                <Card>
                    <CardHeader className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>Añadir Registro al Libro</h3>
                        <button onClick={onClose} className="btn-icon">
                            <X size={20} />
                        </button>
                    </CardHeader>
                    <CardBody>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Subcontratista / Autónomo *</label>
                                <select
                                    className="input-field"
                                    value={formData.subcontrataId}
                                    onChange={e => setFormData({ ...formData, subcontrataId: e.target.value })}
                                >
                                    <option value="" disabled>Seleccione empresa o autónomo...</option>
                                    {empresas.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.razonSocial}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Subcontratado por (Comitente)</label>
                                <select
                                    className="input-field"
                                    value={formData.comitenteId}
                                    onChange={e => setFormData({ ...formData, comitenteId: e.target.value })}
                                >
                                    <option value="">Contratista Principal (Nivel 1)</option>
                                    {libroActual.map((row, idx) => {
                                        const subName = empresas.find(e => e.id === row.subcontrataId)?.razonSocial || 'Desconocido';
                                        return (
                                            <option key={row.id || row.fallbackId || idx} value={row.id || row.fallbackId}>
                                                Orden {row.orden || idx + 1}: {subName} (Nivel {row.nivel})
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Deje vacío si es contratado directamente por el Contratista Principal de la obra.</p>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Objeto / Trabajos a desarrollar *</label>
                                <textarea
                                    className="input-field"
                                    value={formData.objetoTrabajos}
                                    onChange={e => setFormData({ ...formData, objetoTrabajos: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Fecha de Inicio *</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.fechaInicio}
                                        onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Fecha de Término</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={formData.fechaTermino}
                                        onChange={e => setFormData({ ...formData, fechaTermino: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleSave}>Añadir Registro</Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};
