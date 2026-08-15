import React from 'react';
import {
  FileCheck,
  PlusCircle,
  Coins,
  History,
  Sparkles,
  Settings,
  ShieldCheck,
  Database,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, FechamentoCulto } from '../types';
import { isSupabaseConfigured } from '../services/supabase';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  qtdLancamentos: number;
  fechamentoAtual?: FechamentoCulto;
}

interface NavGroup {
  groupName: string;
  items: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  qtdLancamentos,
  fechamentoAtual,
}) => {
  const navGroups: NavGroup[] = [
    {
      groupName: 'Operação do Culto',
      items: [
        {
          id: 'fechamento',
          label: 'Fechamento de Caixa',
          shortLabel: 'Fechamento',
          description: 'Resumo geral e conferência do caixa',
          icon: FileCheck,
          badge: fechamentoAtual?.status === 'fechado' ? 'Fechado' : 'Aberto',
          badgeColor:
            fechamentoAtual?.status === 'fechado'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        {
          id: 'lancamentos',
          label: 'Dízimos & Ofertas',
          shortLabel: 'Lançamentos',
          description: 'Lançamento de dízimos, ofertas e despesas',
          icon: PlusCircle,
          badge: qtdLancamentos > 0 ? `${qtdLancamentos}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        {
          id: 'contagem',
          label: 'Contador de Cédulas',
          shortLabel: 'Cédulas',
          description: 'Conferência física de notas e moedas',
          icon: Coins,
          badge: 'Espécie',
          badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        },
      ],
    },
    {
      groupName: 'Auditoria & Arquivo',
      items: [
        {
          id: 'relatorio_ia',
          label: 'Relatório IA Tesouraria',
          shortLabel: 'Relatório IA',
          description: 'Auditoria e parecer formal com Gemini',
          icon: Sparkles,
          badge: 'IA Gemini',
          badgeColor:
            'bg-gradient-to-r from-purple-500/20 to-amber-500/20 text-purple-200 border-purple-500/30',
        },
        {
          id: 'historico',
          label: 'Histórico de Fechamentos',
          shortLabel: 'Histórico',
          description: 'Consultar fechamentos anteriores',
          icon: History,
          badge: 'Arquivo',
          badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        },
      ],
    },
    {
      groupName: 'Sistema & Igreja',
      items: [
        {
          id: 'config',
          label: 'Dados da Igreja',
          shortLabel: 'Igreja',
          description: 'Configurar igreja, pastores e tesoureiros',
          icon: Settings,
          badge: 'Ajustes',
          badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
        },
      ],
    },
  ];

  const allItems = navGroups.flatMap((g) => g.items);

  return (
    <aside
      id="app-sidebar"
      className="hidden lg:flex w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex-col justify-between shrink-0 shadow-lg"
    >
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Header da Barra Lateral */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Menu de Gestão
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-amber-400 border border-slate-800">
            v2.0
          </span>
        </div>

          {/* Grupos de Navegação */}
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.groupName} className="space-y-1.5">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.groupName}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group relative cursor-pointer
                          ${
                            isActive
                              ? 'bg-amber-500/15 text-white border border-amber-500/30 font-semibold shadow-inner'
                              : 'hover:bg-slate-800/70 hover:text-slate-100 text-slate-400 border border-transparent'
                          }
                        `}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r-full shadow-sm shadow-amber-500" />
                        )}

                        <div
                          className={`
                            p-2 rounded-lg transition-colors shrink-0
                            ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-amber-400'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold truncate text-slate-200 group-hover:text-white">
                              {item.label}
                            </span>

                            {item.badge && (
                              <span
                                className={`
                                  text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border shrink-0
                                  ${
                                    isActive
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                                      : item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                                  }
                                `}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-slate-500 truncate mt-0.5 group-hover:text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé da Barra Lateral */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] text-slate-300 font-medium">
                {isSupabaseConfigured ? 'Supabase Conectado' : 'Armazenamento Local'}
              </span>
            </div>
            <Database className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-tight">
              <span className="font-semibold text-slate-300 block mb-0.5">Tesouraria Blindada</span>
              Cálculos em tempo real, atas padronizadas e controle de dízimos.
            </div>
          </div>
        </div>
      </aside>
  );
};
