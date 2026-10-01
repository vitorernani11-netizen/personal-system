import Dexie, { type Table } from 'dexie';
import type {
  Aluno,
  Plano,
  Contrato,
  Cobranca,
  ToqueRegua,
  MensagemEnviada,
  Config,
  RegistroPresenca
} from '../types/database';

export class PersonalDatabase extends Dexie {
  alunos!: Table<Aluno, string>;
  planos!: Table<Plano, string>;
  contratos!: Table<Contrato, string>;
  cobrancas!: Table<Cobranca, string>;
  toquesRegua!: Table<ToqueRegua, string>;
  mensagensEnviadas!: Table<MensagemEnviada, string>;
  config!: Table<Config, string>;
  presencas!: Table<RegistroPresenca, string>;

  constructor(dbName = 'PersonalEmDiaDB') {
    super(dbName);

    this.version(1).stores({
      alunos: 'id, status, modalidade, planoId, contratoId, telefone, nome',
      planos: 'id, modalidade, ativo',
      contratos: 'id, alunoId, status, modalidade',
      cobrancas: 'id, alunoId, status, vencimento, competencia, [alunoId+competencia]',
      toquesRegua: 'id, ordem, ativo',
      mensagensEnviadas: 'id, alunoId, cobrancaId, enviadaEm',
      config: 'id'
    });

    this.version(2).stores({
      presencas: 'id, alunoId, data, status, [alunoId+data]'
    });
  }
}

export const db = new PersonalDatabase();

export const TOQUES_PADRAO: Omit<ToqueRegua, 'criadoEm' | 'atualizadoEm'>[] = [
  {
    id: 'toque-d-menos-3',
    ordem: 1,
    offsetDias: -3,
    canal: 'email',
    modeloMensagemId: 'lembrete_gentil',
    ativo: true,
  },
  {
    id: 'toque-d-0',
    ordem: 2,
    offsetDias: 0,
    canal: 'whatsapp',
    modeloMensagemId: 'vence_hoje_pix',
    ativo: true,
  },
  {
    id: 'toque-d-mais-2',
    ordem: 3,
    offsetDias: 2,
    canal: 'whatsapp',
    modeloMensagemId: 'pos_vencimento_leve',
    ativo: true,
  },
  {
    id: 'toque-d-mais-5',
    ordem: 4,
    offsetDias: 5,
    canal: 'sms',
    modeloMensagemId: 'cobranca_firme',
    ativo: true,
  },
  {
    id: 'toque-d-mais-10',
    ordem: 5,
    offsetDias: 10,
    canal: 'interno',
    modeloMensagemId: 'alerta_personal',
    ativo: true,
  },
];

export async function carregarDadosDemonstracao(database: PersonalDatabase = db): Promise<void> {
  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];
  const mesAtual = hojeStr.substring(0, 7);

  // Data 16 dias atrás para demonstrar radar de abandono
  const data16DiasAtras = new Date(agora.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  // Data 5 dias atrás para cobrança atrasada
  const data5DiasAtras = new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const aluno1Id = 'aluno-demo-mariana';
  const aluno2Id = 'aluno-demo-lucas';
  const aluno3Id = 'aluno-demo-camila';

  const contrato1Id = 'contrato-demo-mariana';

  const alunosDemo: Aluno[] = [
    {
      id: aluno1Id,
      nome: 'Mariana Silva',
      telefone: '5511987654321',
      email: 'mariana.silva@email.com',
      cpf: '123.456.789-00',
      inicio: hojeStr,
      modalidade: 'presencial',
      local: 'SmartFit Paulista',
      diasSemana: [1, 3, 5],
      horario: '07:00',
      ultimaPresenca: hojeStr,
      status: 'ativo',
      canalPreferido: 'whatsapp',
      objetivo: 'Hipertrofia e melhora postural',
      restricoes: 'Condromalácia patelar leve no joelho direito',
      contratoId: contrato1Id,
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: aluno2Id,
      nome: 'Lucas Oliveira',
      telefone: '5511976543210',
      email: 'lucas.oliveira@email.com',
      cpf: '234.567.890-11',
      inicio: '2026-08-01',
      modalidade: 'presencial',
      local: 'Condomínio Reserva',
      diasSemana: [2, 4],
      horario: '19:00',
      ultimaPresenca: data16DiasAtras,
      status: 'ativo',
      canalPreferido: 'whatsapp',
      objetivo: 'Emagrecimento e condicionamento cardiorrespiratório',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: aluno3Id,
      nome: 'Camila Rocha',
      telefone: '5521998877665',
      email: 'camila.rocha@email.com',
      cpf: '345.678.901-22',
      inicio: '2026-09-15',
      modalidade: 'online',
      fusoCidade: 'Rio de Janeiro (GMT-3)',
      frequenciaCheckin: 'semanal',
      ultimoCheckin: hojeStr,
      status: 'ativo',
      canalPreferido: 'whatsapp',
      objetivo: 'Treino para maratona e fortalecimento de core',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
  ];

  const contratoDemo: Contrato = {
    id: contrato1Id,
    alunoId: aluno1Id,
    modeloId: 'modelo_presencial_mensal',
    modalidade: 'presencial',
    vigenciaMeses: 6,
    inicioVigencia: hojeStr,
    valor: 65000,
    diaVencimento: 10,
    avisoCancelamentoDias: 30,
    horasRemarcacao: 6,
    clausulas: ['medica', 'remarcacao', 'lgpd'],
    status: 'assinado',
    formaAssinatura: 'govbr',
    assinadoEm: agora.toISOString(),
    criadoEm: agora.toISOString(),
    atualizadoEm: agora.toISOString(),
  };

  const cobrancasDemo: Cobranca[] = [
    {
      id: 'cobranca-demo-1',
      alunoId: aluno1Id,
      valor: 65000,
      vencimento: hojeStr,
      status: 'aberta',
      competencia: mesAtual,
      etapaRegua: 2,
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: 'cobranca-demo-2',
      alunoId: aluno2Id,
      valor: 75000,
      vencimento: data5DiasAtras,
      status: 'atrasada',
      competencia: mesAtual,
      etapaRegua: 4,
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: 'cobranca-demo-3',
      alunoId: aluno3Id,
      valor: 38000,
      vencimento: '2026-09-05',
      status: 'paga',
      pagoEm: agora.toISOString(),
      metodo: 'pix',
      competencia: mesAtual,
      etapaRegua: 1,
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
  ];

  const presencasDemo: RegistroPresenca[] = [
    {
      id: 'presenca-demo-1',
      alunoId: aluno1Id,
      data: hojeStr,
      horario: '07:00',
      status: 'presente',
      tipo: 'aula_presencial',
      observacao: 'Treino A - Membros inferiores e mobilidade',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: 'presenca-demo-2',
      alunoId: aluno1Id,
      data: new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      horario: '07:00',
      status: 'presente',
      tipo: 'aula_presencial',
      observacao: 'Treino B - Membros superiores',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: 'presenca-demo-3',
      alunoId: aluno1Id,
      data: new Date(agora.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      horario: '07:00',
      status: 'falta',
      tipo: 'aula_presencial',
      observacao: 'Faltou sem avisar previamente',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: 'presenca-demo-4',
      alunoId: aluno2Id,
      data: data16DiasAtras,
      horario: '19:00',
      status: 'presente',
      tipo: 'aula_presencial',
      observacao: 'Última aula presencial antes do afastamento',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
    {
      id: 'presenca-demo-5',
      alunoId: aluno3Id,
      data: hojeStr,
      status: 'presente',
      tipo: 'checkin_online',
      observacao: 'Check-in semanal de treinos concluído com envio de planilha',
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
    },
  ];

  await database.alunos.bulkPut(alunosDemo);
  await database.contratos.put(contratoDemo);
  await database.cobrancas.bulkPut(cobrancasDemo);
  await database.presencas.bulkPut(presencasDemo);
}

export async function inicializarDadosPadrao(database: PersonalDatabase = db): Promise<void> {
  const agora = new Date().toISOString();

  const configExistente = await database.config.get('unico');
  if (!configExistente) {
    const configPadrao: Config = {
      id: 'unico',
      nomePersonal: 'Carlos Personal',
      cref: '012345-G/SP',
      cpfCnpj: '123.456.789-00',
      cidade: 'São Paulo',
      chavePix: 'carlos.personal@pix.com',
      nivelAutomacao: 'manual',
      horaInicioEnvio: 8,
      horaFimEnvio: 20,
      enviarDomingo: false,
      diasParaSumidoPresencial: 14,
      diasParaSumidoOnline: 10,
      modelos: {
        lembrete_gentil: 'Olá, {nome}! Tudo bem? Passando para lembrar que sua mensalidade vence em {data_vencimento}. Segue o PIX para facilitar: {chave_pix}',
        vence_hoje_pix: 'Olá, {nome}! Sua mensalidade vence hoje no valor de {valor}. Você pode pagar diretamente pelo PIX Copia e Cola: {codigo_pix}',
        pos_vencimento_leve: 'Oi {nome}, tudo bem? Não identificamos o pagamento da sua mensalidade com vencimento em {data_vencimento}. Qualquer dúvida, estou por aqui!',
        cobranca_firme: '{nome}, sua mensalidade de {valor} está pendente desde {data_vencimento}. Por favor, regularize até amanhã para manter suas aulas ativas.',
        alerta_personal: 'Atenção: O aluno {nome} está com a mensalidade em atraso há mais de 10 dias. Entre em contato diretamente.',
      },
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await database.config.put(configPadrao);
  }

  const countToques = await database.toquesRegua.count();
  if (countToques === 0) {
    const toquesCompletos: ToqueRegua[] = TOQUES_PADRAO.map((toque) => ({
      ...toque,
      criadoEm: agora,
      atualizadoEm: agora,
    }));
    await database.toquesRegua.bulkPut(toquesCompletos);
  }

  // Se o banco estiver vazio em alunos, popula dados iniciais para testes
  const countAlunos = await database.alunos.count();
  if (countAlunos === 0) {
    await carregarDadosDemonstracao(database);
  }
}

