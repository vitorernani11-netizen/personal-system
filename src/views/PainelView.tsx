import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import type { SegmentOption } from '../components/ui/SegmentedControl';
import { db } from '../db';
import { navegarPara } from '../router';
import { RelatorioGeralPresencas } from '../components/presenca/RelatorioGeralPresencas';
import { IconWhatsApp } from '../components/ui/Icons';
import type { Aluno } from '../types/database';

export const PainelView: React.FC = () => {
  const [abaPainel, setAbaPainel] = useState<'financeiro' | 'frequencia'>('financeiro');
  const [recebidoNoMes, setRecebidoNoMes] = useState(0);
  const [pagoCount, setPagoCount] = useState(0);
  const [aReceberNoMes, setAReceberNoMes] = useState(0);
  const [abertoCount, setAbertoCount] = useState(0);
  const [emAtraso, setEmAtraso] = useState(0);
  const [atrasadoCount, setAtrasadoCount] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);

  const [totalPresenciais, setTotalPresenciais] = useState(0);
  const [faturamentoPresencial, setFaturamentoPresencial] = useState(0);
  const [totalOnline, setTotalOnline] = useState(0);
  const [faturamentoOnline, setFaturamentoOnline] = useState(0);

  const [alunosRisco, setAlunosRisco] = useState<{ aluno: Aluno; dias: number; tipo: string }[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarMetricas() {
      try {
        const [cobrancas, alunos, config] = await Promise.all([
          db.cobrancas.toArray(),
          db.alunos.toArray(),
          db.config.get('unico'),
        ]);

        const hojeStr = new Date().toISOString().split('T')[0];
        const mesAtual = hojeStr.substring(0, 7);
        const agoraMs = Date.now();

        const limitePresencial = config?.diasParaSumidoPresencial || 14;
        const limiteOnline = config?.diasParaSumidoOnline || 10;

        let rec = 0;
        let pCount = 0;
        let aRec = 0;
        let abCount = 0;
        let atr = 0;
        let atCount = 0;

        let fatPres = 0;
        let fatOn = 0;

        const alunosMap = new Map(alunos.map((a) => [a.id, a]));

        for (const cob of cobrancas) {
          const al = alunosMap.get(cob.alunoId);
          const isCompetenciaAtual = cob.competencia === mesAtual;

          if (cob.status === 'paga') {
            if (isCompetenciaAtual || (cob.pagoEm && cob.pagoEm.startsWith(mesAtual))) {
              rec += cob.valor;
              pCount += 1;
            }
          } else if (cob.status === 'atrasada' || (cob.status === 'aberta' && cob.vencimento < hojeStr)) {
            atr += cob.valor;
            atCount += 1;
          } else if (cob.status === 'aberta') {
            aRec += cob.valor;
            abCount += 1;
          }

          if (al) {
            if (al.modalidade === 'presencial' || al.modalidade === 'hibrido') {
              fatPres += cob.valor;
            } else {
              fatOn += cob.valor;
            }
          }
        }

        const alunosAtivos = alunos.filter((a) => a.status === 'ativo');
        const pres = alunosAtivos.filter((a) => a.modalidade === 'presencial' || a.modalidade === 'hibrido').length;
        const onl = alunosAtivos.filter((a) => a.modalidade === 'online').length;

        setTotalPresenciais(pres);
        setTotalOnline(onl);
        setFaturamentoPresencial(fatPres);
        setFaturamentoOnline(fatOn);

        setRecebidoNoMes(rec);
        setPagoCount(pCount);
        setAReceberNoMes(aRec);
        setAbertoCount(abCount);
        setEmAtraso(atr);
        setAtrasadoCount(atCount);

        const totalEsperado = rec + aRec + atr;
        const tm = alunosAtivos.length > 0 ? Math.round(totalEsperado / alunosAtivos.length) : 0;
        setTicketMedio(tm);

        // Radar de abandono
        const risco: { aluno: Aluno; dias: number; tipo: string }[] = [];
        for (const al of alunosAtivos) {
          if (al.modalidade === 'presencial' || al.modalidade === 'hibrido') {
            if (!al.ultimaPresenca) {
              risco.push({ aluno: al, dias: 99, tipo: 'presencial' });
            } else {
              const diff = Math.floor((agoraMs - new Date(al.ultimaPresenca).getTime()) / (1000 * 60 * 60 * 24));
              if (diff >= limitePresencial) {
                risco.push({ aluno: al, dias: diff, tipo: 'presencial' });
              }
            }
          } else if (al.modalidade === 'online') {
            if (!al.ultimoCheckin) {
              risco.push({ aluno: al, dias: 99, tipo: 'online' });
            } else {
              const diff = Math.floor((agoraMs - new Date(al.ultimoCheckin).getTime()) / (1000 * 60 * 60 * 24));
              if (diff >= limiteOnline) {
                risco.push({ aluno: al, dias: diff, tipo: 'online' });
              }
            }
          }
        }
        setAlunosRisco(risco);
      } catch (err) {
        console.error('Erro ao calcular métricas do painel:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregarMetricas();
  }, []);

  if (carregando) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando painel de métricas...
      </div>
    );
  }

  const totalFat = faturamentoPresencial + faturamentoOnline || 1;
  const percPresencial = Math.round((faturamentoPresencial / totalFat) * 100);
  const percOnline = 100 - percPresencial;

  const opcoesAba: SegmentOption<'financeiro' | 'frequencia'>[] = [
    { value: 'financeiro', label: 'Financeiro & Retenção' },
    { value: 'frequencia', label: 'Frequência & Faltas' },
  ];

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Painel"
        subtitulo={
          abaPainel === 'financeiro'
            ? 'Métricas financeiras e retenção'
            : 'Relatório mensal de presenças e faltas'
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Controle de Abas do Painel */}
        <SegmentedControl
          options={opcoesAba}
          value={abaPainel}
          onChange={(val) => setAbaPainel(val)}
        />

        {abaPainel === 'financeiro' ? (
          <>
            {/* Resumo do Mês */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <Card style={{ padding: '14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>RECEBIDO NO MÊS</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--positive)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
                  R$ {(recebidoNoMes / 100).toFixed(2).replace('.', ',')}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {pagoCount} {pagoCount === 1 ? 'mensalidade paga' : 'mensalidades pagas'}
                </span>
              </Card>

              <Card style={{ padding: '14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>A RECEBER</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
                  R$ {(aReceberNoMes / 100).toFixed(2).replace('.', ',')}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {abertoCount} a vencer
                </span>
              </Card>

              <Card style={{ padding: '14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>EM ATRASO</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: emAtraso > 0 ? 'var(--negative)' : 'var(--text-main)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
                  R$ {(emAtraso / 100).toFixed(2).replace('.', ',')}
                </p>
                <span style={{ fontSize: '11px', color: emAtraso > 0 ? 'var(--negative)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  {atrasadoCount} {atrasadoCount === 1 ? 'inadimplente' : 'inadimplentes'}
                </span>
              </Card>

              <Card style={{ padding: '14px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TICKET MÉDIO</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
                  R$ {(ticketMedio / 100).toFixed(2).replace('.', ',')}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>por aluno ativo</span>
              </Card>
            </div>

            {/* Faturamento: Presencial contra Online */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{ fontSize: '15px' }}>Presencial vs Online</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Presencial ({totalPresenciais} alunos)</span>
                    <strong>R$ {(faturamentoPresencial / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ({percPresencial}%)</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#EAE5DB', overflow: 'hidden' }}>
                    <div style={{ width: `${percPresencial}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--online)' }}>Consultoria Online ({totalOnline} alunos)</span>
                    <strong>R$ {(faturamentoOnline / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ({percOnline}%)</strong>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#EAE5DB', overflow: 'hidden' }}>
                    <div style={{ width: `${percOnline}%`, height: '100%', backgroundColor: 'var(--online)' }} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Radar de Abandono */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '15px' }}>Radar de Abandono</h2>
                <Badge tipo={alunosRisco.length > 0 ? 'atrasada' : 'paga'} label={`${alunosRisco.length} em risco`} size="sm" />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Alunos que ultrapassaram o tempo limite de presença ou check-in:
              </p>

              {alunosRisco.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {alunosRisco.map(({ aluno, dias, tipo }) => {
                    const primeiroNome = aluno.nome.split(' ')[0];
                    const msgResgate =
                      tipo === 'online'
                        ? `Oi ${primeiroNome}! Tudo bem? Notei que faz alguns dias que não recebo seus check-ins. Tá conseguindo seguir a planilha? Me avisa se precisar ajustar algo! 💪`
                        : `Oi ${primeiroNome}! Tudo bem? Senti sua falta nos treinos esses dias! Tá tudo bem por aí? Bora marcar o próximo pra mantermos o ritmo? 👊`;

                    return (
                      <div
                        key={aluno.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        <div
                          onClick={() => navegarPara(`aluno/${aluno.id}`)}
                          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {aluno.nome} ({tipo === 'online' ? 'Online' : 'Presencial'})
                          </span>
                          <span style={{ color: 'var(--negative)', fontWeight: 600, fontSize: '11px' }}>
                            {dias >= 99 ? 'Sem registro de atividade' : `${dias} dias sem atividade`}
                          </span>
                        </div>

                        {aluno.telefone && (
                          <a
                            href={`https://wa.me/55${aluno.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msgResgate)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#25D366',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              flexShrink: 0,
                            }}
                            title={`Resgatar ${primeiroNome} no WhatsApp`}
                          >
                            <IconWhatsApp size={13} />
                            Resgatar
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--positive)', padding: '6px 0' }}>
                  Excelente! Nenhum aluno com faltas acumuladas acima do limite.
                </p>
              )}
            </Card>
          </>
        ) : (
          /* Aba: Relatório Mensal de Presenças e Faltas Geral */
          <RelatorioGeralPresencas />
        )}
      </div>
    </div>
  );
};
