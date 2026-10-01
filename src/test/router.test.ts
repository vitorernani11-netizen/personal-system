import { describe, it, expect } from 'vitest';
import { parseHash } from '../router';

describe('Personal em Dia - Roteador por Hash', () => {
  it('deve direcionar hash vazio ou inválido para tela Hoje', () => {
    expect(parseHash('').name).toBe('hoje');
    expect(parseHash('#').name).toBe('hoje');
    expect(parseHash('#/').name).toBe('hoje');
    expect(parseHash('#/rota-inexistente').name).toBe('hoje');
  });

  it('deve fazer o parse correto das abas principais', () => {
    expect(parseHash('#/hoje').name).toBe('hoje');
    expect(parseHash('#/agenda').name).toBe('agenda');
    expect(parseHash('#/alunos').name).toBe('alunos');
    expect(parseHash('#/painel').name).toBe('painel');
    expect(parseHash('#/ajustes').name).toBe('ajustes');
  });

  it('deve fazer o parse correto das 4 rotas secundárias com parâmetros', () => {
    const ficha = parseHash('#/aluno/aluno-uuid-123');
    expect(ficha.name).toBe('ficha');
    expect(ficha.params.id).toBe('aluno-uuid-123');

    const contrato = parseHash('#/contrato/aluno-456');
    expect(contrato.name).toBe('contrato');
    expect(contrato.params.id).toBe('aluno-456');

    const cobranca = parseHash('#/cobranca/cob-789');
    expect(cobranca.name).toBe('cobranca');
    expect(cobranca.params.id).toBe('cob-789');

    const regua = parseHash('#/regua');
    expect(regua.name).toBe('regua');

    const novoAluno = parseHash('#/aluno/novo');
    expect(novoAluno.name).toBe('aluno-form');
    expect(novoAluno.params.modo).toBe('novo');

    const editarAluno = parseHash('#/aluno/aluno-uuid-123/editar');
    expect(editarAluno.name).toBe('aluno-form');
    expect(editarAluno.params.modo).toBe('editar');
    expect(editarAluno.params.id).toBe('aluno-uuid-123');
  });
});
