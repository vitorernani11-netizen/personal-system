// Utilitário padrão para geração de PIX Copia e Cola (BR Code EMV)

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface GerarPixParams {
  chavePix: string;
  nomeRecebedor: string;
  cidadeRecebedor: string;
  valorCentavos: number;
  identificador?: string;
}

export function gerarPixCopiaECola({
  chavePix,
  nomeRecebedor,
  cidadeRecebedor,
  valorCentavos,
  identificador = '***',
}: GerarPixParams): string {
  // Limpeza e normalização
  const chave = (chavePix || 'carlos.personal@exemplo.com').trim();
  const nome = (nomeRecebedor || 'Personal Trainer').substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cidade = (cidadeRecebedor || 'SAO PAULO').substring(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const valorStr = (valorCentavos / 100).toFixed(2);

  // 00 - Payload Format Indicator
  let payload = formatField('00', '01');

  // 01 - Point of Initiation Method (12 = estático)
  payload += formatField('01', '12');

  // 26 - Merchant Account Information (PIX)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const keyField = formatField('01', chave);
  payload += formatField('26', gui + keyField);

  // 52 - Merchant Category Code
  payload += formatField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // 54 - Transaction Amount
  if (valorCentavos > 0) {
    payload += formatField('54', valorStr);
  }

  // 58 - Country Code
  payload += formatField('58', 'BR');

  // 59 - Merchant Name
  payload += formatField('59', nome);

  // 60 - Merchant City
  payload += formatField('60', cidade);

  // 62 - Additional Data Field (TxID)
  const txId = formatField('05', identificador);
  payload += formatField('62', txId);

  // 63 - CRC16
  payload += '6304';
  const checksum = crc16(payload);

  return `${payload}${checksum}`;
}
