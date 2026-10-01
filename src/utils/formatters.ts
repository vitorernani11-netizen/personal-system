export const DIAS_SEMANA_MAP: Record<number, { abrev: string; nome: string }> = {
  1: { abrev: 'Seg', nome: 'Segunda-feira' },
  2: { abrev: 'Ter', nome: 'Terça-feira' },
  3: { abrev: 'Qua', nome: 'Quarta-feira' },
  4: { abrev: 'Qui', nome: 'Quinta-feira' },
  5: { abrev: 'Sex', nome: 'Sexta-feira' },
  6: { abrev: 'Sáb', nome: 'Sábado' },
  0: { abrev: 'Dom', nome: 'Domingo' },
};

export const ORDEM_DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export function formatarDiasSemana(dias?: number[]): string {
  if (!dias || dias.length === 0) return 'Dias a definir';
  const ordenados = ORDEM_DIAS_SEMANA.filter((d) => dias.includes(d));
  if (ordenados.length === 0) return 'Dias a definir';
  return ordenados.map((d) => DIAS_SEMANA_MAP[d]?.abrev || '').join(', ');
}

export function formatarDiasSemanaExtenso(dias?: number[]): string {
  if (!dias || dias.length === 0) return 'Dias a definir';
  const ordenados = ORDEM_DIAS_SEMANA.filter((d) => dias.includes(d));
  if (ordenados.length === 0) return 'Dias a definir';
  return ordenados.map((d) => DIAS_SEMANA_MAP[d]?.nome || '').join(', ');
}
