import type { ReactNode } from 'react';

export const Badge = ({ children, status }: { children: ReactNode, status?: string }) => {
    let statusClass = '';
    if (status) {
        statusClass = `badge-${status.replace(/\s+/g, '-').toLowerCase()}`;
    }
    return <span className={`badge ${statusClass}`}>{children}</span>;
};

export const CardBody = ({ children, className = '' }: { children: ReactNode, className?: string }) => {
    return <div className={`card-body ${className}`}>{children}</div>;
}

export const Card = ({ children, className = '', style }: { children: ReactNode, className?: string, style?: React.CSSProperties }) => {
    return <div className={`card ${className}`} style={style}>{children}</div>;
}

export const CardHeader = ({ children, className = '', style }: { children: ReactNode, className?: string, style?: React.CSSProperties }) => {
    return <div className={`card-header ${className}`} style={style}>{children}</div>;
}

export const CardFooter = ({ children, className = '' }: { children: ReactNode, className?: string }) => {
    return <div className={`card-footer ${className}`}>{children}</div>;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    children: ReactNode;
}

export const Button = ({ variant = 'primary', className = '', children, ...props }: ButtonProps) => {
    return (
        <button className={`btn btn-${variant} ${className}`} {...props}>
            {children}
        </button>
    );
};
