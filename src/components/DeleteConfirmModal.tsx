import { AlertTriangle, Trash2, Link2, X } from 'lucide-react';
import { Button, Card } from './ui';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    onUnassign: () => void;
    itemName: string;
    roleName: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onDelete, onUnassign, itemName, roleName }: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            padding: '1rem'
        }}>
            <Card style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white' }}>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '50%' }}>
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>¿Qué deseas hacer?</h3>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                        <p style={{ margin: '0 0 0.5rem 0' }}>Estás gestionando a <strong>{itemName}</strong> en su rol de <strong>{roleName}</strong>.</p>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li>
                                <strong>Desvincular:</strong> Lo quita de esta obra, pero permanece guardado en la base de datos para usarlo en otras.
                            </li>
                            <li>
                                <strong>Eliminar:</strong> Borra el registro de forma <strong>permanente</strong> de todo el sistema.
                            </li>
                        </ul>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <Button
                                onClick={onUnassign}
                                variant="outline"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#3b82f6' }}
                                className="hover:bg-blue-50"
                            >
                                <Link2 size={16} /> Desvincular
                            </Button>
                            <Button
                                onClick={onDelete}
                                variant="outline"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#ef4444' }}
                                className="hover:bg-red-50"
                            >
                                <Trash2 size={16} /> Eliminar
                            </Button>
                        </div>
                        <Button variant="ghost" onClick={onClose} style={{ width: '100%' }}>Cancelar</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
