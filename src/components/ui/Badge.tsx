import React from 'react';
import type { Modalidade } from '../../types/database';

export type BadgeType =
  | 'presencial'
  | 'online'
  | 'hibrido'
  | 'ativo'
  | 'inativo'
  | 'paga'
  | 'aberta'
  | 'atrasada'
  | 'cancelada'
  | 'sem_contrato'
  | 'assinado'
  | 'enviado'
  | 'gerado'
  | 'rascunho'
  | 'pendente'
  | 'neutro';

interface BadgeProps {
  tipo: BadgeType | Modalidade;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ tipo, label, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (tipo) {
      case 'online':
        return {
          bg: 'var(--online-bg)',
          color: 'var(--online)',
          defaultLabel: 'Online',
        };
      case 'presencial':
        return {
          bg: '#EBE7DF',
          color: 'var(--text-main)',
          defaultLabel: 'Presencial',
        };
      case 'hibrido':
        return {
          bg: '#EAE5DB',
          color: 'var(--primary)',
          defaultLabel: 'Híbrido',
        };
      case 'ativo':
      case 'paga':
      case 'assinado':
        return {
          bg: 'var(--positive-bg)',
          color: 'var(--positive)',
          defaultLabel: tipo === 'paga' ? 'Paga' : tipo === 'assinado' ? 'Assinado' : 'Ativo',
        };
      case 'gerado':
      case 'enviado':
        return {
          bg: '#E5ECF5',
          color: '#2A4C7D',
          defaultLabel: tipo === 'gerado' ? 'Gerado' : 'Enviado',
        };
      case 'rascunho':
        return {
          bg: '#EAE5DB',
          color: 'var(--text-secondary)',
          defaultLabel: 'Rascunho',
        };
      case 'inativo':
      case 'atrasada':
      case 'cancelada':
      case 'sem_contrato':
        return {
          bg: 'var(--negative-bg)',
          color: 'var(--negative)',
          defaultLabel:
            tipo === 'atrasada'
              ? 'Atrasada'
              : tipo === 'sem_contrato'
              ? 'Sem Contrato'
              : tipo === 'cancelada'
              ? 'Cancelada'
              : 'Inativo',
        };
      case 'aberta':
      case 'pendente':
        return {
          bg: 'var(--primary-tint)',
          color: 'var(--primary)',
          defaultLabel: tipo === 'aberta' ? 'Em aberto' : 'Pendente',
        };
      default:
        return {
          bg: '#EBE7DF',
          color: 'var(--text-secondary)',
          defaultLabel: String(tipo),
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 6px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-badge)',
        backgroundColor: config.bg,
        color: config.color,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
      }}
    >
      {label || config.defaultLabel}
    </span>
  );
};
