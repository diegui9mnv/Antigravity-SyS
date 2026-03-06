import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardBody, Button } from './ui';
import { X } from 'lucide-react';

interface LibroSubcontrataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    empresas: any[];
    libroActual: any[];
    defaultContratistaIds?: string[];
}

export const LibroSubcontrataModal: React.FC<LibroSubcontrataModalProps> = ({
    isOpen,
    onClose,
    onSave,
    empresas,
    libroActual,
    defaultContratistaIds = []
}) => {
    const [formData, setFormData] = useState<any>({
        contratistaId: defaultContratistaIds[0] || '',
        subcontrataId: '',
    });

    useEffect(() => {
        if (!isOpen) return;
        setFormData({
            contratistaId: defaultContratistaIds[0] || '',
            subcontrataId: '',
        });
    }, [isOpen, defaultContratistaIds]);

    const empresaName = (id: string) =>
        empresas.find((e: any) => e.id === id)?.razonSocial ||
        empresas.find((e: any) => e.id === id)?.razon_social ||
        'Desconocida';

    const contratistaPrincipalId = defaultContratistaIds[0] || '';

    const posiblesContratistas = useMemo(() => {
        const ids = new Set<string>();
        if (contratistaPrincipalId) ids.add(contratistaPrincipalId);
        (libroActual || []).forEach((r: any) => {
            if (r.subcontrataId) ids.add(r.subcontrataId);
        });

        // Fallback por si no hay datos previos
        if (ids.size === 0) {
            empresas.forEach((e: any) => ids.add(e.id));
        }

        return Array.from(ids).map(id => ({ id, label: empresaName(id) }));
    }, [contratistaPrincipalId, libroActual, empresas]);

    const posiblesSubcontratas = useMemo(
        () => empresas.filter((emp: any) => emp.id !== formData.contratistaId),
        [empresas, formData.contratistaId]
    );

    if (!isOpen) return null;

    const handleSave = () => {
        if (!formData.contratistaId || !formData.subcontrataId) {
            alert('Completa Contratista y Subcontrata.');
            return;
        }

        let nivel = 0;
        let comitenteId: string | null = null;
        if (contratistaPrincipalId && formData.contratistaId !== contratistaPrincipalId) {
            const parentRow = (libroActual || []).find((r: any) => r.subcontrataId === formData.contratistaId);
            nivel = parentRow ? (Number(parentRow.nivel) || 0) + 1 : 1;
            comitenteId = parentRow?.id || null;
        }

        onSave({
            ...formData,
            comitenteId,
            nivel
        });
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <Card style={{ width: '100%', maxWidth: '700px', backgroundColor: 'white' }}>
                <CardHeader className="flex justify-between items-center">
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>Añadir Registro al Libro</h3>
                    <button onClick={onClose} className="btn-icon" title="Cerrar">
                        <X size={20} />
                    </button>
                </CardHeader>

                <CardBody>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label className="input-label">Contratista (empresa que subcontrata) *</label>
                            <select
                                className="input-field"
                                value={formData.contratistaId}
                                onChange={e => setFormData({ ...formData, contratistaId: e.target.value })}
                            >
                                <option value="" disabled>Selecciona contratista...</option>
                                {posiblesContratistas.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}{c.id === contratistaPrincipalId ? ' (Principal)' : ''}
                                    </option>
                                ))}
                            </select>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Si el contratista es el principal, el nivel será 0. Si es una subcontrata previa, el nivel se calcula automáticamente.
                            </p>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Subcontrata (empresa) *</label>
                            <select
                                className="input-field"
                                value={formData.subcontrataId}
                                onChange={e => setFormData({ ...formData, subcontrataId: e.target.value })}
                            >
                                <option value="" disabled>Selecciona subcontrata...</option>
                                {posiblesSubcontratas.map((emp: any) => (
                                    <option key={emp.id} value={emp.id}>{empresaName(emp.id)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Añadir Registro</Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};
