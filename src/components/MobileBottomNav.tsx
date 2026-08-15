import React from 'react';
import {
  FileCheck,
  PlusCircle,
  Coins,
  Sparkles,
  History,
  Settings,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  qtdLancamentos: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  qtdLancamentos,
}) => {
  const items: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'fechamento', label: 'Fechamento', icon: FileCheck },
    {
      id: 'lancamentos',
      label: 'Lançamentos',
      icon: PlusCircle,
      badge: qtdLancamentos > 0 ? qtdLancamentos : undefined,
    },
    { id: 'contagem', label: 'Cédulas', icon: Coins },
    { id: 'relatorio_ia', label: 'Relatório IA', icon: Sparkles },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'config', label: 'Igreja', icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 shadow-2xl px-2 py-1.5 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`
              flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all relative flex-1 min-w-0 cursor-pointer select-none
              ${isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-amber-400' : 'text-slate-400'
                }`}
              />

              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[9px] font-extrabold font-mono px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>

            <span
              className={`text-[10px] tracking-tight mt-0.5 truncate w-full text-center ${
                isActive ? 'font-bold text-amber-300' : 'font-medium text-slate-400'
              }`}
            >
              {item.label}
            </span>

            {isActive && (
              <span className="w-1 h-1 bg-amber-400 rounded-full mt-0.5 shadow-sm shadow-amber-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};
