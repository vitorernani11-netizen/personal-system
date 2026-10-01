import { useState, useEffect } from 'react';

export type RouteName =
  | 'hoje'
  | 'agenda'
  | 'alunos'
  | 'aluno-form'
  | 'ficha'
  | 'contrato'
  | 'cobranca'
  | 'regua'
  | 'painel'
  | 'ajustes';

export interface RouteState {
  name: RouteName;
  params: Record<string, string>;
  path: string;
}

export function parseHash(hash: string): RouteState {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) {
    return { name: 'hoje', params: {}, path: 'hoje' };
  }

  const segments = cleanHash.split('/').filter(Boolean);
  const root = segments[0]?.toLowerCase();

  switch (root) {
    case 'hoje':
      return { name: 'hoje', params: {}, path: cleanHash };
    case 'agenda':
      return { name: 'agenda', params: {}, path: cleanHash };
    case 'alunos':
      return { name: 'alunos', params: {}, path: cleanHash };
    case 'aluno':
      if (segments[1] === 'novo') {
        return {
          name: 'aluno-form',
          params: { modo: 'novo' },
          path: cleanHash,
        };
      }
      if (segments[2] === 'editar') {
        return {
          name: 'aluno-form',
          params: { modo: 'editar', id: segments[1] || '' },
          path: cleanHash,
        };
      }
      return {
        name: 'ficha',
        params: { id: segments[1] || '' },
        path: cleanHash,
      };
    case 'contrato':
      return {
        name: 'contrato',
        params: { id: segments[1] || '' },
        path: cleanHash,
      };
    case 'cobranca':
      return {
        name: 'cobranca',
        params: { id: segments[1] || '' },
        path: cleanHash,
      };
    case 'regua':
      return { name: 'regua', params: {}, path: cleanHash };
    case 'painel':
      return { name: 'painel', params: {}, path: cleanHash };
    case 'ajustes':
      return { name: 'ajustes', params: {}, path: cleanHash };
    default:
      return { name: 'hoje', params: {}, path: 'hoje' };
  }
}

export function navegarPara(path: string): void {
  const target = path.startsWith('/') ? path.substring(1) : path;
  window.location.hash = `#/${target}`;
}

export function voltar(): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navegarPara('hoje');
  }
}

export function useHashRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { name: 'hoje', params: {}, path: 'hoje' }
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}
