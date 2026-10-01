import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  titulo: string;
  descricao: string;
  acaoLabel?: string;
  onAcao?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  titulo,
  descricao,
  acaoLabel,
  onAcao,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-card)',
        border: '1px dashed var(--border-color)',
        gap: '12px',
        margin: '12px 0',
      }}
    >
      {icon && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-tint)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
        {titulo}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.4 }}>
        {descricao}
      </p>
      {acaoLabel && onAcao && (
        <Button variant="primary" onClick={onAcao} style={{ marginTop: '8px' }}>
          {acaoLabel}
        </Button>
      )}
    </div>
  );
};
