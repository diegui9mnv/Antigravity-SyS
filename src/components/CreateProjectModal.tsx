import { useState, useEffect } from 'react';
import { saveObra, updateObra } from '../store';
import { Button } from './ui';
import { X } from 'lucide-react';

interface CreateProjectModalProps {
    onClose: () => void;
    onCreated: () => void;
    initialData?: any;
}

export default function CreateProjectModal({ onClose, onCreated, initialData }: CreateProjectModalProps) {
    const [formData, setFormData] = useState({
        denominacion: '',
        municipio: '',
        expediente: '',
        codigoObra: '',
        estado: 'solicitud',
        fechaInicio: '',
        fechaFin: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                denominacion: initialData.denominacion || '',
                municipio: initialData.municipio || '',
                expediente: initialData.expediente || '',
                codigoObra: initialData.codigoObra || '',
                estado: initialData.estado || 'solicitud',
                fechaInicio: initialData.fechaInicio || '',
                fechaFin: initialData.fechaFin || ''
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (initialData) {
            updateObra(initialData.id, formData);
        } else {
            const newObra = {
                ...formData,
                id: `ob-${Date.now()}`
            };
            saveObra(newObra);
        }
        onCreated();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            padding: '1rem'
        }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="card-header flex justify-between items-center">
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{initialData ? 'Editar Obra' : 'Crear Nueva Obra'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card-body" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>

                        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="input-label">Denominación</label>
                            <input required name="denominacion" value={formData.denominacion} onChange={handleChange} className="input-field" placeholder="Ej. Construcción Hospital Norte" />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Municipio</label>
                            <input required name="municipio" value={formData.municipio} onChange={handleChange} className="input-field" placeholder="Ej. Madrid" />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Expediente</label>
                            <input required name="expediente" value={formData.expediente} onChange={handleChange} className="input-field" placeholder="Ej. EXP-2023-01" />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Código de Obra</label>
                            <input required name="codigoObra" value={formData.codigoObra} onChange={handleChange} className="input-field" placeholder="Ej. OBR-MAD-001" />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Estado</label>
                            <select name="estado" value={formData.estado} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }}>
                                <option value="solicitud">Solicitud</option>
                                <option value="en curso">En Curso</option>
                                <option value="completada">Completada</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Fecha Inicio</label>
                            <input type="date" required name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} className="input-field" />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Fecha Fin (Estimada)</label>
                            <input type="date" required name="fechaFin" value={formData.fechaFin} onChange={handleChange} className="input-field" />
                        </div>

                    </div>

                    <div className="card-footer flex" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">{initialData ? 'Guardar Cambios' : 'Guardar Obra'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
