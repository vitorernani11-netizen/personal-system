import React from 'react';
import { IconVoltar } from './Icons';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  mostrarVoltar?: boolean;
  onVoltar?: () => void;
  acaoDireita?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  titulo,
  subtitulo,
  mostrarVoltar = false,
  onVoltar,
  acaoDireita,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 12px 16px',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        minHeight: '64px',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {mostrarVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar"
            style={{
              width: '44px',
              height: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-btn)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <IconVoltar size={20} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: '20px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {titulo}
          </h1>
          {subtitulo && (
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      {acaoDireita && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {acaoDireita}
        </div>
      )}
    </header>
  );
};
