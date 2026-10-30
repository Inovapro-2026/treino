import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Dumbbell,
  LineChart,
  Scale,
  History,
  Settings,
  Flame,
  LogOut,
  User,
  MoreHorizontal,
  X,
  ChevronUp,
} from 'lucide-react';
import { AuthSession } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export type NavTab =
  | 'dashboard'
  | 'routines'
  | 'exercises'
  | 'analytics'
  | 'measurements'
  | 'history'
  | 'settings'
  | 'workout';

type MobilePrimaryTab = NavTab | 'more';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  streakCount: number;
  currentUser?: AuthSession | null;
  onLogout?: () => void;
}

// Main navigation items (always visible in desktop sidebar)
const MAIN_NAV_ITEMS: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'routines', label: 'Fichas', icon: CalendarDays },
  { id: 'exercises', label: 'Exercícios', icon: Dumbbell },
  { id: 'analytics', label: 'Evolução', icon: LineChart },
  { id: 'measurements', label: 'Medidas', icon: Scale },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

// Mobile bottom bar: 4 primary items (including "more" as special)
const MOBILE_PRIMARY_ITEMS: { id: MobilePrimaryTab; label: string; icon: React.FC<{ className?: string }>; targetTab?: NavTab }[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'routines', label: 'Fichas', icon: CalendarDays },
  { id: 'workout', label: 'Treinar', icon: Dumbbell },
  { id: 'more', label: 'Mais', icon: MoreHorizontal },
];

// Secondary items that go inside "Mais" menu
const MOBILE_SECONDARY_ITEMS: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'exercises', label: 'Exercícios', icon: Dumbbell },
  { id: 'analytics', label: 'Evolução', icon: LineChart },
  { id: 'measurements', label: 'Medidas', icon: Scale },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

// Check if current tab is in secondary items
const isSecondaryTab = (tab: NavTab): boolean => {
  return MOBILE_SECONDARY_ITEMS.some((item) => item.id === tab);
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  streakCount,
  currentUser,
  onLogout,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(target)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMoreMenuOpen) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMoreMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMoreMenuOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreMenuOpen]);

  // Close menu when selecting an item
  const handleSelectTab = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMoreMenuOpen(false);
  };

  const isMoreActive = isSecondaryTab(currentTab);

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on md+) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/80 bg-zinc-950 p-4 shrink-0 h-[calc(100vh-61px)] sticky top-[61px] overflow-y-auto">
        <nav className="space-y-1.5 flex-1">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
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

        {/* User Card & Logout in Desktop Sidebar */}
        {currentUser && (
          <div className="pt-3 border-t border-zinc-900 mb-2">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-8 w-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="block text-xs font-bold text-white truncate">{currentUser.name}</span>
                  <span className="block text-[10px] text-zinc-500 truncate">{currentUser.email}</span>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Bloquear / Sair da conta"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Motivational Card in Desktop Sidebar */}
        <div className="mt-auto pt-2 border-t border-zinc-900">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 text-lime-400 font-bold mb-1">
              <Flame className="w-4 h-4 fill-current" />
              <span>Foco & Hipertrofia</span>
            </div>
            <p className="line-clamp-2 text-zinc-400 text-[11px]">
              Descanse entre as séries para ressíntese ideal e mantenha a cadência sob controle.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (visible on mobile, hidden on md+) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-lg px-2 py-1 safe-area-bottom">
        <div className="grid grid-cols-4 gap-1">
          {MOBILE_PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const targetTab = item.targetTab || item.id;
            const isMoreItem = item.id === 'more';
            const isActive = !isMoreItem && currentTab === targetTab;

            if (isMoreItem) {
              return (
                <div key="more" className="relative">
                  <button
                    ref={moreButtonRef}
                    onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-200 w-full ${
                      isMoreActive || isMoreMenuOpen
                        ? 'text-lime-400 bg-lime-400/10'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                    aria-expanded={isMoreMenuOpen}
                    aria-label="Mais opções"
                    aria-haspopup="true"
                  >
                    <Icon className={`w-5 h-5 ${isMoreActive || isMoreMenuOpen ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                    <span className={`text-[10px] mt-0.5 ${isMoreActive || isMoreMenuOpen ? 'font-bold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                    {(isMoreActive || isMoreMenuOpen) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-0.5" />
                    )}
                  </button>

                  {/* More Menu - Bottom Sheet with Overlay */}
                  <AnimatePresence>
                    {isMoreMenuOpen && (
                      <>
                        {/* Backdrop Overlay */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                          onClick={() => setIsMoreMenuOpen(false)}
                          aria-hidden="true"
                        />
                        
                        {/* Bottom Sheet */}
                        <motion.div
                          ref={moreMenuRef}
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="fixed bottom-0 left-0 right-0 z-50 md:hidden w-full max-w-[480px] mx-auto rounded-t-2xl border-t-0 border-x border-y border-zinc-800 bg-zinc-950 shadow-2xl safe-area-bottom overflow-hidden"
                          role="dialog"
                          aria-label="Mais opções"
                          aria-modal="true"
                        >
                          {/* Drag Handle */}
                          <div className="flex items-center justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-zinc-700" />
                          </div>

                          {/* Menu Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                            <span className="text-sm font-bold text-white">Mais opções</span>
                            <button
                              onClick={() => setIsMoreMenuOpen(false)}
                              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                              aria-label="Fechar menu"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Secondary Items - Scrollable */}
                          <div className="py-2 space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                            {MOBILE_SECONDARY_ITEMS.map((secItem) => {
                              const SecIcon = secItem.icon;
                              const isSecActive = currentTab === secItem.id;
                              return (
                                <button
                                  key={secItem.id}
                                  onClick={() => handleSelectTab(secItem.id)}
                                  role="menuitem"
                                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
                                    isSecActive
                                      ? 'bg-lime-400/15 text-lime-400 border-l-2 border-lime-400 pl-3.5'
                                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                                  }`}
                                >
                                  <SecIcon className={`w-5 h-5 shrink-0 ${isSecActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                                  <span className="truncate">{secItem.label}</span>
                                  {isSecActive && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2 h-2 rounded-full bg-lime-400 ml-auto shrink-0"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* User quick actions if logged in */}
                          {currentUser && (
                            <div className="border-t border-zinc-800 p-3 space-y-2">
                              <div className="flex items-center gap-2 px-2 text-xs text-zinc-400">
                                <div className="h-6 w-6 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 shrink-0">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-medium text-white truncate">{currentUser.name}</span>
                              </div>
                              {onLogout && (
                                <button
                                  onClick={() => {
                                    onLogout();
                                    setIsMoreMenuOpen(false);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-zinc-900 transition"
                                >
                                  <LogOut className="w-5 h-5 shrink-0" />
                                  <span>Sair / Bloquear</span>
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => item.id !== 'more' && handleSelectTab(item.targetTab || item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-200 w-full ${
                  isActive
                    ? 'text-lime-400 bg-lime-400/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};