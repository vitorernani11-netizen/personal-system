import { db, PersonalDatabase } from './index';
import type { RegistroPresenca } from '../types/database';

export async function registrarPresenca(
  alunoId: string,
  dataStr = new Date().toISOString().split('T')[0],
  status: 'presente' | 'falta' | 'justificada' = 'presente',
  horario?: string,
  observacao?: string,
  database: PersonalDatabase = db
): Promise<RegistroPresenca> {
  const agora = new Date().toISOString();

  // Verifica se já existe registro para esse aluno nessa data
  const existente = await database.presencas
    .where('[alunoId+data]')
    .equals([alunoId, dataStr])
    .first();

  let registroFinal: RegistroPresenca;

  if (existente) {
    registroFinal = {
      ...existente,
      status,
      horario: horario ?? existente.horario,
      observacao: observacao ?? existente.observacao,
      atualizadoEm: agora,
    };
    await database.presencas.put(registroFinal);
  } else {
    const aluno = await database.alunos.get(alunoId);
    registroFinal = {
      id: crypto.randomUUID(),
      alunoId,
      data: dataStr,
      horario: horario ?? aluno?.horario,
      status,
      tipo: aluno?.modalidade === 'online' ? 'checkin_online' : 'aula_presencial',
      observacao,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await database.presencas.put(registroFinal);
  }

  // Se marcado como presente, atualiza a última presença do aluno no cadastro
  if (status === 'presente') {
    const aluno = await database.alunos.get(alunoId);
    if (aluno) {
      const updates = aluno.modalidade === 'online'
        ? { ultimoCheckin: dataStr, atualizadoEm: agora }
        : { ultimaPresenca: dataStr, atualizadoEm: agora };
      await database.alunos.update(alunoId, updates);
    }
  }

  return registroFinal;
}

export async function desmarcarPresenca(
  alunoId: string,
  dataStr = new Date().toISOString().split('T')[0],
  database: PersonalDatabase = db
): Promise<void> {
  const existente = await database.presencas
    .where('[alunoId+data]')
    .equals([alunoId, dataStr])
    .first();

  if (existente) {
    await database.presencas.delete(existente.id);
  }

  // Recalcula a última presença real restante
  const ultimasPresencas = await database.presencas
    .where('alunoId')
    .equals(alunoId)
    .filter((p) => p.status === 'presente')
    .reverse()
    .sortBy('data');

  const maisRecente = ultimasPresencas[0]?.data;
  const agora = new Date().toISOString();
  const aluno = await database.alunos.get(alunoId);

  if (aluno) {
    const updates = aluno.modalidade === 'online'
      ? { ultimoCheckin: maisRecente || undefined, atualizadoEm: agora }
      : { ultimaPresenca: maisRecente || undefined, atualizadoEm: agora };
    await database.alunos.update(alunoId, updates);
  }
}

export async function alternarPresenca(
  alunoId: string,
  dataStr = new Date().toISOString().split('T')[0],
  horario?: string,
  database: PersonalDatabase = db
): Promise<{ presente: boolean; registro?: RegistroPresenca }> {
  const existente = await database.presencas
    .where('[alunoId+data]')
    .equals([alunoId, dataStr])
    .first();

  if (existente && existente.status === 'presente') {
    await desmarcarPresenca(alunoId, dataStr, database);
    return { presente: false };
  }

  const reg = await registrarPresenca(alunoId, dataStr, 'presente', horario, undefined, database);
  return { presente: true, registro: reg };
}

export async function verificarPresencaData(
  alunoId: string,
  dataStr = new Date().toISOString().split('T')[0],
  database: PersonalDatabase = db
): Promise<RegistroPresenca | undefined> {
  return database.presencas
    .where('[alunoId+data]')
    .equals([alunoId, dataStr])
    .first();
}

export interface RelatorioMensalPresencas {
  competencia: string; // aaaa-mm
  totalAulas: number;
  presencas: number;
  faltas: number;
  justificadas: number;
  taxaFrequencia: number; // 0 a 100
  registros: RegistroPresenca[];
}

export async function obterRelatorioMensalAluno(
  alunoId: string,
  anoMes = new Date().toISOString().substring(0, 7),
  database: PersonalDatabase = db
): Promise<RelatorioMensalPresencas> {
  const todasPresencas = await database.presencas
    .where('alunoId')
    .equals(alunoId)
    .toArray();

  const filtradas = todasPresencas
    .filter((p) => p.data.startsWith(anoMes))
    .sort((a, b) => b.data.localeCompare(a.data));

  const presencas = filtradas.filter((p) => p.status === 'presente').length;
  const faltas = filtradas.filter((p) => p.status === 'falta').length;
  const justificadas = filtradas.filter((p) => p.status === 'justificada').length;
  const totalAulas = filtradas.length;

  const totalConsiderado = presencas + faltas;
  const taxaFrequencia = totalConsiderado > 0
    ? Math.round((presencas / totalConsiderado) * 100)
    : presencas > 0 ? 100 : 0;

  return {
    competencia: anoMes,
    totalAulas,
    presencas,
    faltas,
    justificadas,
    taxaFrequencia,
    registros: filtradas,
  };
}

export async function obterPresencasData(
  dataStr = new Date().toISOString().split('T')[0],
  database: PersonalDatabase = db
): Promise<Map<string, RegistroPresenca>> {
  const lista = await database.presencas.where('data').equals(dataStr).toArray();
  const mapa = new Map<string, RegistroPresenca>();
  for (const item of lista) {
    mapa.set(item.alunoId, item);
  }
  return mapa;
}

export async function excluirRegistroPresenca(
  id: string,
  database: PersonalDatabase = db
): Promise<void> {
  const reg = await database.presencas.get(id);
  if (!reg) return;
  await database.presencas.delete(id);

  // Recalcular última presença
  const ultimasPresencas = await database.presencas
    .where('alunoId')
    .equals(reg.alunoId)
    .filter((p) => p.status === 'presente')
    .reverse()
    .sortBy('data');

  const maisRecente = ultimasPresencas[0]?.data;
  const agora = new Date().toISOString();
  const aluno = await database.alunos.get(reg.alunoId);

  if (aluno) {
    const updates = aluno.modalidade === 'online'
      ? { ultimoCheckin: maisRecente || undefined, atualizadoEm: agora }
      : { ultimaPresenca: maisRecente || undefined, atualizadoEm: agora };
    await database.alunos.update(reg.alunoId, updates);
  }
}

export interface AlunoResumoFrequencia {
  alunoId: string;
  nome: string;
  modalidade: string;
  presencas: number;
  faltas: number;
  justificadas: number;
  totalAulas: number;
  taxaFrequencia: number;
}

export interface RelatorioGeralMensal {
  competencia: string;
  totalAlunosAtivos: number;
  totalPresencas: number;
  totalFaltas: number;
  totalJustificadas: number;
  totalAulasRegistradas: number;
  taxaGeralFrequencia: number;
  alunos: AlunoResumoFrequencia[];
}

export async function obterRelatorioGeralMensal(
  anoMes = new Date().toISOString().substring(0, 7),
  database: PersonalDatabase = db
): Promise<RelatorioGeralMensal> {
  const [todosAlunos, todasPresencas] = await Promise.all([
    database.alunos.toArray(),
    database.presencas.toArray(),
  ]);

  const alunosAtivos = todosAlunos.filter((a) => a.status === 'ativo');
  const presencasMes = todasPresencas.filter((p) => p.data.startsWith(anoMes));

  const mapaPorAluno = new Map<string, RegistroPresenca[]>();
  for (const p of presencasMes) {
    const lista = mapaPorAluno.get(p.alunoId) || [];
    lista.push(p);
    mapaPorAluno.set(p.alunoId, lista);
  }

  let totalPresencas = 0;
  let totalFaltas = 0;
  let totalJustificadas = 0;

  const alunosResumo: AlunoResumoFrequencia[] = alunosAtivos.map((aluno) => {
    const registros = mapaPorAluno.get(aluno.id) || [];
    const pres = registros.filter((r) => r.status === 'presente').length;
    const flt = registros.filter((r) => r.status === 'falta').length;
    const just = registros.filter((r) => r.status === 'justificada').length;
    const total = registros.length;

    totalPresencas += pres;
    totalFaltas += flt;
    totalJustificadas += just;

    const considerados = pres + flt;
    const taxa = considerados > 0
      ? Math.round((pres / considerados) * 100)
      : pres > 0 ? 100 : 0;

    return {
      alunoId: aluno.id,
      nome: aluno.nome,
      modalidade: aluno.modalidade,
      presencas: pres,
      faltas: flt,
      justificadas: just,
      totalAulas: total,
      taxaFrequencia: taxa,
    };
  });

  alunosResumo.sort((a, b) => b.presencas - a.presencas || a.nome.localeCompare(b.nome));

  const totalConsiderados = totalPresencas + totalFaltas;
  const taxaGeral = totalConsiderados > 0
    ? Math.round((totalPresencas / totalConsiderados) * 100)
    : totalPresencas > 0 ? 100 : 0;

  return {
    competencia: anoMes,
    totalAlunosAtivos: alunosAtivos.length,
    totalPresencas,
    totalFaltas,
    totalJustificadas,
    totalAulasRegistradas: presencasMes.length,
    taxaGeralFrequencia: taxaGeral,
    alunos: alunosResumo,
  };
}
