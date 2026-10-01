import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { IconShare, IconChevronRight, IconCheck } from '../components/ui/Icons';
import { navegarPara } from '../router';
import { db } from '../db';
import { exportarTudo, importarTudo, compartilharOuBaixarBackup, limparTudo } from '../db/backup';
import type { Config } from '../types/database';

export const AjustesView: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);

  // Campos do Personal
  const [nomePersonal, setNomePersonal] = useState('');
  const [cref, setCref] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cidade, setCidade] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [linkCartao, setLinkCartao] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [msgStatus, setMsgStatus] = useState<string | null>(null);
  const [tipoMsg, setTipoMsg] = useState<'sucesso' | 'erro'>('sucesso');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const cfg = await db.config.get('unico');
        if (cfg) {
          setConfig(cfg);
          setNomePersonal(cfg.nomePersonal || '');
          setCref(cfg.cref || '');
          setCpfCnpj(cfg.cpfCnpj || '');
          setCidade(cfg.cidade || '');
          setChavePix(cfg.chavePix || '');
          setLinkCartao(cfg.linkCartao || '');
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      }
    }
    carregar();
  }, []);

  const handleSalvarDadosPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      await db.config.update('unico', {
        nomePersonal: nomePersonal.trim(),
        cref: cref.trim(),
        cpfCnpj: cpfCnpj.trim(),
        cidade: cidade.trim(),
        chavePix: chavePix.trim(),
        linkCartao: linkCartao.trim(),
        atualizadoEm: agora,
      });

      const cfg = await db.config.get('unico');
      if (cfg) setConfig(cfg);

      setTipoMsg('sucesso');
      setMsgStatus('Dados profissionais e chave PIX salvos com sucesso!');
      setTimeout(() => setMsgStatus(null), 3500);
    } catch (err) {
      console.error(err);
      setTipoMsg('erro');
      setMsgStatus('Erro ao salvar dados do personal.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExportar = async () => {
    try {
      const json = await exportarTudo();
      const res = await compartilharOuBaixarBackup(json);
      setTipoMsg('sucesso');
      setMsgStatus(`Backup gerado com sucesso via ${res.metodo === 'share' ? 'compartilhamento' : 'download'}.`);
      const cfg = await db.config.get('unico');
      if (cfg) setConfig(cfg);
    } catch (e) {
      setTipoMsg('erro');
      setMsgStatus(`Erro no backup: ${(e as Error).message}`);
    }
  };

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const texto = await file.text();
      const res = await importarTudo(texto);
      setTipoMsg('sucesso');
      setMsgStatus(`Backup restaurado com sucesso! ${res.contagens.alunos} alunos recuperados.`);
      const cfg = await db.config.get('unico');
      if (cfg) {
        setConfig(cfg);
        setNomePersonal(cfg.nomePersonal || '');
        setCref(cfg.cref || '');
        setCpfCnpj(cfg.cpfCnpj || '');
        setCidade(cfg.cidade || '');
        setChavePix(cfg.chavePix || '');
        setLinkCartao(cfg.linkCartao || '');
      }
    } catch (e) {
      setTipoMsg('erro');
      setMsgStatus(`Erro na restauração: ${(e as Error).message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLimpar = async () => {
    if (!confirmandoLimpeza) {
      setConfirmandoLimpeza(true);
      return;
    }
    await limparTudo(db);
    setConfirmandoLimpeza(false);
    setTipoMsg('sucesso');
    setMsgStatus('Banco de dados completamente zerado.');
    setNomePersonal('');
    setCref('');
    setCpfCnpj('');
    setCidade('');
    setChavePix('');
    setLinkCartao('');
    setConfig(null);
  };

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Ajustes"
        subtitulo="Configurações e backup"
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {msgStatus && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: tipoMsg === 'sucesso' ? 'var(--positive-bg)' : 'var(--negative-bg)',
              color: tipoMsg === 'sucesso' ? 'var(--positive)' : 'var(--negative)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {msgStatus}
          </div>
        )}

        {/* Bloco 1: Backup (Requisito Crítico) */}
        <Card style={{ borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px' }}>Backup dos Dados</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No seu aparelho</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Último backup: <strong>{config?.ultimoBackupEm ? new Date(config.ultimoBackupEm).toLocaleDateString('pt-BR') : 'Nunca realizado'}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <Button
              variant="primary"
              icon={<IconShare size={18} />}
              onClick={handleExportar}
            >
              Fazer Backup
            </Button>

            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Restaurar
            </Button>
          </div>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImportar}
          />
        </Card>

        {/* Formulário de Dados do Personal e PIX */}
        <form onSubmit={handleSalvarDadosPersonal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Bloco 2: Seus Dados Profissionais */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '16px' }}>Dados do Personal Trainer</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Seu Nome Completo</label>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={nomePersonal}
                onChange={(e) => setNomePersonal(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>CREF</label>
                <input
                  type="text"
                  placeholder="000000-G/UF"
                  value={cref}
                  onChange={(e) => setCref(e.target.value)}
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
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>CPF ou CNPJ</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
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

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cidade (Exigido pelo padrão PIX BR Code)</label>
              <input
                type="text"
                placeholder="Sua cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
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
          </Card>

          {/* Bloco 3: Chave PIX e Pagamento */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '16px' }}>Recebimento via PIX</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Chave PIX Principal</label>
              <input
                type="text"
                placeholder="E-mail, CPF, celular ou chave aleatória"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Link de Pagamento no Cartão (Opcional)</label>
              <input
                type="text"
                placeholder="https://..."
                value={linkCartao}
                onChange={(e) => setLinkCartao(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              />
            </div>
          </Card>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            icon={<IconCheck size={18} />}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar Dados do Personal e PIX'}
          </Button>
        </form>

        {/* Bloco 4: Atalhos para Regras e Régua */}
        <Card
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '14px' }}
          onClick={() => navegarPara('regua')}
        >
          <div>
            <h3 style={{ fontSize: '14px' }}>Configurar Régua de Cobrança</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Nível atual: <strong>{config?.nivelAutomacao || 'Manual'}</strong> • 5 toques
            </p>
          </div>
          <IconChevronRight size={20} style={{ color: 'var(--text-secondary)' }} />
        </Card>

        {/* Bloco 5: Gerenciamento dos Dados */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px' }}>Gerenciamento dos Dados</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Se desejar recomeçar do zero e apagar permanentemente todos os alunos, presenças e cobranças deste aparelho:
          </p>

          {confirmandoLimpeza ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleLimpar}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  backgroundColor: 'var(--negative)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-btn)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Confirmar: Apagar Todos os Dados
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoLimpeza(false)}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-btn)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLimpar}
              style={{
                minHeight: '40px',
                backgroundColor: 'transparent',
                border: '1px solid #FECACA',
                color: 'var(--negative)',
                borderRadius: 'var(--radius-btn)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              Apagar Todos os Dados Deste Aparelho
            </button>
          )}
        </Card>
      </div>
    </div>
  );
};
