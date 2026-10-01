import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import type { SegmentOption } from '../components/ui/SegmentedControl';
import {
  IconFileText,
  IconAlert,
  IconCheck,
  IconShare,
  IconUpload,
  IconPaperclip,
  IconDownload,
  IconEye,
  IconTrash,
  IconWhatsApp,
} from '../components/ui/Icons';
import { voltar, navegarPara } from '../router';
import { db } from '../db';
import type { Aluno, Contrato, Config, Modalidade } from '../types/database';

interface ContratoViewProps {
  alunoId?: string;
}

export const ContratoView: React.FC<ContratoViewProps> = ({ alunoId }) => {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [todosAlunos, setTodosAlunos] = useState<Aluno[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [contratoExistente, setContratoExistente] = useState<Contrato | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Controle de Abas: Configurar/Gerar PDF vs Anexar Contrato Assinado
  const [abaAtiva, setAbaAtiva] = useState<'gerar' | 'anexar'>('gerar');

  // Parâmetros do Contrato
  const [modalidade, setModalidade] = useState<Modalidade>('presencial');
  const [vigenciaMeses, setVigenciaMeses] = useState(6);
  const [valorReais, setValorReais] = useState('650,00');
  const [diaVencimento, setDiaVencimento] = useState(10);
  const [avisoCancelamentoDias, setAvisoCancelamentoDias] = useState(30);
  const [horasRemarcacao, setHorasRemarcacao] = useState(6);

  // Cláusulas
  const [clausulaMedica, setClausulaMedica] = useState(true);
  const [clausulaRemarcacao, setClausulaRemarcacao] = useState(true);
  const [clausulaLgpd, setClausulaLgpd] = useState(true);
  const [clausulaImagem, setClausulaImagem] = useState(false);

  // Assinatura & Anexo
  const [caminhoAssinatura, setCaminhoAssinatura] = useState<'govbr' | 'manual'>('govbr');
  const [statusContrato, setStatusContrato] = useState<'rascunho' | 'gerado' | 'enviado' | 'assinado'>('rascunho');
  const [dataAssinatura, setDataAssinatura] = useState<string>(new Date().toISOString().split('T')[0]);
  const [arquivoAnexo, setArquivoAnexo] = useState<Blob | null>(null);
  const [nomeArquivoAnexo, setNomeArquivoAnexo] = useState<string | null>(null);
  const [tipoArquivoAnexo, setTipoArquivoAnexo] = useState<string | null>(null);
  const [tamanhoArquivoAnexo, setTamanhoArquivoAnexo] = useState<number | null>(null);
  const [arrastandoSobre, setArrastandoSobre] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exibirFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const carregarDadosDoAluno = async (targetAluno: Aluno) => {
    setAluno(targetAluno);
    setModalidade(targetAluno.modalidade);

    if (targetAluno.contratoId) {
      const cont = await db.contratos.get(targetAluno.contratoId);
      if (cont) {
        setContratoExistente(cont);
        setModalidade(cont.modalidade);
        setVigenciaMeses(cont.vigenciaMeses);
        setValorReais((cont.valor / 100).toFixed(2).replace('.', ','));
        setDiaVencimento(cont.diaVencimento);
        setAvisoCancelamentoDias(cont.avisoCancelamentoDias);
        setHorasRemarcacao(cont.horasRemarcacao);
        setStatusContrato(cont.status);
        setCaminhoAssinatura(cont.formaAssinatura || 'govbr');
        if (cont.assinadoEm) {
          setDataAssinatura(cont.assinadoEm.split('T')[0]);
        }
        if (cont.arquivoAssinado) {
          setArquivoAnexo(cont.arquivoAssinado);
          setNomeArquivoAnexo(cont.arquivoNome || 'contrato_assinado.pdf');
          setTipoArquivoAnexo(cont.arquivoTipo || 'application/pdf');
          setTamanhoArquivoAnexo(cont.arquivoTamanho || null);
          // Se já tem arquivo assinado, pode abrir direto na aba de anexo se desejar
        } else {
          setArquivoAnexo(null);
          setNomeArquivoAnexo(null);
          setTipoArquivoAnexo(null);
          setTamanhoArquivoAnexo(null);
        }
        setClausulaMedica(cont.clausulas.includes('medica'));
        setClausulaRemarcacao(cont.clausulas.includes('remarcacao'));
        setClausulaLgpd(cont.clausulas.includes('lgpd'));
        setClausulaImagem(cont.clausulas.includes('imagem'));
        return;
      }
    }
    // Aluno sem contrato ainda
    setContratoExistente(null);
    setStatusContrato('rascunho');
    setArquivoAnexo(null);
    setNomeArquivoAnexo(null);
    setTipoArquivoAnexo(null);
    setTamanhoArquivoAnexo(null);
  };

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const [cfg, alunos] = await Promise.all([
          db.config.get('unico'),
          db.alunos.toArray(),
        ]);
        if (cfg) setConfig(cfg);
        setTodosAlunos(alunos);

        let target = alunos.find((a) => a.id === alunoId);
        if (!target && alunos.length > 0) {
          target = alunos[0];
        }

        if (target) {
          await carregarDadosDoAluno(target);
        }
      } catch (err) {
        console.error('Erro ao carregar contrato:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [alunoId]);

  const clausulasSelecionadas = () => {
    const list: string[] = [];
    if (clausulaMedica) list.push('medica');
    if (clausulaRemarcacao) list.push('remarcacao');
    if (clausulaLgpd) list.push('lgpd');
    if (clausulaImagem) list.push('imagem');
    return list;
  };

  const salvarContratoNoBanco = async (
    novoStatus: 'rascunho' | 'gerado' | 'enviado' | 'assinado',
    blobAnexo?: Blob | null,
    nomeAnexo?: string | null,
    tipoAnexo?: string | null,
    tamanhoAnexo?: number | null,
    forma?: 'govbr' | 'manual',
    dataAssinada?: string
  ) => {
    if (!aluno) {
      exibirFeedback('Selecione um aluno para salvar o contrato.');
      return null;
    }

    const agora = new Date().toISOString();
    const idContrato = contratoExistente?.id || crypto.randomUUID();
    const centavos = Math.round(parseFloat(valorReais.replace(/\./g, '').replace(',', '.')) * 100) || 65000;

    const anexoFinal = blobAnexo !== undefined ? (blobAnexo || undefined) : (arquivoAnexo || undefined);
    const nomeFinal = nomeAnexo !== undefined ? (nomeAnexo || undefined) : (nomeArquivoAnexo || undefined);
    const tipoFinal = tipoAnexo !== undefined ? (tipoAnexo || undefined) : (tipoArquivoAnexo || undefined);
    const tamanhoFinal = tamanhoAnexo !== undefined ? (tamanhoAnexo || undefined) : (tamanhoArquivoAnexo || undefined);

    const registro: Contrato = {
      id: idContrato,
      alunoId: aluno.id,
      modeloId: `modelo_${modalidade}_mensal`,
      modalidade,
      vigenciaMeses,
      inicioVigencia: contratoExistente?.inicioVigencia || agora.split('T')[0],
      valor: centavos,
      diaVencimento,
      avisoCancelamentoDias,
      horasRemarcacao,
      clausulas: clausulasSelecionadas(),
      status: novoStatus,
      formaAssinatura: forma || caminhoAssinatura,
      assinadoEm: novoStatus === 'assinado' ? (dataAssinada || dataAssinatura || agora) : undefined,
      arquivoAssinado: anexoFinal,
      arquivoNome: nomeFinal,
      arquivoTipo: tipoFinal,
      arquivoTamanho: tamanhoFinal,
      criadoEm: contratoExistente?.criadoEm || agora,
      atualizadoEm: agora,
    };

    await db.contratos.put(registro);
    await db.alunos.update(aluno.id, {
      contratoId: idContrato,
      atualizadoEm: agora,
    });

    setContratoExistente(registro);
    setStatusContrato(novoStatus);
    return registro;
  };

  const handleGerarPDF = async () => {
    if (!aluno) {
      exibirFeedback('Selecione um aluno antes de gerar o contrato.');
      return;
    }

    const nomePersonal = config?.nomePersonal || 'Personal Trainer';
    const crefPersonal = config?.cref || 'Não informado';
    const cpfCnpjPersonal = config?.cpfCnpj || 'Não informado';
    const nomeAluno = aluno.nome;
    const cpfAluno = aluno.cpf || 'Não informado';
    const telefoneAluno = aluno.telefone || 'Não informado';

    await salvarContratoNoBanco('gerado');

    const htmlContrato = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato de Prestação de Serviços - ${nomeAluno}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #111;
            line-height: 1.6;
            font-size: 13pt;
            margin: 0;
            padding: 24px;
          }
          h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; text-transform: uppercase; }
          h2 { font-size: 13pt; margin-top: 18px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
          p { margin: 8px 0; text-align: justify; text-justify: inter-word; }
          .identificacao { background-color: #f9f9f9; border: 1px solid #ddd; padding: 12px; margin-bottom: 15px; border-radius: 4px; }
          .assinaturas { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .assinatura-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 8px; font-size: 11pt; }
          .aviso { font-size: 9pt; color: #666; margin-top: 40px; text-align: center; border-top: 1px dashed #ccc; padding-top: 8px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Contrato de Prestação de Serviços de Personal Trainer</h1>

        <div class="identificacao">
          <p><strong>CONTRATADO(A):</strong> ${nomePersonal}, profissional de Educação Física devidamente registrado(a) no CREF sob o nº <strong>${crefPersonal}</strong>, inscrito(a) no CPF/CNPJ nº <strong>${cpfCnpjPersonal}</strong>.</p>
          <p><strong>CONTRATANTE:</strong> ${nomeAluno}, inscrito(a) no CPF nº <strong>${cpfAluno}</strong>, telefone de contato nº <strong>${telefoneAluno}</strong>.</p>
        </div>

        <h2>Cláusula 1ª — Do Objeto</h2>
        <p>O presente instrumento tem por objeto a prestação de serviços especializados de treinamento físico individualizado na modalidade <strong>${modalidade.toUpperCase()}</strong>, visando à melhoria do condicionamento físico, saúde e bem-estar do(a) CONTRATANTE.</p>

        <h2>Cláusula 2ª — Da Modalidade e Rotina</h2>
        <p>${
          modalidade === 'presencial'
            ? `Os atendimentos presenciais serão realizados em dias e horários previamente ajustados entre as partes, no local indicado pelo CONTRATADO.`
            : modalidade === 'online'
            ? `A consultoria online inclui prescrição de treinos individualizados por aplicativo/planilha e check-in com periodicidade estipulada, respeitando os fusos horários de atendimento.`
            : `A prestação será no formato híbrido, englobando sessões presenciais e acompanhamento remoto continuado.`
        }</p>

        <h2>Cláusula 3ª — Do Valor e Pagamento</h2>
        <p>Pelos serviços contratados, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) o valor de <strong>R$ ${valorReais}</strong>, com vencimento todo <strong>dia ${diaVencimento}</strong> de cada mês, durante o período de vigência de <strong>${vigenciaMeses} meses</strong>.</p>

        ${
          clausulaRemarcacao
            ? `<h2>Cláusula 4ª — Da Política de Remarcações e Faltas</h2>
               <p>Em caso de necessidade de remarcação de sessões agendadas, o(a) CONTRATANTE deverá comunicar o(a) CONTRATADO(A) com antecedência mínima de <strong>${horasRemarcacao} horas</strong>. Avisos realizados com prazo inferior serão considerados aula dada, sem direito a reposição, salvo caso fortuito ou força maior documentalmente comprovada.</p>`
            : ''
        }

        ${
          clausulaMedica
            ? `<h2>Cláusula 5ª — Da Condição de Saúde e Assunção de Risco</h2>
               <p>O(A) CONTRATANTE declara expressamente estar em plenas condições físicas e mentais para a prática de exercícios físicos, tendo preenchido o questionário de prontidão (PAR-Q) e/ou obtido liberação médica prévia, assumindo total responsabilidade pela veracidade das informações de saúde prestadas.</p>`
            : ''
        }

        <h2>Cláusula 6ª — Do Cancelamento e Rescisão</h2>
        <p>Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio por escrito com antecedência mínima de <strong>${avisoCancelamentoDias} dias</strong>.</p>

        ${
          clausulaLgpd
            ? `<h2>Cláusula 7ª — Da Proteção de Dados (LGPD)</h2>
               <p>Os dados pessoais e de saúde fornecidos pelo(a) CONTRATANTE serão tratados com estrito sigilo e utilizados exclusivamente para os fins de elaboração dos treinos e controle administrativo, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>`
            : ''
        }

        ${
          clausulaImagem
            ? `<h2>Cláusula 8ª — Do Uso de Imagem</h2>
               <p>O(A) CONTRATANTE autoriza o uso de sua imagem e registros fotográficos ou em vídeo de treinos para divulgação profissional do(a) CONTRATADO(A) em redes sociais e portfólio, vedada qualquer exposição vexatória.</p>`
            : ''
        }

        <p style="margin-top: 25px;">Por estarem justos e acordados, firmam o presente instrumento.</p>

        <p style="text-align: right; margin-top: 20px;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>

        <div class="assinaturas">
          <div class="assinatura-box">
            ${nomePersonal}<br>
            CREF: ${crefPersonal}<br>
            <strong>CONTRATADO(A)</strong>
          </div>
          <div class="assinatura-box">
            ${nomeAluno}<br>
            CPF: ${cpfAluno}<br>
            <strong>CONTRATANTE</strong>
          </div>
        </div>

        <div class="aviso">
          Documento gerado pelo aplicativo Personal em Dia. Instrumento de apoio administrativo. Recomenda-se validação por profissional jurídico.
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContrato);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
      exibirFeedback('PDF gerado e contrato salvo como GERADO!');
    } else {
      exibirFeedback('Pop-up bloqueado. Permita pop-ups no navegador para visualizar/imprimir o contrato.');
    }
  };

  const processarArquivoUpload = async (file: File) => {
    setNomeArquivoAnexo(file.name);
    setArquivoAnexo(file);
    setTipoArquivoAnexo(file.type);
    setTamanhoArquivoAnexo(file.size);

    await salvarContratoNoBanco(
      'assinado',
      file,
      file.name,
      file.type,
      file.size,
      caminhoAssinatura,
      dataAssinatura
    );
    exibirFeedback(`Contrato assinado anexado com sucesso: "${file.name}"!`);
  };

  const handleUploadArquivoAssinado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processarArquivoUpload(file);
    // Limpa valor do input para permitir selecionar o mesmo arquivo se quiser
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastandoSobre(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processarArquivoUpload(files[0]);
    }
  };

  const handleVisualizarAnexo = () => {
    if (!arquivoAnexo) return;
    const url = URL.createObjectURL(arquivoAnexo);
    window.open(url, '_blank');
  };

  const handleBaixarAnexo = () => {
    if (!arquivoAnexo) return;
    const url = URL.createObjectURL(arquivoAnexo);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivoAnexo || 'contrato_assinado.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRemoverAnexo = async () => {
    const confirmou = window.confirm('Deseja realmente remover o arquivo anexado deste contrato?');
    if (!confirmou) return;

    setArquivoAnexo(null);
    setNomeArquivoAnexo(null);
    setTipoArquivoAnexo(null);
    setTamanhoArquivoAnexo(null);

    if (contratoExistente) {
      const atualizado: Contrato = {
        ...contratoExistente,
        arquivoAssinado: undefined,
        arquivoNome: undefined,
        arquivoTipo: undefined,
        arquivoTamanho: undefined,
        status: 'gerado',
        atualizadoEm: new Date().toISOString(),
      };
      await db.contratos.put(atualizado);
      setContratoExistente(atualizado);
      setStatusContrato('gerado');
      exibirFeedback('Anexo do contrato removido com sucesso.');
    }
  };

  const handleSalvarDetalhesAssinatura = async () => {
    await salvarContratoNoBanco(
      statusContrato,
      arquivoAnexo,
      nomeArquivoAnexo,
      tipoArquivoAnexo,
      tamanhoArquivoAnexo,
      caminhoAssinatura,
      dataAssinatura
    );
    exibirFeedback('Detalhes da assinatura salvos com sucesso!');
  };

  const handleAvisarWhatsApp = () => {
    if (!aluno || !aluno.telefone) {
      exibirFeedback('Aluno não possui telefone cadastrado.');
      return;
    }
    const primeiroNome = aluno.nome.split(' ')[0];
    const msg = `Olá, ${primeiroNome}! 👋\n\nConfirmando que o seu Contrato de Prestação de Serviços de Personal Trainer foi devidamente registrado e arquivado na sua ficha.\n\nQualquer dúvida estou à disposição. Bons treinos! 💪🏋️`;
    const foneLimpo = aluno.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${foneLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatarTamanho = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const previewImagemUrl = useMemo(() => {
    if (!arquivoAnexo) return null;
    const isImagem =
      tipoArquivoAnexo?.startsWith('image/') ||
      nomeArquivoAnexo?.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i);
    if (isImagem) {
      return URL.createObjectURL(arquivoAnexo);
    }
    return null;
  }, [arquivoAnexo, tipoArquivoAnexo, nomeArquivoAnexo]);

  if (carregando) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando contrato...
      </div>
    );
  }

  const opcoesAba: SegmentOption<'gerar' | 'anexar'>[] = [
    { value: 'gerar', label: '1. Configurar & Gerar' },
    {
      value: 'anexar',
      label: arquivoAnexo ? '2. Anexo Assinado ✓' : '2. Anexar Contrato',
    },
  ];

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo="Contrato"
        subtitulo={aluno ? `${aluno.nome} • ${modalidade}` : 'Gerador de Contrato'}
        mostrarVoltar
        onVoltar={voltar}
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {feedbackMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--positive-bg)',
              color: 'var(--positive)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconCheck size={16} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Seleção do Aluno */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Aluno Contratante
          </label>
          {todosAlunos.length > 0 ? (
            <select
              value={aluno?.id || ''}
              onChange={(e) => {
                const sel = todosAlunos.find((a) => a.id === e.target.value);
                if (sel) {
                  carregarDadosDoAluno(sel);
                  navegarPara(`contrato/${sel.id}`);
                }
              }}
              style={{
                minHeight: '44px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              {todosAlunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.modalidade})
                </option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--negative)' }}>
              Nenhum aluno cadastrado. Cadastre um aluno primeiro.
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Status Atual:</span>
            <Badge tipo={statusContrato} size="md" />
          </div>
        </Card>

        {/* Segmented Control: Abas de Contrato */}
        <SegmentedControl
          options={opcoesAba}
          value={abaAtiva}
          onChange={(val) => setAbaAtiva(val)}
        />

        {/* ABA 1: CONFIGURAR & GERAR PDF */}
        {abaAtiva === 'gerar' && (
          <>
            {/* Aviso Legal */}
            <div
              style={{
                backgroundColor: 'var(--primary-tint)',
                borderLeft: '4px solid var(--primary)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }}>
                <IconAlert size={18} />
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                <strong>Aviso Legal:</strong> Este modelo serve como referência de gestão autônoma. O app não garante validade jurídica perante órgãos judiciais. Recomenda-se revisão por seu advogado.
              </p>
            </div>

            {/* Parâmetros do Contrato */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '16px' }}>1. Parâmetros do Contrato</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Modalidade</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {(['presencial', 'online', 'hibrido'] as Modalidade[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setModalidade(m)}
                      style={{
                        minHeight: '40px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: modalidade === m ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: modalidade === m ? 'var(--primary-tint)' : '#FFFFFF',
                        color: modalidade === m ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: modalidade === m ? 700 : 500,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vigência (meses)</label>
                  <input
                    type="number"
                    value={vigenciaMeses}
                    onChange={(e) => setVigenciaMeses(parseInt(e.target.value, 10) || 6)}
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
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor Mensal (R$)</label>
                  <input
                    type="text"
                    value={valorReais}
                    onChange={(e) => setValorReais(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dia Vencimento</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(parseInt(e.target.value, 10) || 10)}
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
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Aviso Cancelamento (dias)</label>
                  <input
                    type="number"
                    value={avisoCancelamentoDias}
                    onChange={(e) => setAvisoCancelamentoDias(parseInt(e.target.value, 10) || 30)}
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
            </Card>

            {/* Cláusulas Opcionais */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{ fontSize: '16px' }}>2. Cláusulas Opcionais</h2>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clausulaMedica}
                  onChange={(e) => setClausulaMedica(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <span>Atestado médico e responsabilidade de saúde (PAR-Q)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clausulaRemarcacao}
                  onChange={(e) => setClausulaRemarcacao(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <span>Remarcação de aulas com antecedência mínima de {horasRemarcacao}h</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clausulaLgpd}
                  onChange={(e) => setClausulaLgpd(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <span>Sigilo de dados e conformidade com a LGPD</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clausulaImagem}
                  onChange={(e) => setClausulaImagem(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <span>Autorização de imagem e vídeo em redes sociais</span>
              </label>
            </Card>

            {/* Botão de Geração do PDF */}
            <Button
              variant="primary"
              fullWidth
              icon={<IconFileText size={20} />}
              onClick={handleGerarPDF}
            >
              Gerar e Visualizar PDF do Contrato
            </Button>

            {/* Atalho para ir direto para a aba de anexo */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setAbaAtiva('anexar')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Já possui o contrato assinado? Ir para aba de anexo →
              </button>
            </div>
          </>
        )}

        {/* ABA 2: ANEXAR CONTRATO ASSINADO */}
        {abaAtiva === 'anexar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Status do Arquivo Anexado */}
            <Card style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: arquivoAnexo ? 'var(--positive)' : 'var(--text-secondary)' }}>
                    <IconPaperclip size={20} />
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {arquivoAnexo ? 'Contrato Assinado Arquivado' : 'Nenhum Arquivo Anexado'}
                  </span>
                </div>
                <Badge tipo={arquivoAnexo ? 'assinado' : statusContrato} size="md" />
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {arquivoAnexo
                  ? 'O documento assinado está salvo no banco local seguro deste dispositivo e associado ao aluno.'
                  : 'Anexe a via assinada (PDF com assinatura gov.br ou fotos das folhas rubricadas e assinadas pelo aluno).'}
              </p>
            </Card>

            {/* Input escondido para upload de arquivo */}
            <input
              type="file"
              accept="application/pdf,image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleUploadArquivoAssinado}
            />

            {/* Se houver arquivo anexado, exibe os detalhes e pré-visualização */}
            {arquivoAnexo ? (
              <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #BBF7D0', backgroundColor: '#F0FDF4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        backgroundColor: '#DCFCE7',
                        color: 'var(--positive)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconFileText size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#166534', wordBreak: 'break-all' }}>
                        {nomeArquivoAnexo || 'contrato_assinado.pdf'}
                      </h4>
                      <p style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                        {tipoArquivoAnexo?.includes('pdf') ? 'Documento PDF' : 'Imagem / Foto'}
                        {tamanhoArquivoAnexo ? ` • ${formatarTamanho(tamanhoArquivoAnexo)}` : ''}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#22C55E',
                      color: '#FFFFFF',
                    }}
                  >
                    ATIVO
                  </span>
                </div>

                {/* Pré-visualização caso seja imagem */}
                {previewImagemUrl && (
                  <div style={{ textAlign: 'center', backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                    <img
                      src={previewImagemUrl}
                      alt="Pré-visualização do contrato"
                      style={{
                        maxHeight: '220px',
                        maxWidth: '100%',
                        borderRadius: '6px',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                )}

                {/* Barra de Ações do Anexo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    style={{ minHeight: '38px', fontSize: '12px', borderColor: '#86EFAC', color: '#15803D' }}
                    icon={<IconEye size={16} />}
                    onClick={handleVisualizarAnexo}
                  >
                    Visualizar
                  </Button>

                  <Button
                    variant="secondary"
                    style={{ minHeight: '38px', fontSize: '12px', borderColor: '#86EFAC', color: '#15803D' }}
                    icon={<IconDownload size={16} />}
                    onClick={handleBaixarAnexo}
                  >
                    Baixar
                  </Button>

                  <Button
                    variant="secondary"
                    style={{ minHeight: '38px', fontSize: '12px' }}
                    icon={<IconUpload size={16} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Substituir
                  </Button>

                  <Button
                    variant="secondary"
                    style={{ minHeight: '38px', fontSize: '12px', borderColor: '#FECACA', color: 'var(--negative)' }}
                    icon={<IconTrash size={16} />}
                    onClick={handleRemoverAnexo}
                  >
                    Excluir Anexo
                  </Button>
                </div>
              </Card>
            ) : (
              /* Dropzone para Envio de Arquivo */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastandoSobre(true);
                }}
                onDragLeave={() => setArrastandoSobre(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '32px 16px',
                  borderRadius: '12px',
                  border: `2px dashed ${arrastandoSobre ? 'var(--primary)' : 'var(--border-color)'}`,
                  backgroundColor: arrastandoSobre ? 'var(--primary-tint)' : '#FAFAFA',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-tint)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconUpload size={26} />
                </div>

                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Suporta PDF ou fotos (JPG, PNG) do contrato assinado
                  </p>
                </div>

                <Button
                  variant="primary"
                  type="button"
                  style={{ minHeight: '36px', fontSize: '12px', marginTop: '6px' }}
                  icon={<IconPaperclip size={15} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Selecionar Foto ou PDF
                </Button>
              </div>
            )}

            {/* Formalização e Detalhes da Assinatura */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '15px' }}>Detalhes da Formalização</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Status do Contrato
                  </label>
                  <select
                    value={statusContrato}
                    onChange={(e) => setStatusContrato(e.target.value as 'rascunho' | 'gerado' | 'enviado' | 'assinado')}
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="assinado">Assinado (Vigente)</option>
                    <option value="enviado">Enviado ao Aluno</option>
                    <option value="gerado">Gerado (Aguardando)</option>
                    <option value="rascunho">Rascunho</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Data da Assinatura
                  </label>
                  <input
                    type="date"
                    value={dataAssinatura}
                    onChange={(e) => setDataAssinatura(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Forma de Assinatura Utilizada
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCaminhoAssinatura('govbr')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: caminhoAssinatura === 'govbr' ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: caminhoAssinatura === 'govbr' ? 'var(--primary-tint)' : '#FFFFFF',
                      color: caminhoAssinatura === 'govbr' ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: caminhoAssinatura === 'govbr' ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🏛 Assinatura gov.br
                  </button>

                  <button
                    type="button"
                    onClick={() => setCaminhoAssinatura('manual')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: caminhoAssinatura === 'manual' ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: caminhoAssinatura === 'manual' ? 'var(--primary-tint)' : '#FFFFFF',
                      color: caminhoAssinatura === 'manual' ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: caminhoAssinatura === 'manual' ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ✍ Assinatura Manual (Caneta)
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleSalvarDetalhesAssinatura}
                style={{ minHeight: '40px', fontSize: '13px' }}
                icon={<IconCheck size={16} />}
              >
                Salvar Alterações do Contrato
              </Button>
            </Card>

            {/* Bloco de Ajuda do gov.br */}
            {caminhoAssinatura === 'govbr' && (
              <Card style={{ padding: '12px', backgroundColor: '#F0F4FA', border: '1px solid #D0DBEA', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A' }}>
                  Como assinar digitalmente no gov.br:
                </span>
                <ol style={{ fontSize: '12px', color: '#1E293B', paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Gere o PDF na aba anterior ("1. Configurar & Gerar").</li>
                  <li>Acesse o Assinador Eletrônico Oficial do gov.br.</li>
                  <li>Faça login e anexe o PDF gerado para assinar com selo prata ou ouro.</li>
                  <li>Baixe o PDF com o selo e anexe-o aqui nesta tela!</li>
                </ol>
                <div style={{ marginTop: '4px' }}>
                  <Button
                    variant="secondary"
                    style={{ minHeight: '34px', fontSize: '12px' }}
                    icon={<IconShare size={15} />}
                    onClick={() => window.open('https://assinador.iti.br', '_blank')}
                  >
                    Abrir Assinador Oficial gov.br (assinador.iti.br)
                  </Button>
                </div>
              </Card>
            )}

            {/* Ação WhatsApp para confirmar com o Aluno */}
            {aluno?.telefone && (
              <Button
                variant="whatsapp"
                onClick={handleAvisarWhatsApp}
                style={{ minHeight: '40px', fontSize: '13px' }}
                icon={<IconWhatsApp size={18} />}
              >
                Confirmar Recebimento do Contrato no WhatsApp
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
