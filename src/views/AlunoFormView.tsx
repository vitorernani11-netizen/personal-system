import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { db } from '../db';
import { navegarPara, voltar } from '../router';
import type { Aluno, Modalidade, Canal } from '../types/database';

interface AlunoFormViewProps {
  id?: string;
  modo: 'novo' | 'editar';
}

const DIAS_SEMANA_OPCOES = [
  { dia: 1, label: 'Seg' },
  { dia: 2, label: 'Ter' },
  { dia: 3, label: 'Qua' },
  { dia: 4, label: 'Qui' },
  { dia: 5, label: 'Sex' },
  { dia: 6, label: 'Sáb' },
  { dia: 0, label: 'Dom' },
];

export const AlunoFormView: React.FC<AlunoFormViewProps> = ({ id, modo }) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [inicio, setInicio] = useState(new Date().toISOString().split('T')[0]);
  const [modalidade, setModalidade] = useState<Modalidade>('presencial');
  const [canalPreferido, setCanalPreferido] = useState<Canal>('whatsapp');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

  // Campos Presencial
  const [local, setLocal] = useState('');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 3, 5]);
  const [horario, setHorario] = useState('07:00');

  // Campos Online
  const [fusoCidade, setFusoCidade] = useState('');
  const [frequenciaCheckin, setFrequenciaCheckin] = useState<'semanal' | 'quinzenal'>('semanal');

  // Anamnese
  const [objetivo, setObjetivo] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarAluno() {
      if (modo === 'editar' && id) {
        const item = await db.alunos.get(id);
        if (item) {
          setNome(item.nome);
          setTelefone(item.telefone);
          setEmail(item.email || '');
          setCpf(item.cpf || '');
          setInicio(item.inicio);
          setModalidade(item.modalidade);
          setCanalPreferido(item.canalPreferido);
          setStatus(item.status);
          setLocal(item.local || '');
          setDiasSemana(item.diasSemana || [1, 3, 5]);
          setHorario(item.horario || '');
          setFusoCidade(item.fusoCidade || '');
          setFrequenciaCheckin(item.frequenciaCheckin || 'semanal');
          setObjetivo(item.objetivo || '');
          setRestricoes(item.restricoes || '');
          setObservacoes(item.observacoes || '');
        }
      }
    }
    carregarAluno();
  }, [id, modo]);

  const toggleDia = (dia: number) => {
    if (diasSemana.includes(dia)) {
      setDiasSemana(diasSemana.filter((d) => d !== dia));
    } else {
      setDiasSemana([...diasSemana, dia]);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do aluno.');
      return;
    }
    if (!telefone.trim()) {
      setErro('Informe o telefone com DDD.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const agora = new Date().toISOString();
      const alunoId = modo === 'editar' && id ? id : crypto.randomUUID();

      // Normaliza telefone para apenas números
      let telDigitos = telefone.replace(/\D/g, '');
      if (telDigitos.length === 10 || telDigitos.length === 11) {
        telDigitos = `55${telDigitos}`;
      }

      const alunoExistente = (modo === 'editar' && id) ? await db.alunos.get(id) : null;

      const novoAluno: Aluno = {
        id: alunoId,
        nome: nome.trim(),
        telefone: telDigitos,
        email: email.trim() || undefined,
        cpf: cpf.trim() || undefined,
        inicio,
        modalidade,
        canalPreferido,
        status,
        local: modalidade !== 'online' ? local.trim() || undefined : undefined,
        diasSemana: modalidade !== 'online' ? diasSemana : undefined,
        horario: modalidade !== 'online' ? horario || undefined : undefined,
        fusoCidade: modalidade !== 'presencial' ? fusoCidade.trim() || undefined : undefined,
        frequenciaCheckin: modalidade !== 'presencial' ? frequenciaCheckin : undefined,
        objetivo: objetivo.trim() || undefined,
        restricoes: restricoes.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        contratoId: alunoExistente?.contratoId,
        planoId: alunoExistente?.planoId,
        ultimaPresenca: alunoExistente?.ultimaPresenca,
        ultimoCheckin: alunoExistente?.ultimoCheckin,
        criadoEm: alunoExistente?.criadoEm || agora,
        atualizadoEm: agora,
      };

      await db.alunos.put(novoAluno);
      navegarPara(`aluno/${alunoId}`);
    } catch (err) {
      console.error(err);
      setErro(`Erro ao salvar aluno: ${(err as Error).message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!id) return;
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true);
      return;
    }

    try {
      await db.alunos.delete(id);
      navegarPara('alunos');
    } catch (err) {
      console.error(err);
      setErro(`Erro ao excluir: ${(err as Error).message}`);
    }
  };

  const isPresencial = modalidade === 'presencial' || modalidade === 'hibrido';
  const isOnline = modalidade === 'online' || modalidade === 'hibrido';

  return (
    <div style={{ paddingBottom: '90px' }}>
      <Header
        titulo={modo === 'novo' ? 'Novo Aluno' : 'Editar Aluno'}
        subtitulo={modo === 'novo' ? 'Preencha os dados de cadastro' : nome || 'Alterar dados cadastrais'}
        mostrarVoltar
        onVoltar={voltar}
      />

      <form onSubmit={handleSalvar} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {erro && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--negative-bg)',
              color: 'var(--negative)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {erro}
          </div>
        )}

        {/* Bloco 1: Informações Principais */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px' }}>Dados Pessoais</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Mariana Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{
                minHeight: '44px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                WhatsApp / Celular *
              </label>
              <input
                type="tel"
                required
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '15px',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Data de Início
              </label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                E-mail (Opcional)
              </label>
              <input
                type="email"
                placeholder="aluno@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                CPF (Para Contrato)
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                style={{
                  minHeight: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Canal Preferido de Contato
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {(['whatsapp', 'sms', 'email'] as Canal[]).map((canal) => (
                <button
                  type="button"
                  key={canal}
                  onClick={() => setCanalPreferido(canal)}
                  style={{
                    minHeight: '40px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: canalPreferido === canal ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: canalPreferido === canal ? 'var(--primary-tint)' : '#FFFFFF',
                    color: canalPreferido === canal ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: canalPreferido === canal ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {canal === 'whatsapp' ? 'WhatsApp' : canal.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Bloco 2: Modalidade (A Chave que muda tudo) */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px' }}>Modalidade de Atendimento</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Define a rotina de treinos, regras de contrato e régua de cobrança.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {(['presencial', 'online', 'hibrido'] as Modalidade[]).map((mod) => (
              <button
                type="button"
                key={mod}
                onClick={() => setModalidade(mod)}
                style={{
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: modalidade === mod ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: modalidade === mod ? 'var(--primary-tint)' : '#FFFFFF',
                  color: modalidade === mod ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: modalidade === mod ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mod}
              </button>
            ))}
          </div>

          {/* Campos Específicos Presencial */}
          {isPresencial && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Rotina Presencial</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Local do Treino</label>
                <input
                  type="text"
                  placeholder="Ex: SmartFit Paulista, Condomínio, Parque"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  style={{
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Dias da Semana
                </label>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
                  {DIAS_SEMANA_OPCOES.map(({ dia, label }) => {
                    const ativo = diasSemana.includes(dia);
                    return (
                      <button
                        type="button"
                        key={dia}
                        onClick={() => toggleDia(dia)}
                        style={{
                          flex: 1,
                          minHeight: '38px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: ativo ? 'var(--primary)' : 'var(--border-color)',
                          backgroundColor: ativo ? 'var(--primary)' : '#FFFFFF',
                          color: ativo ? '#FFFFFF' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Horário Fixo da Aula</label>
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  style={{
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          {/* Campos Específicos Online */}
          {isOnline && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--online)' }}>Rotina de Consultoria Online</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cidade / Fuso Horário</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo/SP, Manaus/AM, Lisboa/PT"
                  value={fusoCidade}
                  onChange={(e) => setFusoCidade(e.target.value)}
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
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Frequência de Check-in</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['semanal', 'quinzenal'] as const).map((freq) => (
                    <button
                      type="button"
                      key={freq}
                      onClick={() => setFrequenciaCheckin(freq)}
                      style={{
                        minHeight: '40px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: frequenciaCheckin === freq ? 'var(--online)' : 'var(--border-color)',
                        backgroundColor: frequenciaCheckin === freq ? 'var(--online-bg)' : '#FFFFFF',
                        color: frequenciaCheckin === freq ? 'var(--online)' : 'var(--text-secondary)',
                        fontWeight: frequenciaCheckin === freq ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Bloco 3: Anamnese e Objetivos */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px' }}>Objetivo & Restrições</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Objetivo Principal</label>
            <input
              type="text"
              placeholder="Ex: Hipertrofia, emagrecimento, corrida"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
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
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Restrições Médicas / Lesões</label>
            <input
              type="text"
              placeholder="Ex: Hérnia de disco L4-L5, condromalácia"
              value={restricoes}
              onChange={(e) => setRestricoes(e.target.value)}
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
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Observações Gerais</label>
            <textarea
              rows={3}
              placeholder="Anotações livres sobre o aluno..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                resize: 'none',
              }}
            />
          </div>
        </Card>

        {/* Bloco 4: Status do Aluno (Ativo / Inativo) */}
        {modo === 'editar' && (
          <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px' }}>Status da Matrícula</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {status === 'ativo' ? 'Aluno ativo recebendo cobranças' : 'Aluno inativo pausado'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatus(status === 'ativo' ? 'inativo' : 'ativo')}
              style={{
                minHeight: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: status === 'ativo' ? 'var(--positive)' : 'var(--negative)',
                backgroundColor: status === 'ativo' ? 'var(--positive-bg)' : 'var(--negative-bg)',
                color: status === 'ativo' ? 'var(--positive)' : 'var(--negative)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {status === 'ativo' ? 'Ativo' : 'Inativo'}
            </button>
          </Card>
        )}

        {/* Botões de Ação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          <Button variant="primary" fullWidth type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : modo === 'novo' ? 'Cadastrar Aluno' : 'Salvar Alterações'}
          </Button>

          {modo === 'editar' && (
            confirmandoExclusao ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleExcluir}
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
                  Confirmar Exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusao(false)}
                  className="btn-secondary"
                  style={{ width: '90px' }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExcluir}
                style={{
                  minHeight: '44px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--negative)',
                  color: 'var(--negative)',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Excluir Aluno
              </button>
            )
          )}
        </div>
      </form>
    </div>
  );
};
