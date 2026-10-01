import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import type { SegmentOption } from '../components/ui/SegmentedControl';
import {
  IconWhatsApp,
  IconPix,
  IconFileText,
  IconCheck,
  IconPlus,
  IconUpload,
  IconPaperclip,
  IconDownload,
  IconEye,
} from '../components/ui/Icons';
import { navegarPara, voltar } from '../router';
import { db } from '../db';
import { alternarPresenca } from '../db/presenca';
import { RelatorioPresencasAluno } from '../components/presenca/RelatorioPresencasAluno';
import { formatarDiasSemana, formatarDiasSemanaExtenso, DIAS_SEMANA_MAP, ORDEM_DIAS_SEMANA } from '../utils/formatters';
import type { Aluno, Contrato, Cobranca, RegistroPresenca } from '../types/database';

interface FichaViewProps {
  alunoId?: string;
}

export const FichaView: React.FC<FichaViewProps> = ({ alunoId }) => {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'frequencia' | 'financeiro' | 'contrato' | 'anamnese'>('resumo');
  const [mensagemAcaoPresenca, setMensagemAcaoPresenca] = useState<string>('');
  const [presencaHoje, setPresencaHoje] = useState<RegistroPresenca | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Modal / Criação rápida de cobrança
  const [mostrandoNovaCobranca, setMostrandoNovaCobranca] = useState(false);
  const [novoValor, setNovoValor] = useState('650,00');
  const [novoVencimento, setNovoVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [novaCompetencia, setNovaCompetencia] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    async function carregar() {
      if (!alunoId || alunoId === 'novo') {
        setCarregando(false);
        return;
      }
      try {
        const item = await db.alunos.get(alunoId);
        if (item) {
          setAluno(item);
          const hojeStr = new Date().toISOString().split('T')[0];
          const p = await db.presencas.where('[alunoId+data]').equals([alunoId, hojeStr]).first();
          setPresencaHoje(p || null);
          const cList = await db.cobrancas.where('alunoId').equals(alunoId).reverse().sortBy('vencimento');
          setCobrancas(cList);
          if (item.contratoId) {
            const cont = await db.contratos.get(item.contratoId);
            if (cont) setContrato(cont);
          }
        }
      } catch (e) {
        console.error('Erro ao carregar dados do aluno:', e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [alunoId]);

  const handleTogglePresencaHoje = async () => {
    if (!aluno) return;
    const hojeStr = new Date().toISOString().split('T')[0];
    const res = await alternarPresenca(aluno.id, hojeStr, aluno.horario);
    setPresencaHoje(res.presente ? res.registro || null : null);

    const atualizado = await db.alunos.get(aluno.id);
    if (atualizado) setAluno(atualizado);

    setMensagemAcaoPresenca(
      res.presente ? 'Presença confirmada hoje!' : 'Presença desmarcada com sucesso.'
    );
    setTimeout(() => {
      setMensagemAcaoPresenca('');
    }, 2500);
  };

  const handleCriarCobrancaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aluno) return;

    try {
      const centavos = Math.round(parseFloat(novoValor.replace(/\./g, '').replace(',', '.')) * 100) || 65000;
      const agora = new Date().toISOString();
      const novoId = crypto.randomUUID();

      const novaCob: Cobranca = {
        id: novoId,
        alunoId: aluno.id,
        valor: centavos,
        vencimento: novoVencimento,
        status: 'aberta',
        competencia: novaCompetencia,
        etapaRegua: 2,
        criadoEm: agora,
        atualizadoEm: agora,
      };

      await db.cobrancas.put(novaCob);
      const listaAtualizada = [novaCob, ...cobrancas];
      setCobrancas(listaAtualizada);
      setMostrandoNovaCobranca(false);
      navegarPara(`cobranca/${novoId}`);
    } catch (err) {
      console.error('Erro ao criar cobrança rápida:', err);
    }
  };

  const fileInputFichaRef = useRef<HTMLInputElement>(null);

  const handleUploadContratoFicha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !aluno) return;

    try {
      const agora = new Date().toISOString();
      const idContrato = contrato?.id || crypto.randomUUID();

      const novoContrato: Contrato = {
        id: idContrato,
        alunoId: aluno.id,
        modeloId: `modelo_${aluno.modalidade}_mensal`,
        modalidade: aluno.modalidade,
        vigenciaMeses: contrato?.vigenciaMeses || 6,
        inicioVigencia: contrato?.inicioVigencia || agora.split('T')[0],
        valor: contrato?.valor || 65000,
        diaVencimento: contrato?.diaVencimento || 10,
        avisoCancelamentoDias: contrato?.avisoCancelamentoDias || 30,
        horasRemarcacao: contrato?.horasRemarcacao || 6,
        clausulas: contrato?.clausulas || ['medica', 'remarcacao', 'lgpd'],
        status: 'assinado',
        formaAssinatura: contrato?.formaAssinatura || 'manual',
        assinadoEm: agora,
        arquivoAssinado: file,
        arquivoNome: file.name,
        arquivoTipo: file.type,
        arquivoTamanho: file.size,
        criadoEm: contrato?.criadoEm || agora,
        atualizadoEm: agora,
      };

      await db.contratos.put(novoContrato);
      await db.alunos.update(aluno.id, {
        contratoId: idContrato,
        atualizadoEm: agora,
      });

      setContrato(novoContrato);
      e.target.value = '';
    } catch (err) {
      console.error('Erro ao anexar contrato na ficha:', err);
    }
  };

  const handleBaixarAnexoFicha = () => {
    if (!contrato?.arquivoAssinado) return;
    const url = URL.createObjectURL(contrato.arquivoAssinado);
    const a = document.createElement('a');
    a.href = url;
    a.download = contrato.arquivoNome || 'contrato_assinado.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVisualizarAnexoFicha = () => {
    if (!contrato?.arquivoAssinado) return;
    const url = URL.createObjectURL(contrato.arquivoAssinado);
    window.open(url, '_blank');
  };

  const abas: SegmentOption<'resumo' | 'frequencia' | 'financeiro' | 'contrato' | 'anamnese'>[] = [
    { value: 'resumo', label: 'Resumo' },
    { value: 'frequencia', label: 'Presenças & Faltas' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'contrato', label: 'Contrato' },
    { value: 'anamnese', label: 'Anamnese' },
  ];

  if (carregando) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando ficha do aluno...
      </div>
    );
  }

  if (!aluno) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--negative)', marginBottom: '12px' }}>Aluno não encontrado.</p>
        <Button variant="secondary" onClick={() => navegarPara('alunos')}>
          Voltar para Alunos
        </Button>
      </div>
    );
  }

  const modalidadeExibicao = aluno.modalidade;
  const isOnlineOnly = modalidadeExibicao === 'online';
  const primeiraAberta = cobrancas.find((c) => c.status === 'aberta' || c.status === 'atrasada');

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo={aluno.nome}
        subtitulo={
          modalidadeExibicao === 'presencial'
            ? `Aluno Presencial • ${formatarDiasSemana(aluno.diasSemana)} às ${aluno.horario ? `${aluno.horario}h` : 'horário livre'}`
            : modalidadeExibicao === 'online'
            ? `Consultoria Online • Check-in ${aluno.frequenciaCheckin || 'semanal'}`
            : `Aluno Híbrido • ${formatarDiasSemana(aluno.diasSemana)} às ${aluno.horario ? `${aluno.horario}h` : 'horário livre'}`
        }
        mostrarVoltar
        onVoltar={voltar}
        acaoDireita={
          <Button
            variant="secondary"
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '13px' }}
            onClick={() => navegarPara(`aluno/${aluno.id}/editar`)}
          >
            Editar
          </Button>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Faixa de Status do Contrato */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: contrato?.status === 'assinado' ? 'var(--positive-bg)' : 'var(--negative-bg)',
            border: `1px solid ${contrato?.status === 'assinado' ? 'var(--positive)' : 'var(--negative)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconFileText size={18} style={{ color: contrato?.status === 'assinado' ? 'var(--positive)' : 'var(--negative)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: contrato?.status === 'assinado' ? 'var(--positive)' : 'var(--negative)' }}>
              {contrato ? `Contrato: ${contrato.status.toUpperCase()}` : 'Sem contrato assinado'}
            </span>
          </div>

          <Button
            variant="ghost"
            style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => navegarPara(`contrato/${aluno.id}`)}
          >
            {contrato ? 'Ver Contrato' : 'Gerar Contrato'}
          </Button>
        </div>

        {/* Card: Rotina e Horários de Atendimento */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isOnlineOnly ? 'Rotina de Consultoria Online' : 'Dias e Horários de Atendimento'}
            </span>
            <Badge tipo={modalidadeExibicao} size="sm" />
          </div>

          {!isOnlineOnly ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Dias da semana em pills visuais */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    DIAS DE ATENDIMENTO
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatarDiasSemana(aluno.diasSemana)}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {ORDEM_DIAS_SEMANA.map((diaNum) => {
                    const ativo = aluno.diasSemana?.includes(diaNum);
                    const info = DIAS_SEMANA_MAP[diaNum];
                    return (
                      <div
                        key={diaNum}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 2px',
                          borderRadius: '8px',
                          backgroundColor: ativo ? 'var(--primary)' : 'var(--bg-app)',
                          color: ativo ? '#FFFFFF' : 'var(--text-secondary)',
                          border: `1px solid ${ativo ? 'var(--primary)' : 'var(--border-color)'}`,
                          fontWeight: ativo ? 700 : 500,
                          fontSize: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{info?.abrev}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Horário e Local */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--bg-app)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>HORÁRIO FIXO</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)', marginTop: '2px', display: 'block', fontFamily: 'var(--font-heading)' }}>
                    {aluno.horario ? `${aluno.horario}h` : 'Livre / A definir'}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>LOCAL DE TREINO</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {aluno.local || 'Local a definir'}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--bg-app)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>FREQUÊNCIA CHECK-IN</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', textTransform: 'capitalize', marginTop: '2px', display: 'block' }}>
                  {aluno.frequenciaCheckin || 'Semanal'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>CIDADE / FUSO</span>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                  {aluno.fusoCidade || 'Não informado'}
                </strong>
              </div>
            </div>
          )}
        </Card>

        {/* Botões de Ação Rápida */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Button
            variant="whatsapp"
            icon={<IconWhatsApp size={18} />}
            onClick={() => {
              const telLimpo = aluno.telefone.replace(/\D/g, '');
              window.open(`https://wa.me/${telLimpo}`, '_blank');
            }}
          >
            WhatsApp
          </Button>

          <Button
            variant="primary"
            icon={<IconPix size={18} />}
            onClick={() => {
              if (primeiraAberta) {
                navegarPara(`cobranca/${primeiraAberta.id}`);
              } else {
                setMostrandoNovaCobranca(true);
                setAbaAtiva('financeiro');
              }
            }}
          >
            {primeiraAberta ? 'Cobrar PIX' : '+ Cobrança'}
          </Button>
        </div>

        {/* Botão de Registro / Desmarcar Presença */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={handleTogglePresencaHoje}
            style={{
              minHeight: '44px',
              padding: '0 14px',
              borderRadius: 'var(--radius-btn)',
              backgroundColor: presencaHoje?.status === 'presente' ? 'var(--positive-bg)' : '#FFFFFF',
              border: `1.5px solid ${presencaHoje?.status === 'presente' ? 'var(--positive)' : 'var(--border-color)'}`,
              color: presencaHoje?.status === 'presente' ? 'var(--positive)' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {presencaHoje?.status === 'presente' ? (
              <>
                <IconCheck size={18} />
                <span>
                  {mensagemAcaoPresenca || 'Presente Hoje ✓ (Clique p/ Desmarcar)'}
                </span>
              </>
            ) : (
              <>
                <IconCheck size={18} />
                <span>
                  {mensagemAcaoPresenca ||
                    (isOnlineOnly
                      ? `Registrar Check-in de Hoje (${aluno.ultimoCheckin ? aluno.ultimoCheckin.split('-').reverse().join('/') : 'Sem registro'})`
                      : `Marcar Presença de Hoje (${aluno.ultimaPresenca ? aluno.ultimaPresenca.split('-').reverse().join('/') : 'Sem presença'})`)}
                </span>
              </>
            )}
          </button>
          {presencaHoje?.status === 'presente' && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Caso tenha clicado por engano, basta clicar novamente no botão acima para desmarcar.
            </span>
          )}
        </div>

        {/* Abas da Ficha */}
        <SegmentedControl
          options={abas}
          value={abaAtiva}
          onChange={(v) => setAbaAtiva(v)}
        />

        {/* Conteúdo da Aba Presenças & Faltas */}
        {abaAtiva === 'frequencia' && (
          <RelatorioPresencasAluno
            aluno={aluno}
            onAtualizado={async () => {
              const atualizado = await db.alunos.get(aluno.id);
              if (atualizado) setAluno(atualizado);
              const hojeStr = new Date().toISOString().split('T')[0];
              const p = await db.presencas.where('[alunoId+data]').equals([aluno.id, hojeStr]).first();
              setPresencaHoje(p || null);
            }}
          />
        )}

        {/* Conteúdo da Aba Resumo */}
        {abaAtiva === 'resumo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px' }}>Dados do Aluno</h3>
                <Badge tipo={aluno.status} size="sm" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Telefone: </span>
                  <strong>{aluno.telefone}</strong>
                </div>

                {aluno.email && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>E-mail: </span>
                    {aluno.email}
                  </div>
                )}

                {aluno.cpf && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>CPF: </span>
                    {aluno.cpf}
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Modalidade: </span>
                  <Badge tipo={modalidadeExibicao} size="sm" />
                </div>

                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Canal Preferido: </span>
                  <strong style={{ textTransform: 'capitalize' }}>{aluno.canalPreferido || 'WhatsApp'}</strong>
                </div>

                {modalidadeExibicao !== 'online' && (
                  <>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Dias de Treino: </span>
                      <strong>{formatarDiasSemanaExtenso(aluno.diasSemana)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Horário de Atendimento: </span>
                      <strong>{aluno.horario ? `${aluno.horario}h` : 'Não definido'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Local de Treino: </span>
                      {aluno.local || 'Não informado'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Última Presença: </span>
                      <strong>{aluno.ultimaPresenca ? aluno.ultimaPresenca.split('-').reverse().join('/') : 'Nunca'}</strong>
                    </div>
                  </>
                )}

                {modalidadeExibicao !== 'presencial' && (
                  <>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Cidade / Fuso: </span>
                      {aluno.fusoCidade || 'Não informado'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Check-in: </span>
                      <strong style={{ textTransform: 'capitalize' }}>{aluno.frequenciaCheckin || 'Semanal'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Último Check-in: </span>
                      <strong>{aluno.ultimoCheckin ? aluno.ultimoCheckin.split('-').reverse().join('/') : 'Nunca'}</strong>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {aluno.observacoes && (
              <Card>
                <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>Observações do Personal</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {aluno.observacoes}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Financeiro */}
        {abaAtiva === 'financeiro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mostrandoNovaCobranca ? (
              <Card>
                <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>Nova Mensalidade</h3>
                <form onSubmit={handleCriarCobrancaRapida} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor (R$)</label>
                      <input
                        type="text"
                        required
                        value={novoValor}
                        onChange={(e) => setNovoValor(e.target.value)}
                        style={{ width: '100%', minHeight: '40px', padding: '0 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vencimento</label>
                      <input
                        type="date"
                        required
                        value={novoVencimento}
                        onChange={(e) => setNovoVencimento(e.target.value)}
                        style={{ width: '100%', minHeight: '40px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Competência (AAAA-MM)</label>
                    <input
                      type="month"
                      value={novaCompetencia}
                      onChange={(e) => setNovaCompetencia(e.target.value)}
                      style={{ width: '100%', minHeight: '40px', padding: '0 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Button type="submit" variant="primary" style={{ flex: 1 }}>
                      Confirmar e Gerar PIX
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setMostrandoNovaCobranca(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  style={{ minHeight: '36px', fontSize: '13px' }}
                  icon={<IconPlus size={16} />}
                  onClick={() => setMostrandoNovaCobranca(true)}
                >
                  Nova Cobrança
                </Button>
              </div>
            )}

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px' }}>Histórico de Mensalidades</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cobrancas.length} registros</span>
              </div>

              {cobrancas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cobrancas.map((cob) => (
                    <div
                      key={cob.id}
                      onClick={() => navegarPara(`cobranca/${cob.id}`)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>Competência: {cob.competencia}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Vencimento: {cob.vencimento.split('-').reverse().join('/')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          R$ {(cob.valor / 100).toFixed(2).replace('.', ',')}
                        </span>
                        <Badge tipo={cob.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Nenhuma cobrança gerada ainda para este aluno.
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Conteúdo da Aba Contrato */}
        {abaAtiva === 'contrato' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Input escondido para upload direto na ficha */}
            <input
              type="file"
              accept="application/pdf,image/*"
              ref={fileInputFichaRef}
              style={{ display: 'none' }}
              onChange={handleUploadContratoFicha}
            />

            <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px' }}>Contrato de Prestação de Serviços</h3>
                <Badge tipo={contrato?.arquivoAssinado ? 'assinado' : (contrato?.status || 'rascunho')} size="md" />
              </div>

              {contrato ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Modalidade: </span>
                    <strong style={{ textTransform: 'capitalize' }}>{contrato.modalidade}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Valor do Plano: </span>
                    <strong>R$ {(contrato.valor / 100).toFixed(2).replace('.', ',')} / mês</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Vigência: </span>
                    <strong>{contrato.vigenciaMeses} meses</strong> (Vencimento todo dia {contrato.diaVencimento})
                  </div>
                  {contrato.assinadoEm && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Assinado em: </span>
                      <strong>{new Date(contrato.assinadoEm).toLocaleDateString('pt-BR')}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Este aluno ainda não possui contrato configurado.
                </p>
              )}

              {/* Bloco do Documento Anexado */}
              {contrato?.arquivoAssinado ? (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        backgroundColor: '#DCFCE7',
                        color: 'var(--positive)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconPaperclip size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contrato.arquivoNome || 'contrato_assinado.pdf'}
                      </p>
                      <p style={{ fontSize: '11px', color: '#15803D' }}>
                        Via assinada anexada e arquivada
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <Button
                      variant="secondary"
                      style={{ minHeight: '34px', fontSize: '11px', padding: '0 4px', borderColor: '#86EFAC', color: '#15803D' }}
                      icon={<IconEye size={14} />}
                      onClick={handleVisualizarAnexoFicha}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="secondary"
                      style={{ minHeight: '34px', fontSize: '11px', padding: '0 4px', borderColor: '#86EFAC', color: '#15803D' }}
                      icon={<IconDownload size={14} />}
                      onClick={handleBaixarAnexoFicha}
                    >
                      Baixar
                    </Button>
                    <Button
                      variant="secondary"
                      style={{ minHeight: '34px', fontSize: '11px', padding: '0 4px' }}
                      icon={<IconUpload size={14} />}
                      onClick={() => fileInputFichaRef.current?.click()}
                    >
                      Trocar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputFichaRef.current?.click()}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1.5px dashed var(--border-color)',
                    backgroundColor: '#FAFAFA',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ color: 'var(--primary)' }}>
                    <IconUpload size={22} />
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Anexar Foto ou PDF do Contrato Assinado
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Clique para selecionar do seu dispositivo
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <Button
                  variant="primary"
                  fullWidth
                  icon={<IconFileText size={16} />}
                  onClick={() => navegarPara(`contrato/${aluno.id}`)}
                >
                  {contrato ? 'Gerenciar Contrato & Cláusulas' : 'Gerar Contrato'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Conteúdo da Aba Anamnese */}
        {abaAtiva === 'anamnese' && (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px' }}>Objetivo e Saúde</h3>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Objetivo Principal:</span>
                <strong>{aluno.objetivo || 'Não informado'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Restrições Médicas / Lesões:</span>
                <strong style={{ color: aluno.restricoes ? 'var(--negative)' : 'var(--text-main)' }}>
                  {aluno.restricoes || 'Nenhuma restrição registrada'}
                </strong>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
