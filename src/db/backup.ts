import { db, PersonalDatabase } from './index';
import type {
  BackupPayload,
  Contrato,
  SerializedContrato
} from '../types/database';

export const BACKUP_SCHEMA_VERSION = 1;

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function obterNomeArquivoBackup(data = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `personal-em-dia-${ano}-${mes}-${dia}.json`;
}

export async function exportarTudo(database: PersonalDatabase = db): Promise<string> {
  const [
    alunos,
    planos,
    contratos,
    cobrancas,
    toquesRegua,
    mensagensEnviadas,
    configList,
    presencasList
  ] = await Promise.all([
    database.alunos.toArray(),
    database.planos.toArray(),
    database.contratos.toArray(),
    database.cobrancas.toArray(),
    database.toquesRegua.toArray(),
    database.mensagensEnviadas.toArray(),
    database.config.toArray(),
    database.presencas.toArray(),
  ]);

  const contratosSerializados: SerializedContrato[] = await Promise.all(
    contratos.map(async (contrato) => {
      const { arquivoAssinado, ...resto } = contrato;
      if (arquivoAssinado && arquivoAssinado instanceof Blob) {
        const base64 = await blobToBase64(arquivoAssinado);
        return {
          ...resto,
          arquivoAssinadoBase64: {
            base64,
            type: arquivoAssinado.type || 'application/octet-stream',
          },
        };
      }
      return resto;
    })
  );

  const agora = new Date().toISOString();

  // Se existir config, atualiza ultimoBackupEm
  const config = configList[0];
  if (config) {
    await database.config.update(config.id, {
      ultimoBackupEm: agora,
      atualizadoEm: agora,
    });
    config.ultimoBackupEm = agora;
    config.atualizadoEm = agora;
  }

  const payload: BackupPayload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    geradoEm: agora,
    dados: {
      alunos,
      planos,
      contratos: contratosSerializados,
      cobrancas,
      toquesRegua,
      mensagensEnviadas,
      config: configList,
      presencas: presencasList,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export interface ResultadoImportacao {
  sucesso: boolean;
  mensagem: string;
  contagens: {
    alunos: number;
    planos: number;
    contratos: number;
    cobrancas: number;
    toquesRegua: number;
    mensagensEnviadas: number;
    config: number;
    presencas: number;
  };
}

export async function importarTudo(
  conteudoJson: string,
  database: PersonalDatabase = db
): Promise<ResultadoImportacao> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(conteudoJson);
  } catch (err) {
    throw new Error(`JSON inválido: ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Conteúdo do backup não é um objeto válido.');
  }

  const payload = parsed as Partial<BackupPayload>;

  if (typeof payload.schemaVersion !== 'number') {
    throw new Error('Arquivo de backup inválido: schemaVersion ausente.');
  }

  if (payload.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Versão de schema do backup (${payload.schemaVersion}) é mais recente que a suportada (${BACKUP_SCHEMA_VERSION}).`
    );
  }

  if (!payload.dados || typeof payload.dados !== 'object') {
    throw new Error('Arquivo de backup inválido: campo "dados" ausente.');
  }

  const dados = payload.dados;
  const alunos = Array.isArray(dados.alunos) ? dados.alunos : [];
  const planos = Array.isArray(dados.planos) ? dados.planos : [];
  const contratosRaw = Array.isArray(dados.contratos) ? dados.contratos : [];
  const cobrancas = Array.isArray(dados.cobrancas) ? dados.cobrancas : [];
  const toquesRegua = Array.isArray(dados.toquesRegua) ? dados.toquesRegua : [];
  const mensagensEnviadas = Array.isArray(dados.mensagensEnviadas) ? dados.mensagensEnviadas : [];
  const configList = Array.isArray(dados.config) ? dados.config : [];
  const presencasList = Array.isArray(dados.presencas) ? dados.presencas : [];

  const contratosDesserializados: Contrato[] = contratosRaw.map((item) => {
    const { arquivoAssinadoBase64, ...resto } = item;
    if (arquivoAssinadoBase64?.base64) {
      const blob = base64ToBlob(
        arquivoAssinadoBase64.base64,
        arquivoAssinadoBase64.type || 'application/octet-stream'
      );
      return {
        ...resto,
        arquivoAssinado: blob,
      };
    }
    return resto;
  });

  await database.transaction(
    'rw',
    [
      database.alunos,
      database.planos,
      database.contratos,
      database.cobrancas,
      database.toquesRegua,
      database.mensagensEnviadas,
      database.config,
      database.presencas,
    ],
    async () => {
      await Promise.all([
        database.alunos.clear(),
        database.planos.clear(),
        database.contratos.clear(),
        database.cobrancas.clear(),
        database.toquesRegua.clear(),
        database.mensagensEnviadas.clear(),
        database.config.clear(),
        database.presencas.clear(),
      ]);

      if (alunos.length > 0) await database.alunos.bulkPut(alunos);
      if (planos.length > 0) await database.planos.bulkPut(planos);
      if (contratosDesserializados.length > 0) await database.contratos.bulkPut(contratosDesserializados);
      if (cobrancas.length > 0) await database.cobrancas.bulkPut(cobrancas);
      if (toquesRegua.length > 0) await database.toquesRegua.bulkPut(toquesRegua);
      if (mensagensEnviadas.length > 0) await database.mensagensEnviadas.bulkPut(mensagensEnviadas);
      if (configList.length > 0) await database.config.bulkPut(configList);
      if (presencasList.length > 0) await database.presencas.bulkPut(presencasList);
    }
  );

  return {
    sucesso: true,
    mensagem: 'Backup importado com sucesso.',
    contagens: {
      alunos: alunos.length,
      planos: planos.length,
      contratos: contratosDesserializados.length,
      cobrancas: cobrancas.length,
      toquesRegua: toquesRegua.length,
      mensagensEnviadas: mensagensEnviadas.length,
      config: configList.length,
      presencas: presencasList.length,
    },
  };
}

export async function limparTudo(database: PersonalDatabase = db): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.alunos,
      database.planos,
      database.contratos,
      database.cobrancas,
      database.toquesRegua,
      database.mensagensEnviadas,
      database.config,
      database.presencas,
    ],
    async () => {
      await Promise.all([
        database.alunos.clear(),
        database.planos.clear(),
        database.contratos.clear(),
        database.cobrancas.clear(),
        database.toquesRegua.clear(),
        database.mensagensEnviadas.clear(),
        database.config.clear(),
        database.presencas.clear(),
      ]);
    }
  );
}

export async function compartilharOuBaixarBackup(
  conteudoJson: string,
  nomeArquivo = obterNomeArquivoBackup()
): Promise<{ metodo: 'share' | 'download' }> {
  const blob = new Blob([conteudoJson], { type: 'application/json;charset=utf-8' });

  // Tenta compartilhar nativamente se o navegador der suporte
  if (typeof navigator !== 'undefined' && 'canShare' in navigator && 'share' in navigator) {
    try {
      const file = new File([blob], nomeArquivo, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Backup Personal em Dia',
          text: `Backup dos dados do Personal em Dia gerado em ${new Date().toLocaleDateString('pt-BR')}.`,
        });
        return { metodo: 'share' };
      }
    } catch (e) {
      // Se usuário cancelou o share ou falhou, cai para o download tradicional
      if ((e as Error).name === 'AbortError') {
        return { metodo: 'share' };
      }
    }
  }

  // Fallback para download via tag <a>
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { metodo: 'download' };
}
