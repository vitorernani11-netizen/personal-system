import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import type { SegmentOption } from '../components/ui/SegmentedControl';
import { IconWhatsApp, IconClock, IconCheck, IconPlus, IconAlert } from '../components/ui/Icons';
import { navegarPara } from '../router';
import { db } from '../db';
import { alternarPresenca, obterPresencasData } from '../db/presenca';
import { DIAS_SEMANA_MAP, ORDEM_DIAS_SEMANA } from '../utils/formatters';
import type { Aluno, RegistroPresenca } from '../types/database';

export const AgendaView: React.FC = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<number>(() => {
    const hojeDia = new Date().getDay(); // 0 a 6
    return hojeDia === 0 ? 1 : hojeDia; // Se domingo, foca segunda por padrão
  });
  const [visualizacao, setVisualizacao] = useState<'dia' | 'semana' | 'online'>('dia');
  const [presencaRegistradaId, setPresencaRegistradaId] = useState<string | null>(null);
  const [presencasMap, setPresencasMap] = useState<Map<string, RegistroPresenca>>(new Map());
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const todos = await db.alunos.toArray();
        setAlunos(todos.filter((a) => a.status === 'ativo'));
        const hojeStr = new Date().toISOString().split('T')[0];
        const pMap = await obterPresencasData(hojeStr);
        setPresencasMap(pMap);
      } catch (err) {
        console.error('Erro ao carregar alunos na agenda:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const handleTogglePresenca = async (aluno: Aluno) => {
    const hojeStr = new Date().toISOString().split('T')[0];
    await alternarPresenca(aluno.id, hojeStr, aluno.horario);

    const [todos, pMap] = await Promise.all([
      db.alunos.toArray(),
      obterPresencasData(hojeStr),
    ]);
    setAlunos(todos.filter((a) => a.status === 'ativo'));
    setPresencasMap(pMap);
    setPresencaRegistradaId(aluno.id);
    setTimeout(() => setPresencaRegistradaId(null), 2500);
  };

  // Mapeamento de alunos presenciais/híbridos por dia
  const alunosPorDia = new Map<number, Aluno[]>();
  for (const dia of ORDEM_DIAS_SEMANA) {
    alunosPorDia.set(dia, []);
  }

  const alunosPresenciais = alunos.filter((a) => a.modalidade !== 'online');
  const alunosOnline = alunos.filter((a) => a.modalidade === 'online');

  for (const al of alunosPresenciais) {
    if (al.diasSemana && al.diasSemana.length > 0) {
      for (const d of al.diasSemana) {
        const lista = alunosPorDia.get(d) || [];
        lista.push(al);
        alunosPorDia.set(d, lista);
      }
    }
  }

  // Ordena alunos de cada dia por horário cronológico (ex: 07:00, 08:30, 19:00)
  for (const [dia, lista] of alunosPorDia.entries()) {
    lista.sort((a, b) => {
      const hA = a.horario || '99:99';
      const hB = b.horario || '99:99';
      return hA.localeCompare(hB);
    });
    alunosPorDia.set(dia, lista);
  }

  // Detecção de Conflitos / Choques de Horários
  // Mapeia para cada dia quais horários têm mais de 1 aluno
  const conflitosPorDia = new Map<number, Map<string, Aluno[]>>();
  let totalConflitosGerais = 0;

  for (const [dia, lista] of alunosPorDia.entries()) {
    const mapaHorarios = new Map<string, Aluno[]>();
    for (const al of lista) {
      const h = al.horario ? al.horario.trim() : 'Sem horário';
      const grupo = mapaHorarios.get(h) || [];
      grupo.push(al);
      mapaHorarios.set(h, grupo);
    }

    const mapaConflitos = new Map<string, Aluno[]>();
    for (const [horario, grupo] of mapaHorarios.entries()) {
      if (horario !== 'Sem horário' && grupo.length > 1) {
        mapaConflitos.set(horario, grupo);
        totalConflitosGerais += 1;
      }
    }
    conflitosPorDia.set(dia, mapaConflitos);
  }

  // Total de sessões semanais
  let totalSessoesSemanais = 0;
  for (const lista of alunosPorDia.values()) {
    totalSessoesSemanais += lista.length;
  }

  const opcoesVisualizacao: SegmentOption<'dia' | 'semana' | 'online'>[] = [
    { value: 'dia', label: 'Por Dia' },
    { value: 'semana', label: 'Semana Toda' },
    { value: 'online', label: `Online (${alunosOnline.length})` },
  ];

  if (carregando) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando agenda semanal...
      </div>
    );
  }

  const listaDoDiaAtual = alunosPorDia.get(diaSelecionado) || [];
  const conflitosDoDiaAtual = conflitosPorDia.get(diaSelecionado) || new Map<string, Aluno[]>();

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Agenda da Semana"
        subtitulo={`${totalSessoesSemanais} treinos/semana • ${totalConflitosGerais === 0 ? 'Sem choques de horário' : `${totalConflitosGerais} conflito(s) de horário`}`}
        acaoDireita={
          <Button
            variant="primary"
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '13px' }}
            icon={<IconPlus size={16} />}
            onClick={() => navegarPara('aluno/novo')}
          >
            Novo Aluno
          </Button>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Banner de Conflito de Horário Geral se houver */}
        {totalConflitosGerais > 0 && (
          <div
            style={{
              backgroundColor: 'var(--negative-bg)',
              borderLeft: '4px solid var(--negative)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ color: 'var(--negative)', marginTop: '2px', flexShrink: 0 }}>
              <IconAlert size={20} />
            </span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--negative)' }}>
                Atenção: Existem horários chocando na sua semana!
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Verifique os dias marcados com alerta vermelho para ajustar os horários dos alunos conflitantes.
              </p>
            </div>
          </div>
        )}

        {/* Alternador de Modo de Visão */}
        <SegmentedControl
          options={opcoesVisualizacao}
          value={visualizacao}
          onChange={(v) => setVisualizacao(v)}
        />

        {/* VISÃO 1: POR DIA ESPECÍFICO */}
        {visualizacao === 'dia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Seletor de Dias da Semana */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {ORDEM_DIAS_SEMANA.map((diaNum) => {
                  const isSelecionado = diaSelecionado === diaNum;
                  const info = DIAS_SEMANA_MAP[diaNum];
                  const qtdAlunos = (alunosPorDia.get(diaNum) || []).length;
                  const temConflito = (conflitosPorDia.get(diaNum)?.size || 0) > 0;

                  return (
                    <button
                      key={diaNum}
                      type="button"
                      onClick={() => setDiaSelecionado(diaNum)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 2px',
                        borderRadius: '10px',
                        backgroundColor: isSelecionado ? 'var(--primary)' : '#FFFFFF',
                        color: isSelecionado ? '#FFFFFF' : 'var(--text-main)',
                        border: `1px solid ${temConflito ? 'var(--negative)' : isSelecionado ? 'var(--primary)' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: isSelecionado ? 700 : 600 }}>
                        {info.abrev}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          marginTop: '2px',
                          color: isSelecionado ? '#FFFFFF' : qtdAlunos > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {qtdAlunos}
                      </span>
                      {temConflito && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--negative)',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cabeçalho do Dia Selecionado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)' }}>
                  {DIAS_SEMANA_MAP[diaSelecionado]?.nome}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {listaDoDiaAtual.length} {listaDoDiaAtual.length === 1 ? 'aluno agendado' : 'alunos agendados'}
                </span>
              </div>

              {conflitosDoDiaAtual.size > 0 && (
                <Badge tipo="atrasada" label={`${conflitosDoDiaAtual.size} choque(s) de horário`} size="sm" />
              )}
            </div>

            {/* Lista dos Alunos do Dia */}
            {listaDoDiaAtual.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listaDoDiaAtual.map((aluno) => {
                  const horario = aluno.horario ? aluno.horario.trim() : 'Sem horário';
                  const conflitoNesteHorario = conflitosDoDiaAtual.get(horario);
                  const isConflitante = Boolean(conflitoNesteHorario && conflitoNesteHorario.length > 1);
                  const hojeStr = new Date().toISOString().split('T')[0];
                  const regHoje = presencasMap.get(aluno.id);
                  const foiMarcadoHoje = regHoje ? regHoje.status === 'presente' : (presencaRegistradaId === aluno.id || aluno.ultimaPresenca === hojeStr);

                  return (
                    <Card
                      key={aluno.id}
                      style={{
                        padding: '14px',
                        borderLeft: isConflitante ? '4px solid var(--negative)' : '4px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Alerta de choque específico */}
                      {isConflitante && (
                        <div
                          style={{
                            backgroundColor: 'var(--negative-bg)',
                            color: 'var(--negative)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <IconAlert size={14} />
                          <span>CHOQUE DE HORÁRIO: Outro aluno também marcado às {horario}h!</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navegarPara(`aluno/${aluno.id}`)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {aluno.nome}
                            </span>
                            <Badge tipo={aluno.modalidade} size="sm" />
                          </div>

                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            📍 {aluno.local || 'Local a definir'}
                          </p>
                        </div>

                        {/* Horário em Destaque */}
                        <div
                          style={{
                            backgroundColor: isConflitante ? 'var(--negative-bg)' : 'var(--primary-tint)',
                            color: isConflitante ? 'var(--negative)' : 'var(--primary)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 800,
                            fontSize: '14px',
                            fontFamily: 'var(--font-heading)',
                            flexShrink: 0,
                          }}
                        >
                          <IconClock size={16} />
                          <span>{aluno.horario ? `${aluno.horario}h` : 'Livre'}</span>
                        </div>
                      </div>

                      {/* Botões de Ação na Sessão */}
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <Button
                          variant="whatsapp"
                          style={{ flex: 1, minHeight: '34px', fontSize: '12px' }}
                          icon={<IconWhatsApp size={16} />}
                          onClick={() => {
                            const tel = aluno.telefone.replace(/\D/g, '');
                            const msg = `Olá, ${aluno.nome}! Passando para confirmar nosso treino de ${DIAS_SEMANA_MAP[diaSelecionado]?.nome.toLowerCase()} às ${aluno.horario || 'horário marcado'} no local: ${aluno.local || 'combinado'}. Te vejo lá!`;
                            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                        >
                          Confirmar Aula
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleTogglePresenca(aluno)}
                          title={foiMarcadoHoje ? 'Clique para desmarcar presença caso tenha clicado por engano' : 'Marcar presença'}
                          style={{
                            flex: 1,
                            minHeight: '34px',
                            padding: '0 8px',
                            borderRadius: 'var(--radius-btn)',
                            border: `1.5px solid ${foiMarcadoHoje ? 'var(--positive)' : 'var(--border-color)'}`,
                            backgroundColor: foiMarcadoHoje ? 'var(--positive-bg)' : '#FFFFFF',
                            color: foiMarcadoHoje ? 'var(--positive)' : 'var(--text-main)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <IconCheck size={16} />
                          <span>{foiMarcadoHoje ? 'Presente ✓ (Desmarcar)' : 'Marcar Presença'}</span>
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<IconClock size={24} />}
                titulo={`Nenhum aluno em ${DIAS_SEMANA_MAP[diaSelecionado]?.nome}`}
                descricao="Você não possui treinos agendados para este dia da semana."
                acaoLabel="Cadastrar Novo Aluno"
                onAcao={() => navegarPara('aluno/novo')}
              />
            )}
          </div>
        )}

        {/* VISÃO 2: SEMANA COMPLETA (GRADE DE VISÃO GERAL) */}
        {visualizacao === 'semana' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ORDEM_DIAS_SEMANA.map((diaNum) => {
              const info = DIAS_SEMANA_MAP[diaNum];
              const lista = alunosPorDia.get(diaNum) || [];
              const conflitos = conflitosPorDia.get(diaNum) || new Map<string, Aluno[]>();

              return (
                <Card key={diaNum} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          backgroundColor: lista.length > 0 ? 'var(--primary)' : 'var(--bg-app)',
                          color: lista.length > 0 ? '#FFFFFF' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {info.abrev}
                      </span>
                      <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{info.nome}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {conflitos.size > 0 && (
                        <Badge tipo="atrasada" label="⚠️ Choque!" size="sm" />
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {lista.length} {lista.length === 1 ? 'aula' : 'aulas'}
                      </span>
                    </div>
                  </div>

                  {lista.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {lista.map((aluno) => {
                        const h = aluno.horario ? `${aluno.horario}h` : 'Livre';
                        const conflitoGrupo = conflitos.get(aluno.horario || '');
                        const temChoque = Boolean(conflitoGrupo && conflitoGrupo.length > 1);

                        return (
                          <div
                            key={aluno.id}
                            onClick={() => navegarPara(`aluno/${aluno.id}`)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: temChoque ? 'var(--negative-bg)' : 'var(--bg-app)',
                              border: `1px solid ${temChoque ? 'var(--negative)' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  color: temChoque ? 'var(--negative)' : 'var(--primary)',
                                  minWidth: '55px',
                                }}
                              >
                                {h}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                                {aluno.nome}
                              </span>
                            </div>

                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {aluno.local || 'Local a definir'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '4px' }}>
                      Dia livre • sem aulas marcadas
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* VISÃO 3: CONSULTORIA ONLINE */}
        {visualizacao === 'online' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px' }}>Alunos de Consultoria Online</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {alunosOnline.length} ativos
              </span>
            </div>

            {alunosOnline.length > 0 ? (
              alunosOnline.map((aluno) => {
                const hojeStr = new Date().toISOString().split('T')[0];
                const regHoje = presencasMap.get(aluno.id);
                const foiMarcadoHoje = regHoje ? regHoje.status === 'presente' : (presencaRegistradaId === aluno.id || aluno.ultimoCheckin === hojeStr);
                return (
                  <Card key={aluno.id} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ cursor: 'pointer' }} onClick={() => navegarPara(`aluno/${aluno.id}`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700 }}>{aluno.nome}</span>
                          <Badge tipo="online" size="sm" />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Check-in: <strong>{aluno.frequenciaCheckin || 'Semanal'}</strong> • {aluno.fusoCidade || 'Online'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Último check-in: {aluno.ultimoCheckin ? aluno.ultimoCheckin.split('-').reverse().join('/') : 'Nunca'}
                        </p>
                      </div>

                      <Button
                        variant="whatsapp"
                        style={{ minHeight: '34px', fontSize: '12px', padding: '0 10px' }}
                        icon={<IconWhatsApp size={16} />}
                        onClick={() => {
                          const tel = aluno.telefone.replace(/\D/g, '');
                          const msg = `Olá ${aluno.nome}! Passando para saber como foram seus treinos desta semana e como está sua rotina. Me manda seu feedback!`;
                          window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      >
                        Cobrar Check-in
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePresenca(aluno)}
                      title={foiMarcadoHoje ? 'Clique para desmarcar check-in caso tenha clicado por engano' : 'Registrar check-in'}
                      style={{
                        minHeight: '32px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: `1.5px solid ${foiMarcadoHoje ? 'var(--positive)' : 'var(--border-color)'}`,
                        backgroundColor: foiMarcadoHoje ? 'var(--positive-bg)' : '#FFFFFF',
                        color: foiMarcadoHoje ? 'var(--positive)' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <IconCheck size={16} />
                      <span>{foiMarcadoHoje ? 'Check-in Feito ✓ (Desmarcar)' : 'Registrar Check-in de Hoje'}</span>
                    </button>
                  </Card>
                );
              })
            ) : (
              <EmptyState
                icon={<IconClock size={24} />}
                titulo="Nenhum aluno online cadastrado"
                descricao="Cadastre alunos de consultoria online com frequência de check-in."
                acaoLabel="Cadastrar Aluno Online"
                onAcao={() => navegarPara('aluno/novo')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
