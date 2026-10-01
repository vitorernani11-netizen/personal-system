import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  destaque?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  destaque = false,
  style,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx('personal-card', className)}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${destaque ? 'var(--primary)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-card)',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, transform 0.1s ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
