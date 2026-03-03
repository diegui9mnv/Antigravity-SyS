import type { ReactNode } from 'react';

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
