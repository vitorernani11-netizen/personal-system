import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { IconHoje, IconWhatsApp, IconChevronRight, IconPlus, IconClock, IconCheck } from '../components/ui/Icons';
import { navegarPara } from '../router';
import { db } from '../db';
import { alternarPresenca, obterPresencasData } from '../db/presenca';
import { DIAS_SEMANA_MAP } from '../utils/formatters';
import type { Aluno, Cobranca, RegistroPresenca } from '../types/database';

interface AlunoSumidoInfo {
  aluno: Aluno;
  diasSemAtividade: number;
  tipo: 'presencial' | 'online';
}

export const HojeView: React.FC = () => {
  const [alunosVencendo, setAlunosVencendo] = useState<{ aluno: Aluno; cobranca: Cobranca }[]>([]);
  const [alunosSumidos, setAlunosSumidos] = useState<AlunoSumidoInfo[]>([]);
  const [alunosSemContrato, setAlunosSemContrato] = useState<Aluno[]>([]);
  const [aulasHoje, setAulasHoje] = useState<Aluno[]>([]);
  const [conflitosHoje, setConflitosHoje] = useState(0);
  const [presencaRegistradaId, setPresencaRegistradaId] = useState<string | null>(null);
  const [presencasHojeMap, setPresencasHojeMap] = useState<Map<string, RegistroPresenca>>(new Map());

  const [totalAReceber, setTotalAReceber] = useState(0);
  const [totalAtrasado, setTotalAtrasado] = useState(0);
  const [qtdHoje, setQtdHoje] = useState(0);
  const [qtdAtrasados, setQtdAtrasados] = useState(0);
  const [totalAlunosCadastrados, setTotalAlunosCadastrados] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = async () => {
    try {
      const [cobrancas, alunos, config] = await Promise.all([
        db.cobrancas.toArray(),
        db.alunos.toArray(),
        db.config.get('unico'),
      ]);

      setTotalAlunosCadastrados(alunos.length);

      const alunosMap = new Map(alunos.map((a) => [a.id, a]));
      const hojeStr = new Date().toISOString().split('T')[0];
      const agoraMs = Date.now();
      const hojeDiaSemana = new Date().getDay();

      const limitePresencial = config?.diasParaSumidoPresencial || 14;
      const limiteOnline = config?.diasParaSumidoOnline || 10;

      // 1. Cobranças
      let somaAReceber = 0;
      let somaAtrasado = 0;
      let countHoje = 0;
      let countAtrasado = 0;
      const vencendoHojeLista: { aluno: Aluno; cobranca: Cobranca }[] = [];

      for (const cob of cobrancas) {
        const al = alunosMap.get(cob.alunoId);
        if (!al) continue;

        const isAtrasada = cob.status === 'atrasada' || (cob.status === 'aberta' && cob.vencimento < hojeStr);
        const isHoje = cob.vencimento === hojeStr && cob.status !== 'paga';

        if (isAtrasada) {
          somaAtrasado += cob.valor;
          countAtrasado += 1;
        } else if (cob.status === 'aberta') {
          somaAReceber += cob.valor;
        }

        if (isHoje) {
          countHoje += 1;
          vencendoHojeLista.push({ aluno: al, cobranca: cob });
        } else if (isAtrasada && vencendoHojeLista.length < 5) {
          vencendoHojeLista.push({ aluno: al, cobranca: cob });
        }
      }

      setTotalAReceber(somaAReceber);
      setTotalAtrasado(somaAtrasado);
      setQtdHoje(countHoje);
      setQtdAtrasados(countAtrasado);
      setAlunosVencendo(vencendoHojeLista);

      // 2. Aulas de Hoje (Agenda do Dia)
      const aulasHojeLista = alunos
        .filter((a) => a.status === 'ativo' && a.modalidade !== 'online' && a.diasSemana?.includes(hojeDiaSemana))
        .sort((a, b) => (a.horario || '99:99').localeCompare(b.horario || '99:99'));

      const contagemHorarios = new Map<string, number>();
      let conflitos = 0;
      for (const a of aulasHojeLista) {
        if (a.horario) {
          const c = (contagemHorarios.get(a.horario) || 0) + 1;
          contagemHorarios.set(a.horario, c);
          if (c === 2) conflitos += 1;
        }
      }
      setAulasHoje(aulasHojeLista);
      setConflitosHoje(conflitos);

      // 3. Alunos Sumidos (Radar de Abandono)
      const sumidosLista: AlunoSumidoInfo[] = [];
      for (const al of alunos) {
        if (al.status === 'inativo') continue;

        if (al.modalidade === 'presencial' || al.modalidade === 'hibrido') {
          if (!al.ultimaPresenca) {
            sumidosLista.push({ aluno: al, diasSemAtividade: 99, tipo: 'presencial' });
          } else {
            const dias = Math.floor((agoraMs - new Date(al.ultimaPresenca).getTime()) / (1000 * 60 * 60 * 24));
            if (dias >= limitePresencial) {
              sumidosLista.push({ aluno: al, diasSemAtividade: dias, tipo: 'presencial' });
            }
          }
        } else if (al.modalidade === 'online') {
          if (!al.ultimoCheckin) {
            sumidosLista.push({ aluno: al, diasSemAtividade: 99, tipo: 'online' });
          } else {
            const dias = Math.floor((agoraMs - new Date(al.ultimoCheckin).getTime()) / (1000 * 60 * 60 * 24));
            if (dias >= limiteOnline) {
              sumidosLista.push({ aluno: al, diasSemAtividade: dias, tipo: 'online' });
            }
          }
        }
      }
      setAlunosSumidos(sumidosLista);

      // 4. Alunos Sem Contrato
      const semContrato = alunos.filter((a) => !a.contratoId && a.status === 'ativo');
      setAlunosSemContrato(semContrato);

      // 5. Presenças de Hoje
      const presencasMap = await obterPresencasData(hojeStr);
      setPresencasHojeMap(presencasMap);
    } catch (err) {
      console.error('Erro ao carregar dados da HojeView:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      if (ativo) {
        await carregarDados();
      }
    };
    buscar();
    return () => {
      ativo = false;
    };
  }, []);

  const handleAlternarPresencaHoje = async (aluno: Aluno) => {
    const hojeStr = new Date().toISOString().split('T')[0];
    await alternarPresenca(aluno.id, hojeStr, aluno.horario);
    setPresencaRegistradaId(aluno.id);
    setTimeout(() => setPresencaRegistradaId(null), 2500);
    await carregarDados();
  };

  if (carregando) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando painel de hoje...
      </div>
    );
  }

  const presSumidos = alunosSumidos.filter((s) => s.tipo === 'presencial').length;
  const onSumidos = alunosSumidos.filter((s) => s.tipo === 'online').length;
  const hojeDiaNome = DIAS_SEMANA_MAP[new Date().getDay()]?.nome || 'Hoje';

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Hoje"
        subtitulo="Visão geral e ações prioritárias"
        acaoDireita={
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="secondary"
              style={{ padding: '0 10px', minHeight: '34px', fontSize: '12px' }}
              icon={<IconClock size={15} />}
              onClick={() => navegarPara('agenda')}
            >
              Agenda
            </Button>
            <Button
              variant="ghost"
              style={{ padding: '0 8px', minHeight: '34px', fontSize: '12px' }}
              onClick={() => navegarPara('regua')}
            >
              Régua
            </Button>
          </div>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner inicial quando vazio */}
        {totalAlunosCadastrados === 0 && (
          <Card style={{ borderLeft: '4px solid var(--primary)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '15px' }}>Nenhum aluno cadastrado</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Seu painel está limpo e pronto para uso real. Cadastre seu primeiro aluno para começar a gerenciar treinos, presenças, contratos e cobranças:
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <Button variant="primary" onClick={() => navegarPara('aluno/novo')} icon={<IconPlus size={16} />}>
                Cadastrar Primeiro Aluno
              </Button>
            </div>
          </Card>
        )}

        {/* Contadores do Topo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <Card style={{ padding: '12px 10px', textAlign: 'center', cursor: 'pointer' }} onClick={() => navegarPara('cobranca/nova')}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>A RECEBER</span>
            <p style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', fontFamily: 'var(--font-heading)' }}>
              R$ {(totalAReceber / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            </p>
            <span style={{ fontSize: '10px', color: 'var(--positive)', fontWeight: 600 }}>
              {qtdHoje > 0 ? `${qtdHoje} hoje` : 'Em aberto'}
            </span>
          </Card>

          <Card style={{ padding: '12px 10px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ATRASADO</span>
            <p style={{ fontSize: '17px', fontWeight: 800, color: totalAtrasado > 0 ? 'var(--negative)' : 'var(--text-main)', marginTop: '2px', fontFamily: 'var(--font-heading)' }}>
              R$ {(totalAtrasado / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            </p>
            <span style={{ fontSize: '10px', color: totalAtrasado > 0 ? 'var(--negative)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {qtdAtrasados} {qtdAtrasados === 1 ? 'aluno' : 'alunos'}
            </span>
          </Card>

          <Card style={{ padding: '12px 10px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SUMIDOS</span>
            <p style={{ fontSize: '17px', fontWeight: 800, color: alunosSumidos.length > 0 ? 'var(--primary)' : 'var(--text-main)', marginTop: '2px', fontFamily: 'var(--font-heading)' }}>
              {alunosSumidos.length}
            </p>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {presSumidos} pres. / {onSumidos} on.
            </span>
          </Card>
        </div>

        {/* Bloco: Agenda de Hoje (Aulas do Dia) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)' }}>
                Aulas de Hoje ({hojeDiaNome})
              </h2>
              {conflitosHoje > 0 && (
                <Badge tipo="atrasada" label="⚠️ Choque de Horário!" size="sm" />
              )}
            </div>
            <button
              type="button"
              onClick={() => navegarPara('agenda')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ver Semana →
            </button>
          </div>

          {aulasHoje.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aulasHoje.map((aluno) => {
                const hojeStr = new Date().toISOString().split('T')[0];
                const regHoje = presencasHojeMap.get(aluno.id);
                const foiMarcadoHoje = regHoje ? regHoje.status === 'presente' : (presencaRegistradaId === aluno.id || aluno.ultimaPresenca === hojeStr);
                return (
                  <Card
                    key={aluno.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navegarPara(`aluno/${aluno.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{aluno.nome}</span>
                        <Badge tipo={aluno.modalidade} size="sm" />
                        {foiMarcadoHoje && <Badge tipo="paga" label="Presente" size="sm" />}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        ⏰ <strong>{aluno.horario ? `${aluno.horario}h` : 'Horário livre'}</strong> • 📍 {aluno.local || 'Local a definir'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Button
                        variant="whatsapp"
                        style={{ minHeight: '34px', padding: '0 8px', fontSize: '12px' }}
                        icon={<IconWhatsApp size={15} />}
                        onClick={() => {
                          const tel = aluno.telefone.replace(/\D/g, '');
                          const msg = `Olá, ${aluno.nome}! Passando para confirmar nosso treino de hoje às ${aluno.horario || 'horário marcado'} no local: ${aluno.local || 'combinado'}. Te vejo lá!`;
                          window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      >
                        Confirmar
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleAlternarPresencaHoje(aluno)}
                        title={foiMarcadoHoje ? 'Clique para desmarcar presença caso tenha clicado por engano' : 'Marcar presença'}
                        style={{
                          minHeight: '34px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: `1.5px solid ${foiMarcadoHoje ? 'var(--positive)' : 'var(--border-color)'}`,
                          backgroundColor: foiMarcadoHoje ? 'var(--positive-bg)' : '#FFFFFF',
                          color: foiMarcadoHoje ? 'var(--positive)' : 'var(--text-main)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <IconCheck size={14} />
                        <span>{foiMarcadoHoje ? 'Presente ✓ (Desmarcar)' : 'Presença'}</span>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card style={{ padding: '12px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => navegarPara('agenda')}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Nenhum treino presencial agendado para hoje.
              </p>
              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, marginTop: '2px', display: 'inline-block' }}>
                Abrir Agenda Semanal Completa →
              </span>
            </Card>
          )}
        </div>

        {/* Bloco: Vence Hoje / Cobranças Prioritárias */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)' }}>Vence Hoje / Prioritárias</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Toque Régua • PIX</span>
          </div>

          {alunosVencendo.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alunosVencendo.map(({ aluno, cobranca }) => (
                <Card
                  key={cobranca.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}
                >
                  <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navegarPara(`aluno/${aluno.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{aluno.nome}</span>
                      <Badge tipo={aluno.modalidade} size="sm" />
                      {cobranca.status === 'atrasada' && <Badge tipo="atrasada" size="sm" />}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      R$ {(cobranca.valor / 100).toFixed(2).replace('.', ',')} • Venc: {cobranca.vencimento.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <Button
                    variant="whatsapp"
                    style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px' }}
                    icon={<IconWhatsApp size={16} />}
                    onClick={() => navegarPara(`cobranca/${cobranca.id}`)}
                  >
                    Cobrar
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<IconHoje size={24} />}
              titulo="Nenhum vencimento pendente"
              descricao="Todas as cobranças estão regularizadas no momento."
              acaoLabel="+ Nova Cobrança"
              onAcao={() => navegarPara('cobranca/nova')}
            />
          )}
        </div>

        {/* Bloco: Alunos Sumidos (Radar de Abandono) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)' }}>Alunos Sumidos</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Alerta de evasão</span>
          </div>

          {alunosSumidos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alunosSumidos.map(({ aluno, diasSemAtividade, tipo }) => (
                <Card
                  key={aluno.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => navegarPara(`aluno/${aluno.id}`)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{aluno.nome}</span>
                      <Badge tipo={aluno.modalidade} size="sm" />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--negative)' }}>
                      {diasSemAtividade >= 99
                        ? 'Sem registro de presença/check-in cadastrado'
                        : `Sem ${tipo === 'online' ? 'check-in' : 'presença'} há ${diasSemAtividade} dias`}
                    </p>
                  </div>
                  <IconChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                </Card>
              ))}
            </div>
          ) : (
            <Card style={{ padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--positive)', fontWeight: 600 }}>
                Nenhum aluno em alerta de abandono no momento!
              </p>
            </Card>
          )}
        </div>

        {/* Bloco: Contratos Pendentes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)' }}>Contratos Pendentes</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>gov.br / manual</span>
          </div>

          {alunosSemContrato.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alunosSemContrato.map((aluno) => (
                <Card
                  key={aluno.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}
                >
                  <div style={{ cursor: 'pointer' }} onClick={() => navegarPara(`aluno/${aluno.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{aluno.nome}</span>
                      <Badge tipo={aluno.modalidade} size="sm" />
                      <Badge tipo="sem_contrato" size="sm" />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Iniciou em {aluno.inicio.split('-').reverse().join('/')} sem contrato assinado
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    style={{ minHeight: '38px', padding: '0 10px', fontSize: '13px' }}
                    onClick={() => navegarPara(`contrato/${aluno.id}`)}
                  >
                    Gerar
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card style={{ padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--positive)', fontWeight: 600 }}>
                Todos os alunos ativos possuem contrato formalizado.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
