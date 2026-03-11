import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CONTACT_TYPES } from '../store';
import { Button } from './ui';

type ContactModalProps = {
    mobileAnchorTop?: number | null;
};

export function EmpresaModal({ initialData, onClose, onSave, mobileAnchorTop = null }: any & ContactModalProps) {
    const [formData, setFormData] = useState({
        razon_social: initialData?.razon_social || '',
        direccion: initialData?.direccion || '',
        telefono: initialData?.telefono || '',
        correo: initialData?.correo || ''
    });
    const cardRef = useRef<HTMLDivElement>(null);
    const hasAnchorTop = typeof mobileAnchorTop === 'number';

    useEffect(() => {
        if (!hasAnchorTop) return;
        const timeout = window.setTimeout(() => {
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
        return () => window.clearTimeout(timeout);
    }, [hasAnchorTop, mobileAnchorTop]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const modalContent = (
        <div className="modal-overlay app-modal-overlay" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: hasAnchorTop ? 'flex-start' : 'center', justifyContent: 'center', zIndex: 60,
            padding: '1rem', overflowY: 'auto'
        }}>
            <div ref={cardRef} style={{ width: '100%', maxWidth: '500px', marginTop: hasAnchorTop ? `${Math.max(0, mobileAnchorTop + 36)}px` : undefined }}>
                <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
                    <div className="card-header flex justify-between items-center">
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{initialData ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Razón Social</label>
                                <input required value={formData.razon_social} onChange={e => setFormData({ ...formData, razon_social: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Dirección</label>
                                <input value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Teléfono</label>
                                <input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Correo Electrónico</label>
                                <input type="email" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} className="input-field" />
                            </div>
                        </div>
                        <div className="card-footer flex justify-end gap-4" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}

export function PersonaModal({ initialData, empresas, onClose, onSave, forcedTipo, lockTipo = false, mobileAnchorTop = null }: any & ContactModalProps) {
    const [formData, setFormData] = useState({
        nombre: initialData?.nombre || '',
        apellidos: initialData?.apellidos || '',
        tipo: forcedTipo || initialData?.tipo || CONTACT_TYPES[0],
        empresa_id: initialData?.empresa_id || initialData?.empresaId || '',
        correo: initialData?.correo || ''
    });
    const cardRef = useRef<HTMLDivElement>(null);
    const hasAnchorTop = typeof mobileAnchorTop === 'number';

    useEffect(() => {
        if (!hasAnchorTop) return;
        const timeout = window.setTimeout(() => {
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
        return () => window.clearTimeout(timeout);
    }, [hasAnchorTop, mobileAnchorTop]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            tipo: forcedTipo || formData.tipo
        });
    };

    const modalContent = (
        <div className="modal-overlay app-modal-overlay" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: hasAnchorTop ? 'flex-start' : 'center', justifyContent: 'center', zIndex: 60,
            padding: '1rem', overflowY: 'auto'
        }}>
            <div ref={cardRef} style={{ width: '100%', maxWidth: '500px', marginTop: hasAnchorTop ? `${Math.max(0, mobileAnchorTop + 36)}px` : undefined }}>
                <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
                    <div className="card-header flex justify-between items-center">
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{initialData ? 'Editar Persona' : 'Nueva Persona'}</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Nombre</label>
                                <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Apellidos</label>
                                <input required value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Tipo de Contacto</label>
                                {lockTipo && forcedTipo ? (
                                    <input value={forcedTipo} className="input-field" disabled />
                                ) : (
                                    <select required value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="input-field" style={{ backgroundColor: 'white' }}>
                                        {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="input-group">
                                <label className="input-label">Correo Electrónico</label>
                                <input type="email" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} className="input-field" />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Empresa</label>
                                <select value={formData.empresa_id} onChange={e => setFormData({ ...formData, empresa_id: e.target.value })} className="input-field" style={{ backgroundColor: 'white' }}>
                                    <option value="">Seleccionar empresa (Opcional)</option>
                                    {empresas.map((e: any) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="card-footer flex justify-end gap-4" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}

