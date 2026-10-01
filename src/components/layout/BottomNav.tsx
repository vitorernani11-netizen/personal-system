import type { RouteName } from '../../router';
import { navegarPara } from '../../router';
import { IconHoje, IconAgenda, IconAlunos, IconPainel, IconAjustes } from '../ui/Icons';

interface BottomNavProps {
  currentRoute: RouteName;
}

interface NavItem {
  route: RouteName;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute }) => {
  const items: NavItem[] = [
    {
      route: 'hoje',
      label: 'Hoje',
      icon: (active) => <IconHoje size={20} strokeWidth={active ? 2.4 : 2} />,
    },
    {
      route: 'agenda',
      label: 'Agenda',
      icon: (active) => <IconAgenda size={20} strokeWidth={active ? 2.4 : 2} />,
    },
    {
      route: 'alunos',
      label: 'Alunos',
      icon: (active) => <IconAlunos size={20} strokeWidth={active ? 2.4 : 2} />,
    },
    {
      route: 'painel',
      label: 'Painel',
      icon: (active) => <IconPainel size={20} strokeWidth={active ? 2.4 : 2} />,
    },
    {
      route: 'ajustes',
      label: 'Ajustes',
      icon: (active) => <IconAjustes size={20} strokeWidth={active ? 2.4 : 2} />,
    },
  ];

  return (
    <nav
      aria-label="Navegação Principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: '6px',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      {items.map((item) => {
        const isActive = currentRoute === item.route;
        return (
          <button
            key={item.route}
            type="button"
            onClick={() => navegarPara(item.route)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '48px',
              border: 'none',
              backgroundColor: 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 0',
              transition: 'color 0.15s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 12px',
                borderRadius: '12px',
                backgroundColor: isActive ? 'var(--primary-tint)' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              {item.icon(isActive)}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.01em',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
