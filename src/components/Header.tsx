import React, { useState } from 'react';
import {
  Church,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  RefreshCw,
  Download,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  FileCheck,
  PlusCircle,
  Coins,
  History,
  Sparkles,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { ActiveTab, FechamentoCulto, ConfigIgreja, User } from '../types';
import { formatCurrency, calcularResumoLancamentos } from '../utils/calculations';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  fechamentoAtual: FechamentoCulto;
  configIgreja: ConfigIgreja;
  onNovoFechamento: () => void;
  onOpenPrintModal: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fechamentoAtual,
  configIgreja,
  onNovoFechamento,
  onOpenPrintModal,
  currentUser,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const resumo = calcularResumoLancamentos(
    fechamentoAtual.lancamentos,
    fechamentoAtual.porcentagemMatriz ?? 20,
    fechamentoAtual.aplicarRepasseMatriz ?? true,
    fechamentoAtual.tipoBaseRepasseMatriz || 'todas',
    fechamentoAtual.categoriasRepasseMatriz
  );

  const formattedDate = fechamentoAtual.data
    ? new Date(fechamentoAtual.data + 'T00:00:00').toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const isClosed = fechamentoAtual.status === 'fechado';
  const qtdLancamentos = fechamentoAtual.lancamentos ? fechamentoAtual.lancamentos.length : 0;

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'fechamento', label: 'Fechamento', icon: FileCheck },
    {
      id: 'lancamentos',
      label: 'Dízimos & Ofertas',
      icon: PlusCircle,
      badge: qtdLancamentos > 0 ? String(qtdLancamentos) : undefined,
    },
    { id: 'contagem', label: 'Cédulas', icon: Coins },
    { id: 'relatorio_ia', label: 'Relatório IA', icon: Sparkles },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'config', label: 'Igreja', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* ===================================================
              MARCA E DADOS DO CULTO
              =================================================== */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => handleSelectTab('fechamento')}
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Ir para o Fechamento de Caixa"
            >
              <Church className="w-5 h-5 text-slate-950" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectTab('fechamento')}
                  className="font-bold text-xs sm:text-sm md:text-base text-white tracking-tight leading-tight truncate hover:text-amber-400 text-left transition-colors cursor-pointer"
                >
                  {configIgreja.nomeIgreja || 'Tesouraria da Igreja'}
                </button>

                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1 border shrink-0 ${
                    isClosed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isClosed ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                      <span className="hidden xs:inline">Encerrado</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="hidden xs:inline">Aberto</span>
                    </>
                  )}
                </span>
              </div>

              <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 flex-wrap mt-0.5">
                <span className="font-medium text-slate-300 truncate max-w-[100px] sm:max-w-none">
                  {fechamentoAtual.tipoCulto || 'Culto Geral'}
                </span>
                <span>•</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* ===================================================
              NAVEGAÇÃO RÁPIDA NO TOPO (DESKTOP)
              =================================================== */}
          <nav
            aria-label="Abas Principais"
            className="hidden xl:flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 shrink-0"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none
                    ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-slate-800 text-amber-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ===================================================
              RESUMO CONSOLIDADO (ENTRADAS, SAÍDAS, SALDO)
              =================================================== */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3 bg-slate-950/90 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs shrink-0">
            {/* ENTRADAS */}
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-semibold block leading-none">
                  Entradas
                </span>
                <span className="font-bold font-mono text-emerald-400 text-xs">
                  {formatCurrency(resumo.totalEntradas)}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

            {/* SAÍDAS */}
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-rose-500/10 text-rose-400">
                <ArrowDownRight className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-semibold block leading-none">
                  Saídas
                </span>
                <span className="font-bold font-mono text-rose-400 text-xs">
                  {formatCurrency(resumo.totalSaidas)}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

            {/* SALDO */}
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                <DollarSign className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-semibold block leading-none">
                  Saldo
                </span>
                <span className="font-bold font-mono text-amber-300 text-xs">
                  {formatCurrency(resumo.saldoLiquido)}
                </span>
              </div>
            </div>
          </div>

          {/* ===================================================
              AÇÕES DO TOPO & MENU MOBILE
              =================================================== */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Baixar Recibo em PDF / Imprimir Ata"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 hidden xs:inline" />
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">PDF / Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onNovoFechamento}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              title="Iniciar Novo Fechamento de Caixa"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden md:inline">Novo Caixa</span>
            </button>

            {currentUser && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer active:scale-95"
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}

            {/* Botão Hambúrguer Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 active:scale-95 cursor-pointer"
              title="Abrir Menu de Navegação"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-amber-400" /> : <Menu className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* ===================================================
            MENU EXPANSÍVEL MOBILE (DRAWER SUSPENSO)
            =================================================== */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-200 shadow-2xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Navegação do Aplicativo
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`
                      flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all text-left border cursor-pointer
                      ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                          : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                          isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {currentUser && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">{currentUser.nome}</span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};
