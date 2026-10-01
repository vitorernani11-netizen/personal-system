import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalDatabase } from '../db';
import {
  registrarPresenca,
  desmarcarPresenca,
  alternarPresenca,
  verificarPresencaData,
  obterRelatorioMensalAluno,
  obterRelatorioGeralMensal,
} from '../db/presenca';
import type { Aluno } from '../types/database';

describe('Personal em Dia - Módulo de Presenças e Relatório Mensal', () => {
  let testDb: PersonalDatabase;

  beforeEach(async () => {
    const dbName = `test_presenca_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    testDb = new PersonalDatabase(dbName);
    await testDb.open();
  });

  it('deve registrar presença e atualizar a última presença do aluno', async () => {
    const agora = new Date().toISOString();
    const aluno: Aluno = {
      id: 'aluno-1',
      nome: 'Mariana Silva',
      telefone: '11999990001',
      modalidade: 'presencial',
      status: 'ativo',
      inicio: '2026-01-01',
      canalPreferido: 'whatsapp',
      horario: '07:00',
      diasSemana: [1, 3, 5],
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.alunos.put(aluno);

    const reg = await registrarPresenca('aluno-1', '2026-09-25', 'presente', '07:00', 'Treino A', testDb);
    expect(reg.id).toBeDefined();
    expect(reg.alunoId).toBe('aluno-1');
    expect(reg.data).toBe('2026-09-25');
    expect(reg.status).toBe('presente');

    const alunoAtualizado = await testDb.alunos.get('aluno-1');
    expect(alunoAtualizado?.ultimaPresenca).toBe('2026-09-25');
  });

  it('deve alternar presença (marcar e desmarcar caso clicado por engano)', async () => {
    const agora = new Date().toISOString();
    const aluno: Aluno = {
      id: 'aluno-2',
      nome: 'Lucas Mendes',
      telefone: '11999990002',
      modalidade: 'presencial',
      status: 'ativo',
      inicio: '2026-01-01',
      canalPreferido: 'whatsapp',
      horario: '08:30',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.alunos.put(aluno);

    // 1º clique: marca presença
    const res1 = await alternarPresenca('aluno-2', '2026-09-26', '08:30', testDb);
    expect(res1.presente).toBe(true);
    let alunoDb = await testDb.alunos.get('aluno-2');
    expect(alunoDb?.ultimaPresenca).toBe('2026-09-26');

    // 2º clique: desmarca presença (usuário clicou por engano)
    const res2 = await alternarPresenca('aluno-2', '2026-09-26', '08:30', testDb);
    expect(res2.presente).toBe(false);
    alunoDb = await testDb.alunos.get('aluno-2');
    expect(alunoDb?.ultimaPresenca).toBeUndefined();

    // Registro deve ter sido removido
    const regCheck = await verificarPresencaData('aluno-2', '2026-09-26', testDb);
    expect(regCheck).toBeUndefined();
  });

  it('deve restaurar presença anterior ao desmarcar o registro mais recente', async () => {
    const agora = new Date().toISOString();
    const aluno: Aluno = {
      id: 'aluno-3',
      nome: 'Fernanda Costa',
      telefone: '11999990003',
      modalidade: 'presencial',
      status: 'ativo',
      inicio: '2026-01-01',
      canalPreferido: 'whatsapp',
      horario: '10:00',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.alunos.put(aluno);

    // Registra duas presenças em dias diferentes
    await registrarPresenca('aluno-3', '2026-09-20', 'presente', '10:00', undefined, testDb);
    await registrarPresenca('aluno-3', '2026-09-25', 'presente', '10:00', undefined, testDb);

    let alunoDb = await testDb.alunos.get('aluno-3');
    expect(alunoDb?.ultimaPresenca).toBe('2026-09-25');

    // Desmarca a presença do dia 25 (clicado por engano)
    await desmarcarPresenca('aluno-3', '2026-09-25', testDb);

    // Última presença deve retroagir para o dia 20
    alunoDb = await testDb.alunos.get('aluno-3');
    expect(alunoDb?.ultimaPresenca).toBe('2026-09-20');
  });

  it('deve gerar relatório mensal do aluno com presenças, faltas e taxa de assiduidade', async () => {
    const agora = new Date().toISOString();
    const aluno: Aluno = {
      id: 'aluno-4',
      nome: 'Bruno Lima',
      telefone: '11999990004',
      modalidade: 'presencial',
      status: 'ativo',
      inicio: '2026-01-01',
      canalPreferido: 'whatsapp',
      horario: '18:00',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.alunos.put(aluno);

    // Registra 3 presenças, 1 falta e 1 falta justificada no mês de 2026-09
    await registrarPresenca('aluno-4', '2026-09-02', 'presente', '18:00', undefined, testDb);
    await registrarPresenca('aluno-4', '2026-09-09', 'presente', '18:00', undefined, testDb);
    await registrarPresenca('aluno-4', '2026-09-16', 'presente', '18:00', undefined, testDb);
    await registrarPresenca('aluno-4', '2026-09-23', 'falta', '18:00', 'Sem aviso', testDb);
    await registrarPresenca('aluno-4', '2026-09-30', 'justificada', '18:00', 'Viagem', testDb);

    // Registro em outro mês (não deve contar em 2026-09)
    await registrarPresenca('aluno-4', '2026-08-25', 'presente', '18:00', undefined, testDb);

    const relatorio = await obterRelatorioMensalAluno('aluno-4', '2026-09', testDb);
    expect(relatorio.competencia).toBe('2026-09');
    expect(relatorio.totalAulas).toBe(5);
    expect(relatorio.presencas).toBe(3);
    expect(relatorio.faltas).toBe(1);
    expect(relatorio.justificadas).toBe(1);

    // Taxa: 3 presenças de 4 computadas (3 + 1 falta) = 75%
    expect(relatorio.taxaFrequencia).toBe(75);
    expect(relatorio.registros.length).toBe(5);
  });

  it('deve gerar relatório geral mensal de todos os alunos ativos', async () => {
    const agora = new Date().toISOString();
    const alunoA: Aluno = {
      id: 'aluno-a',
      nome: 'Aluno A',
      telefone: '11999990005',
      modalidade: 'presencial',
      status: 'ativo',
      inicio: '2026-01-01',
      canalPreferido: 'whatsapp',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    const alunoB: Aluno = {
      id: 'aluno-b',
      nome: 'Aluno B',
      telefone: '11999990006',
      modalidade: 'online',
      status: 'ativo',
      inicio: '2026-01-01',
      canalPreferido: 'whatsapp',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await testDb.alunos.bulkPut([alunoA, alunoB]);

    // Aluno A: 2 presenças, 0 faltas
    await registrarPresenca('aluno-a', '2026-09-10', 'presente', '08:00', undefined, testDb);
    await registrarPresenca('aluno-a', '2026-09-15', 'presente', '08:00', undefined, testDb);

    // Aluno B: 1 presença, 1 falta
    await registrarPresenca('aluno-b', '2026-09-12', 'presente', undefined, undefined, testDb);
    await registrarPresenca('aluno-b', '2026-09-19', 'falta', undefined, undefined, testDb);

    const relatorioGeral = await obterRelatorioGeralMensal('2026-09', testDb);
    expect(relatorioGeral.competencia).toBe('2026-09');
    expect(relatorioGeral.totalAlunosAtivos).toBe(2);
    expect(relatorioGeral.totalPresencas).toBe(3);
    expect(relatorioGeral.totalFaltas).toBe(1);
    expect(relatorioGeral.totalAulasRegistradas).toBe(4);

    // Taxa média geral: 3 presenças de 4 = 75%
    expect(relatorioGeral.taxaGeralFrequencia).toBe(75);

    expect(relatorioGeral.alunos.length).toBe(2);
    const itemA = relatorioGeral.alunos.find((a) => a.alunoId === 'aluno-a');
    expect(itemA?.presencas).toBe(2);
    expect(itemA?.faltas).toBe(0);
    expect(itemA?.taxaFrequencia).toBe(100);
  });
});
