import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  IconCheck,
  IconPlus,
  IconTrash,
  IconRotateCcw,
  IconWhatsApp,
} from '../ui/Icons';
import {
  obterRelatorioMensalAluno,
  registrarPresenca,
  excluirRegistroPresenca,
  type RelatorioMensalPresencas,
} from '../../db/presenca';
import type { Aluno, RegistroPresenca } from '../../types/database';
import { DIAS_SEMANA_MAP } from '../../utils/formatters';

interface Props {
  aluno: Aluno;
  onAtualizado?: () => void;
}

type FiltroHistorico = 'todas' | 'presentes' | 'faltas';

export const RelatorioPresencasAluno: React.FC<Props> = ({ aluno, onAtualizado }) => {
  const hoje = new Date();
  const hojeMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mesSelecionado, setMesSelecionado] = useState<string>(hojeMes);
  const [relatorio, setRelatorio] = useState<RelatorioMensalPresencas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<FiltroHistorico>('todas');

  // Modal / Formulário de novo registro manual
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [dataNova, setDataNova] = useState<string>(hoje.toISOString().split('T')[0]);
  const [horarioNovo, setHorarioNovo] = useState<string>(aluno.horario || '08:00');
  const [statusNovo, setStatusNovo] = useState<'presente' | 'falta' | 'justificada'>('presente');
  const [obsNova, setObsNova] = useState<string>('');

  const [mensagemFeedback, setMensagemFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      try {
        setCarregando(true);
        const res = await obterRelatorioMensalAluno(aluno.id, mesSelecionado);
        if (ativo) setRelatorio(res);
      } catch (err) {
        console.error('Erro ao carregar relatório de presenças:', err);
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    buscar();
    return () => {
      ativo = false;
    };
  }, [aluno.id, mesSelecionado]);

  const exibirFeedback = (msg: string) => {
    setMensagemFeedback(msg);
    setTimeout(() => setMensagemFeedback(null), 3000);
  };

  const handleMudarMes = (delta: number) => {
    const [anoStr, mesStr] = mesSelecionado.split('-');
    let ano = parseInt(anoStr, 10);
    let mes = parseInt(mesStr, 10) + delta;

    if (mes > 12) {
      mes = 1;
      ano += 1;
    } else if (mes < 1) {
      mes = 12;
      ano -= 1;
    }

    const novoMes = `${ano}-${String(mes).padStart(2, '0')}`;
    setMesSelecionado(novoMes);
  };

  const handleDesmarcar = async (reg: RegistroPresenca) => {
    const confirmou = window.confirm(
      `Deseja realmente desmarcar o registro do dia ${reg.data.split('-').reverse().join('/')}?`
    );
    if (!confirmou) return;

    try {
      await excluirRegistroPresenca(reg.id);
      exibirFeedback('Registro de presença desmarcado com sucesso!');
      const res = await obterRelatorioMensalAluno(aluno.id, mesSelecionado);
      setRelatorio(res);
      onAtualizado?.();
    } catch (err) {
      console.error('Erro ao desmarcar presença:', err);
    }
  };

  const handleAlternarStatus = async (reg: RegistroPresenca) => {
    try {
      const proximoStatus: 'presente' | 'falta' | 'justificada' =
        reg.status === 'presente' ? 'falta' : reg.status === 'falta' ? 'justificada' : 'presente';

      await registrarPresenca(aluno.id, reg.data, proximoStatus, reg.horario, reg.observacao);
      exibirFeedback(`Status alterado para ${proximoStatus.toUpperCase()}`);
      const res = await obterRelatorioMensalAluno(aluno.id, mesSelecionado);
      setRelatorio(res);
      onAtualizado?.();
    } catch (err) {
      console.error('Erro ao alterar status de presença:', err);
    }
  };

  const handleSalvarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataNova) return;

    try {
      await registrarPresenca(aluno.id, dataNova, statusNovo, horarioNovo, obsNova);
      setMostrandoForm(false);
      setObsNova('');
      exibirFeedback('Presença/falta registrada com sucesso!');
      const res = await obterRelatorioMensalAluno(aluno.id, mesSelecionado);
      setRelatorio(res);
      onAtualizado?.();
    } catch (err) {
      console.error('Erro ao registrar presença manual:', err);
    }
  };

  const handleCompartilharWhatsApp = () => {
    if (!relatorio) return;
    const primeiroNome = aluno.nome.split(' ')[0];
    const mesFormatado = formatarNomeMes(mesSelecionado);
    const total = relatorio.totalAulas;
    const presencas = relatorio.presencas;
    const faltas = relatorio.faltas + relatorio.justificadas;
    const taxa = relatorio.taxaFrequencia;

    let motivacao = 'Parabéns pela dedicação e foco nos treinos! Continue firme! 🔥💪';
    if (taxa < 60) {
      motivacao = 'Vamos juntos recuperar o ritmo e buscar mais consistência nas próximas semanas! Conta comigo! 👊';
    } else if (taxa < 80) {
      motivacao = 'Bom aproveitamento! Com mais um pequeno empurrão chegamos aos 100%! 🚀';
    }

    const mensagem = `Olá, ${primeiroNome}! 🏋️‍♂️

Segue o seu resumo de treinos de *${mesFormatado}*:
📅 Total de aulas programadas: ${total}
✅ Presenças confirmadas: ${presencas}
❌ Faltas / Justificadas: ${faltas}
📊 Frequência: *${taxa}%*

${motivacao}`;

    if (aluno.telefone) {
      const foneLimpo = aluno.telefone.replace(/\D/g, '');
      const url = `https://wa.me/55${foneLimpo}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, '_blank');
      exibirFeedback('Abrindo WhatsApp com o relatório...');
    } else {
      navigator.clipboard?.writeText(mensagem);
      exibirFeedback('Resumo copiado! O aluno não tem telefone cadastrado.');
    }
  };

  const formatarNomeMes = (anoMes: string) => {
    const [ano, mes] = anoMes.split('-');
    const data = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  };

  const formatarDataComDiaSemana = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    const diaSemana = DIAS_SEMANA_MAP[d.getDay()]?.abrev || '';
    return {
      dataFormatada: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
      diaSemana,
    };
  };

  const registrosFiltrados = useMemo(() => {
    if (!relatorio) return [];
    if (filtro === 'presentes') {
      return relatorio.registros.filter((r) => r.status === 'presente');
    }
    if (filtro === 'faltas') {
      return relatorio.registros.filter((r) => r.status === 'falta' || r.status === 'justificada');
    }
    return relatorio.registros;
  }, [relatorio, filtro]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Toast Feedback */}
      {mensagemFeedback && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--positive-bg)',
            border: '1px solid var(--positive)',
            color: 'var(--positive)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconCheck size={14} />
          <span>{mensagemFeedback}</span>
        </div>
      )}

      {/* Painel Compacto de Frequência: Navegação + Indicadores em 1 Card */}
      <Card style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => handleMudarMes(-1)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            ←
          </button>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatarNomeMes(mesSelecionado)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleMudarMes(1)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            →
          </button>
        </div>

        {/* Linha de Indicadores Compacta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '4px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 600 }}>AULAS</div>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>{relatorio?.totalAulas || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--positive)', fontWeight: 700 }}>PRESENÇAS</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--positive)' }}>
              {relatorio?.presencas || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--negative)', fontWeight: 700 }}>FALTAS</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--negative)' }}>
              {relatorio?.faltas || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#D97706', fontWeight: 700 }}>JUSTIF.</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#D97706' }}>
              {relatorio?.justificadas || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: 700 }}>FREQUÊNCIA</div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color:
                  (relatorio?.taxaFrequencia ?? 0) >= 80
                    ? 'var(--positive)'
                    : (relatorio?.taxaFrequencia ?? 0) >= 60
                    ? '#D97706'
                    : 'var(--negative)',
              }}
            >
              {relatorio?.taxaFrequencia ?? 0}%
            </div>
          </div>
        </div>

        {/* Mini barra de progresso */}
        <div
          style={{
            height: '4px',
            backgroundColor: 'var(--border-color)',
            borderRadius: '2px',
            marginTop: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${relatorio?.taxaFrequencia ?? 0}%`,
              backgroundColor:
                (relatorio?.taxaFrequencia ?? 0) >= 80
                  ? 'var(--positive)'
                  : (relatorio?.taxaFrequencia ?? 0) >= 60
                  ? '#D97706'
                  : 'var(--negative)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </Card>

      {/* Barra de Filtros e Ação de Lançar Registro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setFiltro('todas')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtro === 'todas' ? 'var(--primary)' : 'var(--border-color)'}`,
              backgroundColor: filtro === 'todas' ? 'var(--primary)' : '#FFFFFF',
              color: filtro === 'todas' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Todas ({relatorio?.totalAulas || 0})
          </button>

          <button
            type="button"
            onClick={() => setFiltro('presentes')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtro === 'presentes' ? 'var(--positive)' : 'var(--border-color)'}`,
              backgroundColor: filtro === 'presentes' ? 'var(--positive-bg)' : '#FFFFFF',
              color: filtro === 'presentes' ? 'var(--positive)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Presenças ({relatorio?.presencas || 0})
          </button>

          <button
            type="button"
            onClick={() => setFiltro('faltas')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtro === 'faltas' ? 'var(--negative)' : 'var(--border-color)'}`,
              backgroundColor: filtro === 'faltas' ? 'var(--negative-bg)' : '#FFFFFF',
              color: filtro === 'faltas' ? 'var(--negative)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Faltas ({(relatorio?.faltas || 0) + (relatorio?.justificadas || 0)})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            variant="secondary"
            style={{
              minHeight: '28px',
              padding: '0 8px',
              fontSize: '11px',
              color: '#16A34A',
              borderColor: '#BBF7D0',
              backgroundColor: '#F0FDF4',
            }}
            icon={<IconWhatsApp size={13} />}
            onClick={handleCompartilharWhatsApp}
            title="Enviar resumo do mês no WhatsApp do aluno"
          >
            WhatsApp
          </Button>

          <Button
            variant="secondary"
            style={{ minHeight: '28px', padding: '0 8px', fontSize: '11px' }}
            icon={<IconPlus size={13} />}
            onClick={() => setMostrandoForm(!mostrandoForm)}
          >
            {mostrandoForm ? 'Fechar' : '+ Lançar'}
          </Button>
        </div>
      </div>

      {/* Formulário Retrátil de Lançamento Manual Compacto */}
      {mostrandoForm && (
        <Card style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', border: '1px solid var(--primary-light)' }}>
          <form onSubmit={handleSalvarManual} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
              Novo Registro de Presença / Falta
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>
                  Data
                </label>
                <input
                  type="date"
                  value={dataNova}
                  onChange={(e) => setDataNova(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>
                  Horário
                </label>
                <input
                  type="time"
                  value={horarioNovo}
                  onChange={(e) => setHorarioNovo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setStatusNovo('presente')}
                style={{
                  padding: '6px 2px',
                  borderRadius: '4px',
                  border: `1px solid ${statusNovo === 'presente' ? 'var(--positive)' : 'var(--border-color)'}`,
                  backgroundColor: statusNovo === 'presente' ? 'var(--positive-bg)' : '#FFFFFF',
                  color: statusNovo === 'presente' ? 'var(--positive)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                ✓ Presente
              </button>

              <button
                type="button"
                onClick={() => setStatusNovo('falta')}
                style={{
                  padding: '6px 2px',
                  borderRadius: '4px',
                  border: `1px solid ${statusNovo === 'falta' ? 'var(--negative)' : 'var(--border-color)'}`,
                  backgroundColor: statusNovo === 'falta' ? 'var(--negative-bg)' : '#FFFFFF',
                  color: statusNovo === 'falta' ? 'var(--negative)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                ✕ Falta
              </button>

              <button
                type="button"
                onClick={() => setStatusNovo('justificada')}
                style={{
                  padding: '6px 2px',
                  borderRadius: '4px',
                  border: `1px solid ${statusNovo === 'justificada' ? '#D97706' : 'var(--border-color)'}`,
                  backgroundColor: statusNovo === 'justificada' ? '#FEF3C7' : '#FFFFFF',
                  color: statusNovo === 'justificada' ? '#92400E' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                ⚠ Justificada
              </button>
            </div>

            <input
              type="text"
              placeholder="Observação / motivo (opcional)..."
              value={obsNova}
              onChange={(e) => setObsNova(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
              }}
            />

            <Button type="submit" variant="primary" style={{ minHeight: '32px', fontSize: '12px' }}>
              Salvar Registro
            </Button>
          </form>
        </Card>
      )}

      {/* Lista Compacta de Registros com Scroll Interno Limitado */}
      <Card style={{ padding: '4px 8px' }}>
        {carregando ? (
          <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
            Carregando registros...
          </div>
        ) : registrosFiltrados.length > 0 ? (
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {registrosFiltrados.map((reg, index) => {
              const { dataFormatada, diaSemana } = formatarDataComDiaSemana(reg.data);
              return (
                <div
                  key={reg.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 4px',
                    borderBottom: index < registrosFiltrados.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                        {dataFormatada}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ({diaSemana})
                      </span>
                      {reg.horario && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          • {reg.horario}h
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      {reg.status === 'presente' ? (
                        <Badge tipo="paga" label="Presente" size="sm" />
                      ) : reg.status === 'falta' ? (
                        <Badge tipo="atrasada" label="Falta" size="sm" />
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '1px 5px',
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: 700,
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                          }}
                        >
                          Justificada
                        </span>
                      )}

                      {reg.observacao && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                          "{reg.observacao}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações: Mudar Status ou Desmarcar Presença */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      title="Mudar status (Presente/Falta)"
                      onClick={() => handleAlternarStatus(reg)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF',
                        color: 'var(--text-secondary)',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <IconRotateCcw size={11} />
                      <span>Mudar</span>
                    </button>

                    <button
                      type="button"
                      title="Desmarcar / Excluir caso clicado por engano"
                      onClick={() => handleDesmarcar(reg)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid #FEE2E2',
                        backgroundColor: '#FEF2F2',
                        color: 'var(--negative)',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <IconTrash size={11} />
                      <span>Desmarcar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
            Nenhum registro para {formatarNomeMes(mesSelecionado)} no filtro selecionado.
          </div>
        )}
      </Card>
    </div>
  );
};
