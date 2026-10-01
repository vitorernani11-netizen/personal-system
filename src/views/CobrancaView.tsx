import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { IconWhatsApp, IconPix, IconCheck, IconPlus } from '../components/ui/Icons';
import { voltar, navegarPara } from '../router';
import { db } from '../db';
import { gerarPixCopiaECola } from '../utils/pix';
import type { Aluno, Cobranca, Config } from '../types/database';

interface CobrancaViewProps {
  cobrancaId?: string;
}

export const CobrancaView: React.FC<CobrancaViewProps> = ({ cobrancaId }) => {
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do formulário de nova cobrança
  const [criandoNova, setCriandoNova] = useState(false);
  const [alunoIdSelecionado, setAlunoIdSelecionado] = useState('');
  const [valorInput, setValorInput] = useState('650,00');
  const [vencimentoInput, setVencimentoInput] = useState(new Date().toISOString().split('T')[0]);
  const [competenciaInput, setCompetenciaInput] = useState(new Date().toISOString().substring(0, 7));

  // Feedbacks
  const [copiado, setCopiado] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const [cfg, todosAlunos] = await Promise.all([
          db.config.get('unico'),
          db.alunos.toArray(),
        ]);
        if (cfg) setConfig(cfg);
        setAlunosDisponiveis(todosAlunos);

        if (cobrancaId && cobrancaId !== 'nova') {
          const cob = await db.cobrancas.get(cobrancaId);
          if (cob) {
            setCobranca(cob);
            const al = await db.alunos.get(cob.alunoId);
            if (al) setAluno(al);
            setCriandoNova(false);
          } else {
            // Se id não encontrado, abre criação
            setCriandoNova(true);
            if (todosAlunos.length > 0) setAlunoIdSelecionado(todosAlunos[0].id);
          }
        } else {
          // Modo nova cobrança
          setCriandoNova(true);
          if (todosAlunos.length > 0) setAlunoIdSelecionado(todosAlunos[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar cobrança:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [cobrancaId]);

  const handleCriarCobranca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoIdSelecionado) {
      setFeedback('Selecione um aluno para gerar a cobrança.');
      return;
    }

    try {
      const centavos = Math.round(parseFloat(valorInput.replace(/\./g, '').replace(',', '.')) * 100) || 65000;
      const agora = new Date().toISOString();
      const novoId = crypto.randomUUID();

      const novaCob: Cobranca = {
        id: novoId,
        alunoId: alunoIdSelecionado,
        valor: centavos,
        vencimento: vencimentoInput,
        status: 'aberta',
        competencia: competenciaInput,
        etapaRegua: 2,
        criadoEm: agora,
        atualizadoEm: agora,
      };

      await db.cobrancas.put(novaCob);
      const al = await db.alunos.get(alunoIdSelecionado);
      setCobranca(novaCob);
      if (al) setAluno(al);
      setCriandoNova(false);
      navegarPara(`cobranca/${novoId}`);
      setFeedback('Cobrança gerada com sucesso!');
    } catch (err) {
      console.error(err);
      setFeedback('Erro ao criar cobrança.');
    }
  };

  const handleAlternarStatusPagamento = async () => {
    if (!cobranca) return;
    const agora = new Date().toISOString();
    const novoStatus = cobranca.status === 'paga' ? 'aberta' : 'paga';
    const pagoEm = novoStatus === 'paga' ? agora : undefined;

    await db.cobrancas.update(cobranca.id, {
      status: novoStatus,
      pagoEm,
      atualizadoEm: agora,
    });

    setCobranca({
      ...cobranca,
      status: novoStatus,
      pagoEm,
      atualizadoEm: agora,
    });

    setFeedback(novoStatus === 'paga' ? 'Pagamento registrado com sucesso!' : 'Pagamento desfeito (em aberto).');
  };

  // Cálculo e dados
  const valorCentavos = cobranca ? cobranca.valor : 65000;
  const valorReais = (valorCentavos / 100).toFixed(2).replace('.', ',');
  const vencimentoFormatado = cobranca
    ? cobranca.vencimento.split('-').reverse().join('/')
    : new Date().toLocaleDateString('pt-BR');

  const codigoPix = gerarPixCopiaECola({
    chavePix: config?.chavePix || 'carlos.personal@pix.com',
    nomeRecebedor: config?.nomePersonal || 'Personal Trainer',
    cidadeRecebedor: config?.cidade || 'SAO PAULO',
    valorCentavos,
    identificador: cobranca?.id.substring(0, 10) || 'COB01',
  });

  const nomeAluno = aluno?.nome || 'Aluno';
  const textoMensagem = `Olá, ${nomeAluno}! Tudo bem? Passando para enviar as informações da sua mensalidade com vencimento em ${vencimentoFormatado} no valor de R$ ${valorReais}.

Para facilitar, você pode pagar diretamente pelo PIX Copia e Cola:
${codigoPix}

Qualquer dúvida ou comprovante, é só me mandar aqui. Bons treinos!`;

  const handleCopiarPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      setFeedback('Código PIX copiado para a área de transferência!');
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  const handleEnviarWhatsApp = async () => {
    if (!aluno) return;
    // Registra envio no histórico
    const agora = new Date().toISOString();
    await db.mensagensEnviadas.add({
      id: crypto.randomUUID(),
      alunoId: aluno.id,
      cobrancaId: cobranca?.id,
      canal: 'whatsapp',
      tipo: 'cobranca_manual',
      enviadaEm: agora,
      criadoEm: agora,
      atualizadoEm: agora,
    });

    const telLimpo = aluno.telefone.replace(/\D/g, '');
    const url = `https://wa.me/${telLimpo}?text=${encodeURIComponent(textoMensagem)}`;
    window.open(url, '_blank');
    setFeedback('Histórico de envio registrado e WhatsApp aberto!');
  };

  if (carregando) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando cobrança...
      </div>
    );
  }

  // Tela de Criação de Nova Cobrança
  if (criandoNova) {
    return (
      <div style={{ paddingBottom: '90px' }}>
        <Header
          titulo="Nova Cobrança"
          subtitulo="Gerar mensalidade com PIX"
          mostrarVoltar
          onVoltar={voltar}
        />

        <form onSubmit={handleCriarCobranca} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {feedback && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--positive-bg)', color: 'var(--positive)', fontSize: '13px', fontWeight: 600 }}>
              {feedback}
            </div>
          )}

          <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '16px' }}>Dados da Mensalidade</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Selecione o Aluno *
              </label>
              <select
                value={alunoIdSelecionado}
                onChange={(e) => setAlunoIdSelecionado(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {alunosDisponiveis.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} ({a.modalidade})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Valor (R$) *
                </label>
                <input
                  type="text"
                  required
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
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
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={vencimentoInput}
                  onChange={(e) => setVencimentoInput(e.target.value)}
                  style={{
                    minHeight: '44px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Competência (AAAA-MM)
              </label>
              <input
                type="month"
                value={competenciaInput}
                onChange={(e) => setCompetenciaInput(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              />
            </div>
          </Card>

          <Button type="submit" variant="primary" fullWidth icon={<IconPlus size={18} />}>
            Gerar Cobrança e PIX
          </Button>
        </form>
      </div>
    );
  }

  const isPago = cobranca?.status === 'paga';

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Cobrança"
        subtitulo={`${nomeAluno} • ${aluno?.modalidade || 'Personal'}`}
        mostrarVoltar
        onVoltar={voltar}
        acaoDireita={
          <Button
            variant="ghost"
            style={{ fontSize: '12px', padding: '0 8px', minHeight: '34px' }}
            onClick={() => setCriandoNova(true)}
          >
            + Nova
          </Button>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: isPago ? 'var(--positive-bg)' : 'var(--primary-tint)',
              color: isPago ? 'var(--positive)' : 'var(--primary)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {feedback}
          </div>
        )}

        {/* Bloco de Valor e Status */}
        <Card style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
            <Badge tipo={cobranca?.status || 'aberta'} size="md" />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>VALOR DA MENSALIDADE</span>
          <p
            style={{
              fontSize: '32px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              color: isPago ? 'var(--positive)' : 'var(--text-main)',
              margin: '4px 0',
            }}
          >
            R$ {valorReais}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Vencimento: <strong>{vencimentoFormatado}</strong> • Competência: {cobranca?.competencia}
          </p>
        </Card>

        {/* Bloco PIX BR Code */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconPix size={20} style={{ color: 'var(--text-main)' }} />
            <h2 style={{ fontSize: '16px' }}>PIX Copia e Cola</h2>
          </div>

          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-app)',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '11px',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              maxHeight: '75px',
              overflowY: 'auto',
            }}
          >
            {codigoPix}
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={handleCopiarPix}
          >
            {copiado ? 'Código Copiado com Sucesso!' : 'Copiar Código PIX'}
          </Button>
        </Card>

        {/* Prévia da Mensagem */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px' }}>Mensagem Pronta para WhatsApp</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Toque 2 • Régua</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            {textoMensagem}
          </div>

          <Button
            variant="whatsapp"
            fullWidth
            icon={<IconWhatsApp size={18} />}
            onClick={handleEnviarWhatsApp}
          >
            Disparar no WhatsApp do Aluno
          </Button>
        </Card>

        {/* Botão de Dar Baixa */}
        <Button
          variant={isPago ? 'secondary' : 'primary'}
          fullWidth
          icon={<IconCheck size={18} />}
          onClick={handleAlternarStatusPagamento}
        >
          {isPago ? 'Desfazer Pagamento (Voltar para Aberta)' : 'Marcar como Paga (Parar Régua)'}
        </Button>
      </div>
    </div>
  );
};
