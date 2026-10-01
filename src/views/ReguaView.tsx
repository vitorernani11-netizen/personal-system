import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { IconCheck } from '../components/ui/Icons';
import { voltar } from '../router';
import { db } from '../db';
import type { ToqueRegua } from '../types/database';

export const ReguaView: React.FC = () => {
  const [nivel, setNivel] = useState<'manual' | 'email_script' | 'asaas'>('manual');
  const [horaInicioEnvio, setHoraInicioEnvio] = useState(8);
  const [horaFimEnvio, setHoraFimEnvio] = useState(20);
  const [enviarDomingo, setEnviarDomingo] = useState(false);
  const [, setToques] = useState<ToqueRegua[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const [cfg, toquesList] = await Promise.all([
          db.config.get('unico'),
          db.toquesRegua.orderBy('ordem').toArray(),
        ]);

        if (cfg) {
          setNivel(cfg.nivelAutomacao || 'manual');
          setHoraInicioEnvio(cfg.horaInicioEnvio ?? 8);
          setHoraFimEnvio(cfg.horaFimEnvio ?? 20);
          setEnviarDomingo(cfg.enviarDomingo ?? false);
        }
        setToques(toquesList);
      } catch (err) {
        console.error('Erro ao carregar configurações da régua:', err);
      }
    }
    carregar();
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      await db.config.update('unico', {
        nivelAutomacao: nivel,
        horaInicioEnvio,
        horaFimEnvio,
        enviarDomingo,
        atualizadoEm: agora,
      });
      setFeedback('Configurações da régua salvas com sucesso!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback('Erro ao salvar configurações.');
    } finally {
      setSalvando(false);
    }
  };

  const toquesDescricao = [
    { ordem: 1, quando: 'D-3 (3 dias antes)', canal: 'E-mail', tom: 'Lembrete gentil com PIX' },
    { ordem: 2, quando: 'D-0 (Dia do vencimento)', canal: 'WhatsApp', tom: 'Vence hoje com chave PIX' },
    { ordem: 3, quando: 'D+2 (2 dias após)', canal: 'WhatsApp', tom: 'Leve, sem cobrança dura' },
    { ordem: 4, quando: 'D+5 (5 dias após)', canal: 'SMS', tom: 'Firme com prazo claro' },
    { ordem: 5, quando: 'D+10 (10 dias após)', canal: 'Interno', tom: 'Alerta o personal (não envia ao aluno)' },
  ];

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Régua de Cobrança"
        subtitulo="Automação multicanal inteligente"
        mostrarVoltar
        onVoltar={voltar}
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {feedback && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--positive-bg)',
              color: 'var(--positive)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {feedback}
          </div>
        )}

        {/* Escolha do Nível de Automação */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontSize: '16px' }}>Nível de Automação</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Escolha como você deseja que as mensagens sejam disparadas:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${nivel === 'manual' ? 'var(--primary)' : 'var(--border-color)'}`,
                backgroundColor: nivel === 'manual' ? 'var(--primary-tint)' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="nivel"
                value="manual"
                checked={nivel === 'manual'}
                onChange={() => setNivel('manual')}
                style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
              />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  1. Manual Assistido (Padrão • Grátis)
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  O app monta a fila e abre o WhatsApp, SMS ou E-mail com um toque. Zero configuração e 100% sob seu controle.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${nivel === 'email_script' ? 'var(--primary)' : 'var(--border-color)'}`,
                backgroundColor: nivel === 'email_script' ? 'var(--primary-tint)' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="nivel"
                value="email_script"
                checked={nivel === 'email_script'}
                onChange={() => setNivel('email_script')}
                style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
              />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  2. Script de E-mail Automático (Grátis)
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Toques de e-mail saem sozinhos pelo seu próprio Gmail via Google Apps Script gratuito no seu Google Drive.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${nivel === 'asaas' ? 'var(--primary)' : 'var(--border-color)'}`,
                backgroundColor: nivel === 'asaas' ? 'var(--primary-tint)' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="nivel"
                value="asaas"
                checked={nivel === 'asaas'}
                onChange={() => setNivel('asaas')}
                style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
              />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  3. Conta Externa no Asaas (Automático Real)
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Guia passo a passo para configurar régua automática por SMS e WhatsApp diretamente na sua conta Asaas.
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* Os 5 Toques */}
        <div>
          <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Sequência dos 5 Toques</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toquesDescricao.map((t) => (
              <Card key={t.ordem} style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-app)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {t.ordem}
                    </span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700 }}>{t.quando}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.tom}</p>
                    </div>
                  </div>
                  <Badge tipo="neutro" label={t.canal} size="sm" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Regras e Janela de Envio */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontSize: '16px' }}>Regras de Envio</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Início dos envios (horas)</label>
              <input
                type="number"
                value={horaInicioEnvio}
                onChange={(e) => setHoraInicioEnvio(parseInt(e.target.value, 10) || 8)}
                min={6}
                max={22}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fim dos envios (horas)</label>
              <input
                type="number"
                value={horaFimEnvio}
                onChange={(e) => setHoraFimEnvio(parseInt(e.target.value, 10) || 20)}
                min={6}
                max={22}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={enviarDomingo}
              onChange={(e) => setEnviarDomingo(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
            />
            <span>Permitir disparos no domingo</span>
          </label>
        </Card>

        <Button
          variant="primary"
          fullWidth
          icon={<IconCheck size={18} />}
          disabled={salvando}
          onClick={handleSalvar}
        >
          {salvando ? 'Salvando...' : 'Salvar Configurações da Régua'}
        </Button>
      </div>
    </div>
  );
};
