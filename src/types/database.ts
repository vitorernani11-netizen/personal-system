export type Modalidade = 'presencial' | 'online' | 'hibrido';
export type Canal = 'whatsapp' | 'sms' | 'email';

export type Aluno = {
  id: string;
  nome: string;
  telefone: string;      // dígitos, com DDI 55
  email?: string;
  cpf?: string;
  nascimento?: string;
  inicio: string;             // aaaa-mm-dd
  modalidade: Modalidade;
  // presencial
  local?: string;
  diasSemana?: number[];
  horario?: string;
  ultimaPresenca?: string;
  // online
  fusoCidade?: string;
  frequenciaCheckin?: 'semanal' | 'quinzenal';
  ultimoCheckin?: string;
  planoId?: string;
  status: 'ativo' | 'inativo';
  canalPreferido: Canal;
  objetivo?: string;
  restricoes?: string;
  anamnese?: Record<string, boolean | string>;
  contratoId?: string;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type Plano = {
  id: string;
  nome: string;
  valor: number;         // centavos inteiros
  modalidade: Modalidade;
  periodicidade: 'mensal' | 'avulsa' | 'pacote';
  sessoes?: number;
  diaVencimento?: number;        // 1 a 28
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type Contrato = {
  id: string;
  alunoId: string;
  modeloId: string;                                 // qual template gerou
  modalidade: Modalidade;
  vigenciaMeses: number;
  inicioVigencia: string;
  valor: number;                                    // centavos inteiros
  diaVencimento: number;
  avisoCancelamentoDias: number;                    // padrão 30
  horasRemarcacao: number;                          // padrão 6
  reajusteIndice?: string;
  clausulas: string[];                              // ids das cláusulas marcadas
  status: 'rascunho' | 'gerado' | 'enviado' | 'assinado';
  formaAssinatura?: 'govbr' | 'manual';
  assinadoEm?: string;
  arquivoAssinado?: Blob;                           // foto ou PDF anexado
  arquivoNome?: string;
  arquivoTipo?: string;
  arquivoTamanho?: number;
  criadoEm: string;
  atualizadoEm: string;
};

export type Cobranca = {
  id: string;
  alunoId: string;
  planoId?: string;
  valor: number;                                    // centavos inteiros
  vencimento: string;                               // aaaa-mm-dd
  status: 'aberta' | 'paga' | 'atrasada' | 'cancelada';
  pagoEm?: string;
  metodo?: 'pix' | 'cartao' | 'dinheiro' | 'outro';
  competencia: string;                              // aaaa-mm, evita duplicar
  etapaRegua: number;                               // qual toque já saiu
  criadoEm: string;
  atualizadoEm: string;
};

export type ToqueRegua = {
  id: string;
  ordem: number;
  offsetDias: number;                               // -3, 0, 2, 5, 10
  canal: Canal | 'interno';
  modeloMensagemId: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type MensagemEnviada = {
  id: string;
  alunoId: string;
  cobrancaId?: string;
  toqueId?: string;
  canal: Canal;
  tipo: string;
  enviadaEm: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type Config = {
  id: 'unico';
  nomePersonal: string;
  cpfCnpj?: string;
  cref?: string;
  endereco?: string;
  chavePix?: string;
  tipoChavePix?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  cidade?: string;                                   // exigido pelo BR Code
  linkCartao?: string;
  nivelAutomacao: 'manual' | 'email_script' | 'asaas';
  horaInicioEnvio: number;
  horaFimEnvio: number;     // padrão 8 e 20
  enviarDomingo: boolean;                            // padrão false
  diasParaSumidoPresencial: number;                  // padrão 14
  diasParaSumidoOnline: number;                      // padrão 10
  modelos: Record<string, string>;
  ultimoBackupEm?: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type RegistroPresenca = {
  id: string;
  alunoId: string;
  data: string; // aaaa-mm-dd
  horario?: string; // hh:mm
  status: 'presente' | 'falta' | 'justificada';
  tipo: 'aula_presencial' | 'checkin_online';
  observacao?: string;
  criadoEm: string;
  atualizadoEm: string;
};

export interface SerializedContrato extends Omit<Contrato, 'arquivoAssinado'> {
  arquivoAssinadoBase64?: {
    base64: string;
    type: string;
  };
}

export interface BackupPayload {
  schemaVersion: number;
  geradoEm: string;
  dados: {
    alunos: Aluno[];
    planos: Plano[];
    contratos: SerializedContrato[];
    cobrancas: Cobranca[];
    toquesRegua: ToqueRegua[];
    mensagensEnviadas: MensagemEnviada[];
    config: Config[];
    presencas?: RegistroPresenca[];
  };
}
