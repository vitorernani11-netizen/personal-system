import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { IconSearch, IconPlus, IconAlunos } from '../components/ui/Icons';
import { navegarPara } from '../router';
import { db } from '../db';
import { formatarDiasSemana } from '../utils/formatters';
import type { Aluno, Cobranca } from '../types/database';

type FiltroAlunoTipo = 'todos' | 'presencial' | 'online' | 'atrasados' | 'sumidos' | 'sem_contrato' | 'inativos';

export const AlunosView: React.FC = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [limitePresencial, setLimitePresencial] = useState(14);
  const [limiteOnline, setLimiteOnline] = useState(10);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAlunoTipo>('todos');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [todosAlunos, todasCobrancas, config] = await Promise.all([
          db.alunos.toArray(),
          db.cobrancas.toArray(),
          db.config.get('unico'),
        ]);
        setAlunos(todosAlunos);
        setCobrancas(todasCobrancas);
        if (config) {
          setLimitePresencial(config.diasParaSumidoPresencial || 14);
          setLimiteOnline(config.diasParaSumidoOnline || 10);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de alunos:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const [{ agoraMs, hojeStr }] = useState(() => ({
    agoraMs: Date.now(),
    hojeStr: new Date().toISOString().split('T')[0],
  }));

  // Mapeamento de cobranças por aluno para detectar status financeiro
  const cobrancasPorAluno = useMemo(() => {
    const mapa = new Map<string, { status: 'paga' | 'aberta' | 'atrasada' | 'vence_hoje' | 'sem_cobranca'; cobranca?: Cobranca }>();
    for (const al of alunos) {
      const cobsAluno = cobrancas
        .filter((c) => c.alunoId === al.id)
        .sort((a, b) => b.vencimento.localeCompare(a.vencimento));

      if (cobsAluno.length === 0) {
        mapa.set(al.id, { status: 'sem_cobranca' });
      } else {
        const aberta = cobsAluno.find((c) => c.status === 'aberta' || c.status === 'atrasada');
        if (aberta) {
          const isAtrasada = aberta.status === 'atrasada' || aberta.vencimento < hojeStr;
          const isHoje = aberta.vencimento === hojeStr;
          mapa.set(al.id, {
            status: isAtrasada ? 'atrasada' : isHoje ? 'vence_hoje' : 'aberta',
            cobranca: aberta,
          });
        } else {
          mapa.set(al.id, { status: 'paga', cobranca: cobsAluno[0] });
        }
      }
    }
    return mapa;
  }, [alunos, cobrancas, hojeStr]);

  // Identificação de alunos sumidos / em risco
  const sumidosSet = useMemo(() => {
    const set = new Set<string>();
    for (const al of alunos) {
      if (al.status === 'inativo') continue;
      const ref = al.modalidade === 'online' ? al.ultimoCheckin : al.ultimaPresenca;
      const limite = al.modalidade === 'online' ? limiteOnline : limitePresencial;

      if (!ref) {
        set.add(al.id);
      } else {
        const dias = Math.floor((agoraMs - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
        if (dias >= limite) {
          set.add(al.id);
        }
      }
    }
    return set;
  }, [alunos, agoraMs, limitePresencial, limiteOnline]);

  // Contagens dos filtros para os chips
  const contagens = useMemo(() => {
    const ativos = alunos.filter((a) => a.status === 'ativo');
    const pres = ativos.filter((a) => a.modalidade === 'presencial' || a.modalidade === 'hibrido').length;
    const onl = ativos.filter((a) => a.modalidade === 'online').length;
    const atrasados = ativos.filter((a) => cobrancasPorAluno.get(a.id)?.status === 'atrasada').length;
    const sumidos = ativos.filter((a) => sumidosSet.has(a.id)).length;
    const semContrato = ativos.filter((a) => !a.contratoId).length;
    const inativos = alunos.filter((a) => a.status === 'inativo').length;

    return {
      total: alunos.length,
      ativos: ativos.length,
      presencial: pres,
      online: onl,
      atrasados,
      sumidos,
      semContrato,
      inativos,
    };
  }, [alunos, cobrancasPorAluno, sumidosSet]);

  // Filtragem da lista
  const alunosFiltrados = useMemo(() => {
    return alunos.filter((a) => {
      // Busca
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const bateNome = a.nome.toLowerCase().includes(q);
        const bateTelefone = a.telefone.includes(q);
        if (!bateNome && !bateTelefone) return false;
      }

      // Filtro
      if (filtroAtivo === 'presencial') {
        return a.status === 'ativo' && (a.modalidade === 'presencial' || a.modalidade === 'hibrido');
      }
      if (filtroAtivo === 'online') {
        return a.status === 'ativo' && a.modalidade === 'online';
      }
      if (filtroAtivo === 'atrasados') {
        return a.status === 'ativo' && cobrancasPorAluno.get(a.id)?.status === 'atrasada';
      }
      if (filtroAtivo === 'sumidos') {
        return a.status === 'ativo' && sumidosSet.has(a.id);
      }
      if (filtroAtivo === 'sem_contrato') {
        return a.status === 'ativo' && !a.contratoId;
      }
      if (filtroAtivo === 'inativos') {
        return a.status === 'inativo';
      }

      return true;
    });
  }, [alunos, busca, filtroAtivo, cobrancasPorAluno, sumidosSet]);

  const obterIniciais = (nome: string) => {
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const calcularStatusAtividade = (aluno: Aluno) => {
    const ref = aluno.modalidade === 'online' ? aluno.ultimoCheckin : aluno.ultimaPresenca;
    if (!ref) {
      return { texto: 'Sem registro de treino', emRisco: true };
    }
    if (ref === hojeStr) {
      return { texto: '✓ Treinou hoje', hoje: true };
    }
    const dias = Math.floor((agoraMs - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
    const limite = aluno.modalidade === 'online' ? limiteOnline : limitePresencial;
    const dataFormatada = ref.split('-').reverse().slice(0, 2).join('/');

    if (dias >= limite) {
      return { texto: `⚠ ${dias} dias sem treino (${dataFormatada})`, emRisco: true };
    }
    return { texto: `Último treino: ${dataFormatada}`, emRisco: false };
  };

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Gestão de Alunos"
        subtitulo={`${contagens.ativos} ativos • ${contagens.presencial} presenciais • ${contagens.online} online`}
        acaoDireita={
          <Button
            variant="primary"
            style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px' }}
            icon={<IconPlus size={16} />}
            onClick={() => navegarPara('aluno/novo')}
          >
            Novo Aluno
          </Button>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Métricas Rápidas no Topo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          <Card style={{ padding: '8px 10px', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Ativos
            </span>
            <p style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-main)' }}>
              {contagens.ativos}
            </p>
          </Card>

          <Card style={{ padding: '8px 10px', textAlign: 'center', borderTop: '2px solid var(--primary)' }}>
            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Presenciais
            </span>
            <p style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--primary)' }}>
              {contagens.presencial}
            </p>
          </Card>

          <Card style={{ padding: '8px 10px', textAlign: 'center', borderTop: '2px solid var(--online)' }}>
            <span style={{ fontSize: '10px', color: 'var(--online)', fontWeight: 700, textTransform: 'uppercase' }}>
              Online
            </span>
            <p style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--online)' }}>
              {contagens.online}
            </p>
          </Card>

          <Card
            style={{
              padding: '8px 10px',
              textAlign: 'center',
              borderTop: `2px solid ${contagens.atrasados > 0 ? 'var(--negative)' : 'var(--positive)'}`,
            }}
          >
            <span
              style={{
                fontSize: '10px',
                color: contagens.atrasados > 0 ? 'var(--negative)' : 'var(--positive)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Em Atraso
            </span>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 800,
                margin: '2px 0 0 0',
                color: contagens.atrasados > 0 ? 'var(--negative)' : 'var(--positive)',
              }}
            >
              {contagens.atrasados}
            </p>
          </Card>
        </div>

        {/* Campo de Busca Rápida */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0 12px',
            minHeight: '40px',
          }}
        >
          <IconSearch size={16} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou WhatsApp..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
            }}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              style={{ border: 'none', background: 'none', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Limpar
            </button>
          )}
        </div>

        {/* Filtros em Chips Horizontais */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setFiltroAtivo('todos')}
            style={{
              padding: '5px 10px',
              borderRadius: '16px',
              border: `1px solid ${filtroAtivo === 'todos' ? 'var(--primary)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'todos' ? 'var(--primary)' : '#FFFFFF',
              color: filtroAtivo === 'todos' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Todos ({contagens.total})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('presencial')}
            style={{
              padding: '5px 10px',
              borderRadius: '16px',
              border: `1px solid ${filtroAtivo === 'presencial' ? 'var(--primary)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'presencial' ? 'var(--primary-tint)' : '#FFFFFF',
              color: filtroAtivo === 'presencial' ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Presencial ({contagens.presencial})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('online')}
            style={{
              padding: '5px 10px',
              borderRadius: '16px',
              border: `1px solid ${filtroAtivo === 'online' ? 'var(--online)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'online' ? '#EFF6FF' : '#FFFFFF',
              color: filtroAtivo === 'online' ? 'var(--online)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Online ({contagens.online})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('atrasados')}
            style={{
              padding: '5px 10px',
              borderRadius: '16px',
              border: `1px solid ${filtroAtivo === 'atrasados' ? 'var(--negative)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'atrasados' ? 'var(--negative-bg)' : '#FFFFFF',
              color: filtroAtivo === 'atrasados' ? 'var(--negative)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Atrasados ({contagens.atrasados})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('sumidos')}
            style={{
              padding: '5px 10px',
              borderRadius: '16px',
              border: `1px solid ${filtroAtivo === 'sumidos' ? '#D97706' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'sumidos' ? '#FEF3C7' : '#FFFFFF',
              color: filtroAtivo === 'sumidos' ? '#92400E' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Em Risco ({contagens.sumidos})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('sem_contrato')}
            style={{
              padding: '5px 10px',
              borderRadius: '16px',
              border: `1px solid ${filtroAtivo === 'sem_contrato' ? '#64748B' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'sem_contrato' ? '#F1F5F9' : '#FFFFFF',
              color: filtroAtivo === 'sem_contrato' ? '#0F172A' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sem Contrato ({contagens.semContrato})
          </button>
        </div>

        {/* Lista de Alunos Otimizada */}
        {carregando ? (
          <Card style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Carregando alunos...
          </Card>
        ) : alunosFiltrados.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alunosFiltrados.map((aluno) => {
              const cobInfo = cobrancasPorAluno.get(aluno.id);
              const ativInfo = calcularStatusAtividade(aluno);
              const iniciais = obterIniciais(aluno.nome);

              return (
                <Card
                  key={aluno.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 14px',
                    gap: '8px',
                    borderLeft:
                      cobInfo?.status === 'atrasada'
                        ? '4px solid var(--negative)'
                        : ativInfo.emRisco
                        ? '4px solid #D97706'
                        : '4px solid var(--primary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navegarPara(`aluno/${aluno.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* Identificação e Avatar */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: aluno.modalidade === 'online' ? '#EFF6FF' : 'var(--primary-tint)',
                          color: aluno.modalidade === 'online' ? 'var(--online)' : 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                          fontFamily: 'var(--font-heading)',
                          flexShrink: 0,
                        }}
                      >
                        {iniciais}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                            {aluno.nome}
                          </span>
                          <Badge tipo={aluno.modalidade} size="sm" />
                          {!aluno.contratoId && <Badge tipo="sem_contrato" size="sm" />}
                        </div>

                        {/* Rotina de Treino */}
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {aluno.modalidade !== 'online'
                            ? `⏰ ${formatarDiasSemana(aluno.diasSemana)} às ${aluno.horario || 'horário livre'}${aluno.local ? ` • 📍 ${aluno.local}` : ''}`
                            : `🌐 Consultoria • Check-in ${aluno.frequenciaCheckin || 'semanal'}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Faixa Inferior de Indicadores Precisos */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-color)',
                      fontSize: '11px',
                    }}
                  >
                    {/* Status de Presença / Atividade */}
                    <span
                      style={{
                        fontWeight: 600,
                        color: ativInfo.hoje
                          ? 'var(--positive)'
                          : ativInfo.emRisco
                          ? 'var(--negative)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {ativInfo.texto}
                    </span>

                    {/* Status Financeiro */}
                    <div>
                      {cobInfo?.status === 'atrasada' ? (
                        <span style={{ color: 'var(--negative)', fontWeight: 700, backgroundColor: 'var(--negative-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                          Mensalidade Atrasada
                        </span>
                      ) : cobInfo?.status === 'vence_hoje' ? (
                        <span style={{ color: '#D97706', fontWeight: 700, backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>
                          Vence Hoje
                        </span>
                      ) : cobInfo?.status === 'paga' ? (
                        <span style={{ color: 'var(--positive)', fontWeight: 600 }}>
                          Em dia ✓
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Sem cobrança</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<IconAlunos size={24} />}
            titulo={busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
            descricao={
              busca
                ? 'Tente buscar com outro nome ou mude o filtro.'
                : 'Cadastre seus primeiros alunos presenciais e de consultoria online.'
            }
            acaoLabel="Cadastrar Primeiro Aluno"
            onAcao={() => navegarPara('aluno/novo')}
          />
        )}
      </div>
    </div>
  );
};
