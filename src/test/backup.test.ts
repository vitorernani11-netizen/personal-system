import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalDatabase, inicializarDadosPadrao } from '../db';
import {
  exportarTudo,
  importarTudo,
  blobToBase64,
  base64ToBlob,
  BACKUP_SCHEMA_VERSION,
  obterNomeArquivoBackup
} from '../db/backup';
import type {
  Aluno,
  Plano,
  Contrato,
  Cobranca,
  ToqueRegua,
  MensagemEnviada,
  Config
} from '../types/database';

describe('Personal em Dia - Módulo 0: Banco Dexie e Motor de Backup', () => {
  let testDb: PersonalDatabase;

  beforeEach(async () => {
    // Cria um banco novo para cada teste usando nome randômico
    const dbName = `test_db_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    testDb = new PersonalDatabase(dbName);
    await testDb.open();
  });

  it('deve inicializar dados padrão (Config e os 5 Toques da régua)', async () => {
    await inicializarDadosPadrao(testDb);

    const config = await testDb.config.get('unico');
    expect(config).toBeDefined();
    expect(config?.id).toBe('unico');
    expect(config?.nivelAutomacao).toBe('manual');
    expect(config?.horaInicioEnvio).toBe(8);
    expect(config?.horaFimEnvio).toBe(20);
    expect(config?.enviarDomingo).toBe(false);
    expect(config?.diasParaSumidoPresencial).toBe(14);
    expect(config?.diasParaSumidoOnline).toBe(10);

    const toques = await testDb.toquesRegua.orderBy('ordem').toArray();
    expect(toques.length).toBe(5);
    expect(toques[0].offsetDias).toBe(-3);
    expect(toques[0].canal).toBe('email');
    expect(toques[1].offsetDias).toBe(0);
    expect(toques[1].canal).toBe('whatsapp');
    expect(toques[2].offsetDias).toBe(2);
    expect(toques[2].canal).toBe('whatsapp');
    expect(toques[3].offsetDias).toBe(5);
    expect(toques[3].canal).toBe('sms');
    expect(toques[4].offsetDias).toBe(10);
    expect(toques[4].canal).toBe('interno');
  });

  it('deve converter Blob para Base64 e vice-versa mantendo bytes idênticos', async () => {
    const rawContent = 'PDF_ASSINADO_CONTRATO_CONTEUDO_BINARIO_TESTE_12345';
    const originalBlob = new Blob([rawContent], { type: 'application/pdf' });

    const base64 = await blobToBase64(originalBlob);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    const restoredBlob = base64ToBlob(base64, 'application/pdf');
    expect(restoredBlob.type).toBe('application/pdf');
    const textRestored = await restoredBlob.text();
    expect(textRestored).toBe(rawContent);
  });

  it('deve gerar nome padrão do arquivo com data dd-mm-aaaa', () => {
    const dataFixa = new Date(2026, 8, 26); // 26 de Setembro de 2026
    const nome = obterNomeArquivoBackup(dataFixa);
    expect(nome).toBe('personal-em-dia-2026-09-26.json');
  });

  it('deve realizar teste de ida e volta (roundtrip) completo de exportar e importar', async () => {
    const agora = new Date().toISOString();

    const mockConfig: Config = {
      id: 'unico',
      nomePersonal: 'Carlos Personal',
      cpfCnpj: '12345678900',
      cref: '123456-G/SP',
      endereco: 'Rua das Flores, 100',
      chavePix: 'carlos@personal.com',
      tipoChavePix: 'email',
      cidade: 'São Paulo',
      linkCartao: 'https://pag.link/carlos',
      nivelAutomacao: 'manual',
      horaInicioEnvio: 8,
      horaFimEnvio: 20,
      enviarDomingo: false,
      diasParaSumidoPresencial: 14,
      diasParaSumidoOnline: 10,
      modelos: { teste: 'modelo teste' },
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.config.put(mockConfig);

    const alunoPresencial: Aluno = {
      id: 'aluno-1-presencial',
      nome: 'Mariana Silva',
      telefone: '5511999998888',
      email: 'mariana@email.com',
      cpf: '11122233344',
      inicio: '2026-01-10',
      modalidade: 'presencial',
      local: 'Academia Central',
      diasSemana: [1, 3, 5],
      horario: '07:00',
      ultimaPresenca: '2026-09-24',
      status: 'ativo',
      canalPreferido: 'whatsapp',
      objetivo: 'Hipertrofia e condicionamento',
      criadoEm: agora,
      atualizadoEm: agora,
    };

    const alunoOnline: Aluno = {
      id: 'aluno-2-online',
      nome: 'Rodrigo Souza',
      telefone: '5521988887777',
      email: 'rodrigo@email.com',
      inicio: '2026-02-01',
      modalidade: 'online',
      fusoCidade: 'Rio de Janeiro/RJ',
      frequenciaCheckin: 'semanal',
      ultimoCheckin: '2026-09-20',
      status: 'ativo',
      canalPreferido: 'whatsapp',
      objetivo: 'Emagrecimento',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.alunos.bulkPut([alunoPresencial, alunoOnline]);

    const plano: Plano = {
      id: 'plano-presencial-3x',
      nome: 'Presencial 3x/semana',
      valor: 65000, // R$ 650,00 em centavos inteiros
      modalidade: 'presencial',
      periodicidade: 'mensal',
      diaVencimento: 10,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.planos.put(plano);

    const pdfContent = 'PDF_CONTRATO_ASSINADO_MARIANA_SILVA';
    const contrato: Contrato = {
      id: 'contrato-mariana',
      alunoId: alunoPresencial.id,
      modeloId: 'modelo_presencial_mensal',
      modalidade: 'presencial',
      vigenciaMeses: 6,
      inicioVigencia: '2026-01-10',
      valor: 65000, // centavos
      diaVencimento: 10,
      avisoCancelamentoDias: 30,
      horasRemarcacao: 6,
      clausulas: ['clausula_medica', 'clausula_remarcacao', 'clausula_lgpd'],
      status: 'assinado',
      formaAssinatura: 'manual',
      assinadoEm: '2026-01-10T10:00:00Z',
      arquivoAssinado: new Blob([pdfContent], { type: 'application/pdf' }),
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.contratos.put(contrato);

    const cobranca: Cobranca = {
      id: 'cobranca-set-2026',
      alunoId: alunoPresencial.id,
      planoId: plano.id,
      valor: 65000, // centavos
      vencimento: '2026-09-10',
      status: 'paga',
      pagoEm: '2026-09-10T14:30:00Z',
      metodo: 'pix',
      competencia: '2026-09',
      etapaRegua: 2,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.cobrancas.put(cobranca);

    const toque: ToqueRegua = {
      id: 'toque-teste-1',
      ordem: 1,
      offsetDias: -3,
      canal: 'email',
      modeloMensagemId: 'lembrete_gentil',
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.toquesRegua.put(toque);

    const msg: MensagemEnviada = {
      id: 'msg-1',
      alunoId: alunoPresencial.id,
      cobrancaId: cobranca.id,
      toqueId: toque.id,
      canal: 'whatsapp',
      tipo: 'lembrete',
      enviadaEm: agora,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.mensagensEnviadas.put(msg);

    // 1. Exporta tudo
    const jsonExportado = await exportarTudo(testDb);
    expect(typeof jsonExportado).toBe('string');

    const parsed = JSON.parse(jsonExportado);
    expect(parsed.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(parsed.dados.alunos.length).toBe(2);
    expect(parsed.dados.planos.length).toBe(1);
    expect(parsed.dados.contratos.length).toBe(1);
    expect(parsed.dados.cobrancas.length).toBe(1);
    expect(parsed.dados.contratos[0].arquivoAssinadoBase64).toBeDefined();

    // 2. Limpa completamente o banco de dados
    await Promise.all([
      testDb.alunos.clear(),
      testDb.planos.clear(),
      testDb.contratos.clear(),
      testDb.cobrancas.clear(),
      testDb.toquesRegua.clear(),
      testDb.mensagensEnviadas.clear(),
      testDb.config.clear(),
    ]);

    expect(await testDb.alunos.count()).toBe(0);
    expect(await testDb.planos.count()).toBe(0);
    expect(await testDb.contratos.count()).toBe(0);
    expect(await testDb.cobrancas.count()).toBe(0);
    expect(await testDb.config.count()).toBe(0);

    // 3. Importa tudo de volta
    const resultado = await importarTudo(jsonExportado, testDb);
    expect(resultado.sucesso).toBe(true);
    expect(resultado.contagens.alunos).toBe(2);
    expect(resultado.contagens.planos).toBe(1);
    expect(resultado.contagens.contratos).toBe(1);
    expect(resultado.contagens.cobrancas).toBe(1);

    // 4. Valida integridade e identidade dos dados restaurados
    const alunosRestaurados = await testDb.alunos.toArray();
    expect(alunosRestaurados.length).toBe(2);
    const alunoRecuperado = alunosRestaurados.find(a => a.id === alunoPresencial.id);
    expect(alunoRecuperado).toBeDefined();
    expect(alunoRecuperado?.nome).toBe(alunoPresencial.nome);
    expect(alunoRecuperado?.modalidade).toBe('presencial');

    const planoRecuperado = await testDb.planos.get(plano.id);
    expect(planoRecuperado).toBeDefined();
    expect(planoRecuperado?.valor).toBe(65000); // Centavos inteiros preservados
    expect(Number.isInteger(planoRecuperado?.valor)).toBe(true);

    const contratoRecuperado = await testDb.contratos.get(contrato.id);
    expect(contratoRecuperado).toBeDefined();
    expect(contratoRecuperado?.arquivoAssinado).toBeInstanceOf(Blob);
    const textoBlobRestaurado = await (contratoRecuperado!.arquivoAssinado as Blob).text();
    expect(textoBlobRestaurado).toBe(pdfContent);

    const cobrancaRecuperada = await testDb.cobrancas.get(cobranca.id);
    expect(cobrancaRecuperada).toBeDefined();
    expect(cobrancaRecuperada?.valor).toBe(65000);
    expect(cobrancaRecuperada?.status).toBe('paga');

    const configRecuperada = await testDb.config.get('unico');
    expect(configRecuperada?.nomePersonal).toBe('Carlos Personal');
  });

  it('deve limpar todas as tabelas atomicamente com limparTudo', async () => {
    await inicializarDadosPadrao(testDb);
    expect(await testDb.toquesRegua.count()).toBe(5);
    expect(await testDb.config.count()).toBe(1);

    const { limparTudo } = await import('../db/backup');
    await limparTudo(testDb);

    expect(await testDb.alunos.count()).toBe(0);
    expect(await testDb.planos.count()).toBe(0);
    expect(await testDb.contratos.count()).toBe(0);
    expect(await testDb.cobrancas.count()).toBe(0);
    expect(await testDb.toquesRegua.count()).toBe(0);
    expect(await testDb.mensagensEnviadas.count()).toBe(0);
    expect(await testDb.config.count()).toBe(0);
  });

  it('deve rejeitar JSON inválido ou malformado na importação', async () => {
    await expect(importarTudo('{ jsonInvalido: ', testDb)).rejects.toThrow(/JSON inválido/);
    await expect(importarTudo(JSON.stringify({ schemaVersion: 999, dados: {} }), testDb)).rejects.toThrow(
      /mais recente que a suportada/
    );
    await expect(importarTudo(JSON.stringify({ algo: 123 }), testDb)).rejects.toThrow(
      /schemaVersion ausente/
    );
  });
});
