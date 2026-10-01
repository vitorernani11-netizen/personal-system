import { useEffect, useState } from 'react';
import { db, inicializarDadosPadrao } from './db';
import { useHashRoute } from './router';
import { BottomNav } from './components/layout/BottomNav';
import { BackupBanner } from './components/ui/BackupBanner';
import { HojeView } from './views/HojeView';
import { AgendaView } from './views/AgendaView';
import { AlunosView } from './views/AlunosView';
import { AlunoFormView } from './views/AlunoFormView';
import { FichaView } from './views/FichaView';
import { ContratoView } from './views/ContratoView';
import { CobrancaView } from './views/CobrancaView';
import { ReguaView } from './views/ReguaView';
import { PainelView } from './views/PainelView';
import { AjustesView } from './views/AjustesView';

export default function App() {
  const route = useHashRoute();
  const [bancoPronto, setBancoPronto] = useState(false);
  const [ultimoBackupEm, setUltimoBackupEm] = useState<string | undefined>();

  useEffect(() => {
    async function inicializar() {
      try {
        await inicializarDadosPadrao();
        const cfg = await db.config.get('unico');
        if (cfg) setUltimoBackupEm(cfg.ultimoBackupEm);
        setBancoPronto(true);
      } catch (err) {
        console.error('Erro ao inicializar Dexie:', err);
      }
    }
    inicializar();
  }, []);

  if (!bancoPronto) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-app)',
          fontFamily: 'var(--font-heading)',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '18px',
          }}
        >
          PD
        </div>
        <p style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 600 }}>Personal em Dia</p>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Carregando dados locais...</span>
      </div>
    );
  }

  const isMainTab = ['hoje', 'agenda', 'alunos', 'painel', 'ajustes'].includes(route.name);
  const mostrarBannerBackup = (route.name === 'hoje' || route.name === 'ajustes');

  const renderView = () => {
    switch (route.name) {
      case 'hoje':
        return <HojeView />;
      case 'agenda':
        return <AgendaView />;
      case 'alunos':
        return <AlunosView />;
      case 'aluno-form':
        return <AlunoFormView id={route.params.id} modo={route.params.modo === 'editar' ? 'editar' : 'novo'} />;
      case 'ficha':
        return <FichaView alunoId={route.params.id} />;
      case 'contrato':
        return <ContratoView alunoId={route.params.id} />;
      case 'cobranca':
        return <CobrancaView cobrancaId={route.params.id} />;
      case 'regua':
        return <ReguaView />;
      case 'painel':
        return <PainelView />;
      case 'ajustes':
        return <AjustesView />;
      default:
        return <HojeView />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Banner de Backup Insistente (Passando de 7 dias, no topo de Hoje e Ajustes) */}
      {mostrarBannerBackup && (
        <BackupBanner ultimoBackupEm={ultimoBackupEm} />
      )}

      {/* Renderização da View correspondente ao Hash */}
      <main style={{ flex: 1 }}>
        {renderView()}
      </main>

      {/* Barra Inferior Fixa (Apenas nas 4 telas principais) */}
      {isMainTab && (
        <BottomNav currentRoute={route.name} />
      )}
    </div>
  );
}
