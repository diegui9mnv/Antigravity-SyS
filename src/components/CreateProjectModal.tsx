import { useState, useEffect } from 'react';
import { saveObra, updateObra, getEmpresas, getPersonas, saveEmpresa, savePersona, typologiesTree } from '../store';
import { Button } from './ui';
import { X, Plus } from 'lucide-react';
import { EmpresaModal, PersonaModal } from './ContactModals';

interface CreateProjectModalProps {
    onClose: () => void;
    onCreated: () => void;
    initialData?: any;
}

const MultiSelect = ({ options, value, onChange, placeholder, onAddNew, addNewLabel }: any) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelect = (id: string, isSelect: boolean) => {
        if (isSelect) {
            if (!value.includes(id)) onChange([...value, id]);
        } else {
            onChange(value.filter((v: string) => v !== id));
        }
    };

    return (
        <details style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}>
            <summary style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', outline: 'none', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.875rem', color: value.length > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {value.length > 0 ? `${value.length} seleccionado(s)` : placeholder}
                </span>
            </summary>

            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'white', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                {value.length > 0 && (
                    <div style={{ paddingBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {value.map((v: string) => {
                            const opt = options.find((o: any) => o.value === v);
                            if (!opt) return null;
                            return (
                                <span key={v} style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--border-color)' }}>
                                    {opt.label}
                                    <X size={12} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={(e) => { e.preventDefault(); handleSelect(v, false); }} />
                                </span>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar agente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' }}
                    />
                    {onAddNew && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onAddNew(); }}
                            className="btn-icon"
                            title={addNewLabel || "Añadir nuevo"}
                            style={{ padding: '0.35rem', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: '4px' }}
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {filteredOptions.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No hay resultados</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {filteredOptions.map((o: any) => (
                                <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.35rem 0.5rem', fontSize: '0.875rem', borderRadius: '4px' }} className="hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={value.includes(o.value)}
                                        onChange={(e) => handleSelect(o.value, e.target.checked)}
                                        style={{ accentColor: 'var(--color-primary)' }}
                                    />
                                    {o.label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </details>
    );
};

export default function CreateProjectModal({ onClose, onCreated, initialData }: CreateProjectModalProps) {
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [personas, setPersonas] = useState<any[]>([]);

    // Quick Add Agent State
    const [quickAddType, setQuickAddType] = useState<{ type: 'empresa' | 'persona', field: string } | null>(null);

    const [formData, setFormData] = useState({
        tipologiaCat: '',
        tipologiaSub: '',
        tipologiaTipo: '',
        denominacion: '',
        municipio: '',
        expediente: '',
        cebe: '',
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
                cebe: initialData.cebe || '',
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

    const handleQuickAddPersona = (data: any) => {
        const newId = `per-${Date.now()}`;
        savePersona({ id: newId, ...data });
        setPersonas(getPersonas());
        if (quickAddType) {
            setFormData(prev => ({
                ...prev,
                [quickAddType.field]: [...(prev[quickAddType.field as keyof typeof prev] as string[]), newId]
            }));
        }
        setQuickAddType(null);
    };

    const handleQuickAddEmpresa = (data: any) => {
        const newId = `emp-${Date.now()}`;
        saveEmpresa({ id: newId, ...data });
        setEmpresas(getEmpresas());
        if (quickAddType) {
            setFormData(prev => ({
                ...prev,
                [quickAddType.field]: [...(prev[quickAddType.field as keyof typeof prev] as string[]), newId]
            }));
        }
        setQuickAddType(null);
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
                                    <select name="tipologiaCat" value={formData.tipologiaCat} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }}>
                                        <option value="" disabled>Seleccionar...</option>
                                        <option value="Edificación">Edificación</option>
                                        <option value="Obra civil">Obra civil</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Subcategoría</label>
                                    <select name="tipologiaSub" value={formData.tipologiaSub} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }} disabled={!formData.tipologiaCat}>
                                        <option value="" disabled>Seleccionar...</option>
                                        {subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Tipo</label>
                                    <select name="tipologiaTipo" value={formData.tipologiaTipo} onChange={handleChange} className="input-field" style={{ backgroundColor: 'white' }} disabled={!formData.tipologiaSub || types.length === 0}>
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
                                <label className="input-label">CEBE</label>
                                <input name="cebe" value={formData.cebe} onChange={handleChange} className="input-field" placeholder="Ej. CEBE-001" style={{ backgroundColor: 'white' }} />
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
                                    <label className="input-label">Contratista (Empresa)</label>
                                    <MultiSelect
                                        options={empresas.map(e => ({ value: e.id, label: e.razonSocial }))}
                                        value={formData.contratistaId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, contratistaId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'empresa', field: 'contratistaId' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Promotor (Empresa)</label>
                                    <MultiSelect
                                        options={empresas.map(e => ({ value: e.id, label: e.razonSocial }))}
                                        value={formData.promotorId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, promotorId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'empresa', field: 'promotorId' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Coordinador SyS (Persona)</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Coordinador SyS').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.coordinadorSysId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, coordinadorSysId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'persona', field: 'coordinadorSysId' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Director de obra (Persona)</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Director de obra').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.directorObraId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, directorObraId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'persona', field: 'directorObraId' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Jefe de obra (Persona)</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Jefe de obra').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.jefeObraId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, jefeObraId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'persona', field: 'jefeObraId' })}
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

            {/* Quick Add Agent Modal */}
            {quickAddType && quickAddType.type === 'empresa' && (
                <EmpresaModal
                    onClose={() => setQuickAddType(null)}
                    onSave={handleQuickAddEmpresa}
                />
            )}
            {quickAddType && quickAddType.type === 'persona' && (
                <PersonaModal
                    empresas={empresas}
                    onClose={() => setQuickAddType(null)}
                    onSave={handleQuickAddPersona}
                />
            )}
        </div>
    );
}
