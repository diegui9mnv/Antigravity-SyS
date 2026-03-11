import { useState, useEffect } from 'react';
import { typologiesTree } from '../store';
import { Button, MultiSelect } from './ui';
import { X } from 'lucide-react';
import { EmpresaModal, PersonaModal } from './ContactModals';
import { createObra, updateObra, getObraWithRelations } from '../lib/api/obras';
import { getEmpresas, createEmpresa, type Empresa } from '../lib/api/agenda';
import { getPersonas, createPersona, type Persona } from '../lib/api/agenda';

interface CreateProjectModalProps {
    onClose: () => void;
    onCreated: () => void;
    initialData?: any;
}

export default function CreateProjectModal({ onClose, onCreated, initialData }: CreateProjectModalProps) {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);

    // Quick Add Agent State
    const [quickAddType, setQuickAddType] = useState<{
        type: 'empresa' | 'persona',
        field: string,
        forcedPersonaType?: string
    } | null>(null);

    const [formData, setFormData] = useState({
        tipologiaCat: '',
        tipologiaSub: '',
        tipologiaTipo: '',
        denominacion: '',
        municipio: '',
        expediente: '',
        pem: '',
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
        const loadAgenda = async () => {
            setEmpresas(await getEmpresas());
            setPersonas(await getPersonas());
        };
        loadAgenda();

        if (initialData) {
            // Carga inicial rápida de la tabla principal
            setFormData(prev => ({
                ...prev,
                tipologiaCat: initialData.tipologia_cat || '',
                tipologiaSub: initialData.tipologia_sub || '',
                tipologiaTipo: initialData.tipologia_tipo || '',
                denominacion: initialData.denominacion || '',
                municipio: initialData.municipio || '',
                expediente: initialData.expediente || '',
                pem: initialData.pem?.toString() || '',
                cebe: initialData.cebe || '',
                codigoObra: initialData.codigo_obra || '',
                estado: initialData.estado || 'solicitud',
                fechaInicio: initialData.fecha_inicio || '',
                duracionNum: initialData.duracion_num?.toString() || '',
                duracionUnidad: initialData.duracion_unidad || 'meses',
                fechaFin: initialData.fecha_fin || ''
            }));

            // Carga asíncrona de relaciones Many-to-Many
            const loadRelations = async () => {
                try {
                    const fullData = await getObraWithRelations(initialData.id);
                    setFormData(prev => ({
                        ...prev,
                        contratistaId: fullData.contratista_ids || [],
                        promotorId: fullData.promotor_ids || [],
                        coordinadorSysId: fullData.coordinador_sys_ids || [],
                        directorObraId: fullData.director_obra_ids || [],
                        jefeObraId: fullData.jefe_obra_ids || []
                    }));
                } catch (e) {
                    console.error('Error fetching relations:', e);
                }
            };
            loadRelations();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const fullTypology = [formData.tipologiaCat, formData.tipologiaSub, formData.tipologiaTipo].filter(Boolean).join(' > ');

        const baseObra = {
            tipologia_cat: formData.tipologiaCat || null,
            tipologia_sub: formData.tipologiaSub || null,
            tipologia_tipo: formData.tipologiaTipo || null,
            tipologia: fullTypology || null,
            denominacion: formData.denominacion,
            municipio: formData.municipio || null,
            expediente: formData.expediente || null,
            pem: formData.pem !== '' ? Number(formData.pem) || null : null,
            cebe: formData.cebe || null,
            codigo_obra: formData.codigoObra || null,
            estado: formData.estado,
            fecha_inicio: formData.fechaInicio || null,
            duracion_num: parseInt(formData.duracionNum) || null,
            duracion_unidad: formData.duracionUnidad || null,
            fecha_fin: formData.fechaFin || null
        };

        const relations = {
            contratistaId: formData.contratistaId,
            promotorId: formData.promotorId,
            coordinadorSysId: formData.coordinadorSysId,
            directorObraId: formData.directorObraId,
            jefeObraId: formData.jefeObraId
        };

        try {
            if (initialData) {
                await updateObra(initialData.id, baseObra, relations);
            } else {
                await createObra(baseObra, relations);
            }
            onCreated();
        } catch (error) {
            alert('Error al guardar la obra');
        }
    };

    const handleQuickAddPersona = async (data: any) => {
        try {
            const forcedType = quickAddType?.type === 'persona' ? quickAddType.forcedPersonaType : undefined;
            const payload = {
                ...data,
                tipo: forcedType || data.tipo
            };
            const newPersona = await createPersona(payload);
            setPersonas(await getPersonas());
            if (quickAddType) {
                setFormData(prev => ({
                    ...prev,
                    [quickAddType.field]: [...(prev[quickAddType.field as keyof typeof prev] as string[]), newPersona.id]
                }));
            }
            setQuickAddType(null);
        } catch (error) {
            alert('Error al crear persona');
        }
    };

    const handleQuickAddEmpresa = async (data: any) => {
        try {
            const newEmp = await createEmpresa(data);
            setEmpresas(await getEmpresas());
            if (quickAddType) {
                setFormData(prev => ({
                    ...prev,
                    [quickAddType.field]: [...(prev[quickAddType.field as keyof typeof prev] as string[]), newEmp.id]
                }));
            }
            setQuickAddType(null);
        } catch (error) {
            alert('Error al crear empresa');
        }
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
        <div className="app-modal-overlay" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            padding: '1rem'
        }}>
            <div className="card animate-fade-in create-project-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                            <div className="create-project-typology-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
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
                        <div className="create-project-general-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                <label className="input-label">P.E.M.</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="pem"
                                    value={formData.pem}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Ej. 125000.00"
                                />
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
                        <div className="create-project-dates-grid" style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Fecha Inicio</label>
                                <input type="date" required name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Cálculo Duración (Opcional)</label>
                                <div className="create-project-duration-row" style={{ display: 'flex', gap: '0.5rem' }}>
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
                            <div className="create-project-agents-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Contratista (Empresa)</label>
                                    <MultiSelect
                                        options={empresas.map(e => ({ value: e.id, label: e.razon_social }))}
                                        value={formData.contratistaId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, contratistaId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'empresa', field: 'contratistaId' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Promotor (Empresa)</label>
                                    <MultiSelect
                                        options={empresas.map(e => ({ value: e.id, label: e.razon_social }))}
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
                                        onAddNew={() => setQuickAddType({ type: 'persona', field: 'coordinadorSysId', forcedPersonaType: 'Coordinador SyS' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Director de obra (Persona)</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Director de obra').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.directorObraId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, directorObraId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'persona', field: 'directorObraId', forcedPersonaType: 'Director de obra' })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Jefe de obra (Persona)</label>
                                    <MultiSelect
                                        options={getPersonasByTipo('Jefe de obra').map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                                        value={formData.jefeObraId}
                                        onChange={(val: string[]) => setFormData(p => ({ ...p, jefeObraId: val }))}
                                        placeholder="Seleccionar..."
                                        onAddNew={() => setQuickAddType({ type: 'persona', field: 'jefeObraId', forcedPersonaType: 'Jefe de obra' })}
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
                    forcedTipo={quickAddType.forcedPersonaType}
                    lockTipo={Boolean(quickAddType.forcedPersonaType)}
                    onClose={() => setQuickAddType(null)}
                    onSave={handleQuickAddPersona}
                />
            )}
        </div>
    );
}
