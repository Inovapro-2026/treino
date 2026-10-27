import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Dumbbell,
  LineChart,
  Scale,
  History,
  Settings,
  Flame,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'routines'
  | 'exercises'
  | 'analytics'
  | 'measurements'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  streakCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, streakCount }) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'routines', label: 'Fichas', icon: CalendarDays },
    { id: 'exercises', label: 'Exercícios', icon: Dumbbell },
    { id: 'analytics', label: 'Evolução', icon: LineChart },
    { id: 'measurements', label: 'Medidas', icon: Scale },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on md+) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/80 bg-zinc-950 p-4 shrink-0 h-[calc(100vh-61px)] sticky top-[61px] overflow-y-auto">
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-950/20'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Motivational Card in Desktop Sidebar */}
        <div className="mt-auto pt-4 border-t border-zinc-900">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 text-lime-400 font-bold mb-1">
              <Flame className="w-4 h-4 fill-current" />
              <span>Foco & Hipertrofia</span>
            </div>
            <p className="line-clamp-3 text-zinc-300">
              Descanse entre 60 a 120s para ressíntese ideal de fosfocreatina e mantenha a cadência excêntrica sob controle.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (visible on mobile, hidden on md+) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-lg px-2 py-1 safe-area-bottom">
        <div className="grid grid-cols-7 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
                  isActive ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-lime-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
