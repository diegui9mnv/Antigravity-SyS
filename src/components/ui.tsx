import { useState, type ReactNode } from 'react';
import { X, Plus } from 'lucide-react';

export const Badge = ({ children, status = 'default' }: { children: ReactNode, status?: string }) => {
    const statusClass = `badge-${status.replace(/\s+/g, '-').toLowerCase()}`;
    return <span className={`badge ${statusClass}`}>{children}</span>;
};

export const CardBody = ({ children, className = '' }: { children: ReactNode, className?: string }) => {
    return <div className={`card-body ${className}`}>{children}</div>;
}

export const Card = ({ children, className = '', style, onClick }: { children: ReactNode, className?: string, style?: React.CSSProperties, onClick?: () => void }) => {
    return <div className={`card ${className}`} style={style} onClick={onClick}>{children}</div>;
}

export const CardHeader = ({ children, className = '', style }: { children: ReactNode, className?: string, style?: React.CSSProperties }) => {
    return <div className={`card-header ${className}`} style={style}>{children}</div>;
}

export const CardFooter = ({ children, className = '' }: { children: ReactNode, className?: string }) => {
    return <div className={`card-footer ${className}`}>{children}</div>;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
}

export const Button = ({ variant = 'primary', size, className = '', children, ...props }: ButtonProps) => {
    const sizeClass = size ? `btn-${size}` : '';
    return (
        <button className={`btn btn-${variant} ${sizeClass} ${className}`} {...props}>
            {children}
        </button>
    );
};

export const MultiSelect = ({ options, value, onChange, placeholder, onAddNew, addNewLabel }: any) => {
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
                            style={{
                                padding: '0.35rem',
                                backgroundColor: 'var(--color-primary-light)',
                                color: 'var(--color-primary-dark)',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={addNewLabel || "Añadir nuevo"}
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
