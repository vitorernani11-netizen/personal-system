import React from 'react';
import { IconAlert } from './Icons';
import { navegarPara } from '../../router';

interface BackupBannerProps {
  ultimoBackupEm?: string;
  onFazerBackup?: () => void;
}

export const BackupBanner: React.FC<BackupBannerProps> = ({ ultimoBackupEm, onFazerBackup }) => {
  const dias = React.useMemo(() => {
    if (!ultimoBackupEm) return 999;
    const dataBackup = new Date(ultimoBackupEm).getTime();
    return Math.floor((new Date().getTime() - dataBackup) / (1000 * 60 * 60 * 24));
  }, [ultimoBackupEm]);

  if (dias === null || dias < 7) {
    return null;
  }

  return (
    <div
      role="alert"
      style={{
        backgroundColor: 'var(--negative-bg)',
        borderLeft: '4px solid var(--negative)',
        borderRadius: '8px',
        padding: '12px 14px',
        margin: '12px 16px 0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
        <span style={{ color: 'var(--negative)', marginTop: '2px', flexShrink: 0 }}>
          <IconAlert size={18} />
        </span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--negative)' }}>
            {dias >= 999 ? 'Nenhum backup realizado!' : `${dias} dias sem fazer backup`}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Seus dados ficam salvos apenas neste aparelho. Faça backup para não perder nada.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onFazerBackup || (() => navegarPara('ajustes'))}
        style={{
          minHeight: '34px',
          padding: '0 10px',
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: 'var(--negative)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Fazer agora
      </button>
    </div>
  );
};
