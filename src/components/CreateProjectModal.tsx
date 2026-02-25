import { useState, useEffect } from 'react';
import { saveObra, updateObra, getEmpresas, getPersonas, typologiesTree } from '../store';
import { Button } from './ui';
import { X } from 'lucide-react';

interface CreateProjectModalProps {
    onClose: () => void;
    onCreated: () => void;
    initialData?: any;
}

const MultiSelect = ({ options, value, onChange, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelect = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter((v: string) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="input-field"
                style={{ minHeight: '38px', backgroundColor: 'white', display: 'flex', flexWrap: 'wrap', gap: '4px', cursor: 'text' }}
                onClick={() => setIsOpen(true)}
            >
                {value.length === 0 && <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>}
                {value.map((v: string) => {
                    const opt = options.find((o: any) => o.value === v);
                    return opt ? (
                        <span key={v} style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {opt.label}
                            <X size={12} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleSelect(v); }} />
                        </span>
                    ) : null;
                })}
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, backgroundColor: 'white' }}>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>No hay resultados</div>
                    ) : (
                        filteredOptions.map((o: any) => (
                            <div
                                key={o.value}
                                onClick={() => handleSelect(o.value)}
                                style={{
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    backgroundColor: value.includes(o.value) ? 'var(--color-primary-light)' : 'transparent',
                                    borderBottom: '1px solid var(--border-light)'
                                }}
                            >
                                {o.label}
                            </div>
                        ))
                    )}
                </div>
            )}
            {isOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setIsOpen(false)} />}
        </div>
    );
};

export default function CreateProjectModal({ onClose, onCreated, initialData }: CreateProjectModalProps) {
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [personas, setPersonas] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        tipologiaCat: '',
        tipologiaSub: '',
        tipologiaTipo: '',
        denominacion: '',
        municipio: '',
        expediente: '',
        codigoObra: '',
        estado: 'solicitud',
        fechaInicio: '',
        duracionNum: '',
        duracionUnidad: 'meses',
        fechaFin: '',
        contratistaId: [] as string[],
        promotorId: [] as string[],
        coordinadorSysId: [] as string[],
        directorObraId: [] as string[],
        jefeObraId: [] as string[]
    });

    useEffect(() => {
        setEmpresas(getEmpresas());
        setPersonas(getPersonas());

        if (initialData) {
            setFormData({
                tipologiaCat: initialData.tipologiaCat || '',
                tipologiaSub: initialData.tipologiaSub || '',
                tipologiaTipo: initialData.tipologiaTipo || '',
                denominacion: initialData.denominacion || '',
                municipio: initialData.municipio || '',
                expediente: initialData.expediente || '',
                codigoObra: initialData.codigoObra || '',
                estado: initialData.estado || 'solicitud',
                fechaInicio: initialData.fechaInicio || '',
                duracionNum: initialData.duracionNum || '',
                duracionUnidad: initialData.duracionUnidad || 'meses',
                fechaFin: initialData.fechaFin || '',
                contratistaId: Array.isArray(initialData.contratistaId) ? initialData.contratistaId : (initialData.contratistaId ? [initialData.contratistaId] : []),
                promotorId: Array.isArray(initialData.promotorId) ? initialData.promotorId : (initialData.promotorId ? [initialData.promotorId] : []),
                coordinadorSysId: Array.isArray(initialData.coordinadorSysId) ? initialData.coordinadorSysId : (initialData.coordinadorSysId ? [initialData.coordinadorSysId] : []),
                directorObraId: Array.isArray(initialData.directorObraId) ? initialData.directorObraId : (initialData.directorObraId ? [initialData.directorObraId] : []),
                jefeObraId: Array.isArray(initialData.jefeObraId) ? initialData.jefeObraId : (initialData.jefeObraId ? [initialData.jefeObraId] : [])
            });
        }
    }, [initialData]);

    // Handle dependent typology resets
    const handleTypologyChange = (name: string, value: string) => {
        if (name === 'tipologiaCat') {
            setFormData(prev => ({ ...prev, tipologiaCat: value, tipologiaSub: '', tipologiaTipo: '' }));
        } else if (name === 'tipologiaSub') {
            setFormData(prev => ({ ...prev, tipologiaSub: value, tipologiaTipo: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Auto-calculate end date
    useEffect(() => {
        if (formData.fechaInicio && formData.duracionNum) {
            const date = new Date(formData.fechaInicio);
            const amount = parseInt(formData.duracionNum);
            if (!isNaN(amount)) {
                if (formData.duracionUnidad === 'dias') {
                    date.setDate(date.getDate() + amount);
                } else if (formData.duracionUnidad === 'meses') {
                    date.setMonth(date.getMonth() + amount);
                } else if (formData.duracionUnidad === 'años') {
                    date.setFullYear(date.getFullYear() + amount);
                }
                setFormData(prev => ({ ...prev, fechaFin: date.toISOString().split('T')[0] }));
            }
        }
    }, [formData.fechaInicio, formData.duracionNum, formData.duracionUnidad]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Include full typology path as a single string for convenience
        const fullTypology = [formData.tipologiaCat, formData.tipologiaSub, formData.tipologiaTipo].filter(Boolean).join(' > ');

        const finalData = {
            ...formData,
            tipologia: fullTypology
        };

        if (initialData) {
            updateObra(initialData.id, finalData);
        } else {
            const newObra = {
                ...finalData,
                id: `ob-${Date.now()}`
            };
            saveObra(newObra);
        }
        onCreated();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('tipologia')) {
            handleTypologyChange(name, value);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const tTree = typologiesTree as any;
    const subCategories = formData.tipologiaCat ? Object.keys(tTree[formData.tipologiaCat] || {}) : [];
    const types = (formData.tipologiaCat && formData.tipologiaSub) ? (tTree[formData.tipologiaCat][formData.tipologiaSub] || []) : [];

    const getPersonasByTipo = (tipo: string) => personas.filter(p => p.tipo === tipo);

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            padding: '1rem'
        }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="card-header flex justify-between items-center">
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{initialData ? 'Editar Obra' : 'Crear Nueva Obra'}</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card-body" style={{ display: 'grid', gap: '1.5rem' }}>

                        {/* Tipología */}
                        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Tipología de la Obra</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Categoría</label>
                                    <select required name="tipologiaCat" value={formData.tipologiaCat} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }}>
                                        <option value="" disabled>Seleccionar...</option>
                                        <option value="Edificación">Edificación</option>
                                        <option value="Obra civil">Obra civil</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Subcategoría</label>
                                    <select required name="tipologiaSub" value={formData.tipologiaSub} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }} disabled={!formData.tipologiaCat}>
                                        <option value="" disabled>Seleccionar...</option>
                                        {subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Tipo</label>
                                    <select required name="tipologiaTipo" value={formData.tipologiaTipo} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }} disabled={!formData.tipologiaSub || types.length === 0}>
                                        <option value="" disabled>{types.length === 0 ? 'No aplica' : 'Seleccionar...'}</option>
                                        {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Datos Generales */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                        </div>

                        {/* Fechas */}
                        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Fecha Inicio</label>
                                <input type="date" required name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Cálculo Duración (Opcional)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="number" min="1" name="duracionNum" value={formData.duracionNum} onChange={handleChange} className="input-field" placeholder="Ej. 6" style={{ width: '80px' }} />
                                    <select name="duracionUnidad" value={formData.duracionUnidad} onChange={handleChange} className="input-field" style={{ flex: 1, backgroundColor: 'white', padding: '0 0.2rem' }}>
                                        <option value="dias">Días</option>
                                        <option value="meses">Meses</option>
                                        <option value="años">Años</option>
                                    </select>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Fecha Fin Estimada</label>
                                <input type="date" required name="fechaFin" value={formData.fechaFin} onChange={handleChange} className="input-field" />
                            </div>
                        </div>

                        {/* Agentes de la obra */}
                        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Agentes de la Obra</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Contratista</label>
                                    <MultiSelect
                                        options={empresas.map(e => ({ value: e.id, label: e.razonSocial }))}
                                        value={formData.contratistaId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, contratistaId: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Promotor</label>
                                    <MultiSelect
                                        options={empresas.map(e => ({ value: e.id, label: e.razonSocial }))}
                                        value={formData.promotorId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, promotorId: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Coordinador SyS</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Coordinador SyS').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.coordinadorSysId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, coordinadorSysId: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Director de obra</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Director de obra').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.directorObraId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, directorObraId: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Jefe de obra</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Jefe de obra').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.jefeObraId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, jefeObraId: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="card-footer flex" style={{ justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">{initialData ? 'Guardar Cambios' : 'Guardar Obra'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
