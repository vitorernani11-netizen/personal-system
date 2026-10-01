import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { IconChevronRight, IconSearch } from '../ui/Icons';
import {
  obterRelatorioGeralMensal,
  type RelatorioGeralMensal,
  type AlunoResumoFrequencia,
} from '../../db/presenca';
import { navegarPara } from '../../router';

type FiltroTipo = 'todos' | 'faltas' | 'perfeito' | 'sem_registro';

export const RelatorioGeralPresencas: React.FC = () => {
  const hoje = new Date();
  const hojeMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mesSelecionado, setMesSelecionado] = useState<string>(hojeMes);
  const [relatorio, setRelatorio] = useState<RelatorioGeralMensal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTipo>('todos');

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        setCarregando(true);
        const res = await obterRelatorioGeralMensal(mesSelecionado);
        if (ativo) setRelatorio(res);
      } catch (err) {
        console.error('Erro ao carregar relatório geral de presenças:', err);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [mesSelecionado]);

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

  const formatarNomeMes = (anoMes: string) => {
    const [ano, mes] = anoMes.split('-');
    const data = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  };

  const contagensFiltros = useMemo(() => {
    if (!relatorio) return { todos: 0, faltas: 0, perfeito: 0, semRegistro: 0 };
    const lista = relatorio.alunos;
    return {
      todos: lista.length,
      faltas: lista.filter((a) => a.faltas > 0).length,
      perfeito: lista.filter((a) => a.totalAulas > 0 && a.faltas === 0).length,
      semRegistro: lista.filter((a) => a.totalAulas === 0).length,
    };
  }, [relatorio]);

  const alunosFiltrados = useMemo(() => {
    if (!relatorio) return [];
    let lista = relatorio.alunos;

    // Filtro por categoria
    if (filtroAtivo === 'faltas') {
      lista = lista.filter((a) => a.faltas > 0);
    } else if (filtroAtivo === 'perfeito') {
      lista = lista.filter((a) => a.totalAulas > 0 && a.faltas === 0);
    } else if (filtroAtivo === 'sem_registro') {
      lista = lista.filter((a) => a.totalAulas === 0);
    }

    // Filtro por texto de busca
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter((a) => a.nome.toLowerCase().includes(q));
    }

    return lista;
  }, [relatorio, filtroAtivo, busca]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Cabeçalho Compacto: Mês e Ações */}
      <Card style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => handleMudarMes(-1)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            ← Anterior
          </button>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '15px', margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>
              {formatarNomeMes(mesSelecionado)}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Frequência e faltas mensais
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleMudarMes(1)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            Próximo →
          </button>
        </div>

        {/* Indicadores Globais em Barra Compacta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Aulas
            </span>
            <p style={{ fontSize: '15px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-main)' }}>
              {relatorio?.totalAulasRegistradas || 0}
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--positive)', fontWeight: 700, textTransform: 'uppercase' }}>
              Presenças
            </span>
            <p style={{ fontSize: '15px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--positive)' }}>
              {relatorio?.totalPresencas || 0}
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--negative)', fontWeight: 700, textTransform: 'uppercase' }}>
              Faltas
            </span>
            <p style={{ fontSize: '15px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--negative)' }}>
              {relatorio?.totalFaltas || 0}
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Média Geral
            </span>
            <p style={{ fontSize: '15px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--primary)' }}>
              {relatorio?.taxaGeralFrequencia ?? 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* Barra de Filtros e Busca Rápida */}
      <Card style={{ padding: '8px 12px' }}>
        {/* Campo de Busca */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 10px',
            marginBottom: '8px',
          }}
        >
          <IconSearch size={14} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '12px',
              color: 'var(--text-main)',
            }}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Limpar
            </button>
          )}
        </div>

        {/* Chips de Filtragem */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setFiltroAtivo('todos')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtroAtivo === 'todos' ? 'var(--primary)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'todos' ? 'var(--primary)' : '#FFFFFF',
              color: filtroAtivo === 'todos' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Todos ({contagensFiltros.todos})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('faltas')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtroAtivo === 'faltas' ? 'var(--negative)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'faltas' ? 'var(--negative-bg)' : '#FFFFFF',
              color: filtroAtivo === 'faltas' ? 'var(--negative)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Com Faltas ({contagensFiltros.faltas})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('perfeito')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtroAtivo === 'perfeito' ? 'var(--positive)' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'perfeito' ? 'var(--positive-bg)' : '#FFFFFF',
              color: filtroAtivo === 'perfeito' ? 'var(--positive)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            100% Presentes ({contagensFiltros.perfeito})
          </button>

          <button
            type="button"
            onClick={() => setFiltroAtivo('sem_registro')}
            style={{
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${filtroAtivo === 'sem_registro' ? '#64748B' : 'var(--border-color)'}`,
              backgroundColor: filtroAtivo === 'sem_registro' ? '#F1F5F9' : '#FFFFFF',
              color: filtroAtivo === 'sem_registro' ? '#0F172A' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sem Registros ({contagensFiltros.semRegistro})
          </button>
        </div>
      </Card>

      {/* Lista Otimizada e Compacta com Scroll Interno Limitado */}
      <Card style={{ padding: '4px 8px' }}>
        {carregando ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Carregando frequência dos alunos...
          </div>
        ) : alunosFiltrados.length > 0 ? (
          <div
            style={{
              maxHeight: '440px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {alunosFiltrados.map((item: AlunoResumoFrequencia, index) => (
              <div
                key={item.alunoId}
                onClick={() => navegarPara(`aluno/${item.alunoId}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 8px',
                  borderBottom: index < alunosFiltrados.length - 1 ? '1px solid var(--border-color)' : 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nome}
                    </span>
                    <Badge tipo={item.modalidade as any} size="sm" />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--positive)', fontWeight: 600 }}>
                      ✓ {item.presencas}
                    </span>
                    <span style={{ color: item.faltas > 0 ? 'var(--negative)' : 'var(--text-secondary)', fontWeight: 600 }}>
                      ✕ {item.faltas} {item.faltas === 1 ? 'falta' : 'faltas'}
                    </span>
                    {item.justificadas > 0 && (
                      <span style={{ color: '#D97706', fontWeight: 600 }}>
                        • {item.justificadas} just.
                      </span>
                    )}
                  </div>
                </div>

                {/* Coluna da Frequência / Assiduidade */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color:
                          item.totalAulas === 0
                            ? 'var(--text-secondary)'
                            : item.taxaFrequencia >= 80
                            ? 'var(--positive)'
                            : item.taxaFrequencia >= 60
                            ? '#D97706'
                            : 'var(--negative)',
                      }}
                    >
                      {item.totalAulas === 0 ? '—' : `${item.taxaFrequencia}%`}
                    </span>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>frequência</div>
                  </div>
                  <IconChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {busca ? `Nenhum aluno encontrado para "${busca}".` : 'Nenhum aluno nessa categoria.'}
          </div>
        )}
      </Card>
    </div>
  );
};
