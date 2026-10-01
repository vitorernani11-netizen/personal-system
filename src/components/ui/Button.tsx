import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'whatsapp';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  fullWidth = false,
  icon,
  children,
  className,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-contrast)',
          borderColor: 'var(--primary)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--negative-bg)',
          color: 'var(--negative)',
          borderColor: 'transparent',
        };
      case 'whatsapp':
        return {
          backgroundColor: 'var(--positive-bg)',
          color: 'var(--positive)',
          borderColor: 'transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          borderColor: 'transparent',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: '#FFFFFF',
          color: 'var(--text-main)',
          borderColor: 'var(--border-color)',
        };
    }
  };

  return (
    <button
      disabled={disabled}
      className={clsx('personal-btn', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: 'var(--min-touch-target)',
        padding: '0 16px',
        borderRadius: 'var(--radius-btn)',
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
        fontWeight: 600,
        width: fullWidth ? '100%' : 'auto',
        borderWidth: '1px',
        borderStyle: 'solid',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s ease, transform 0.1s ease',
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
