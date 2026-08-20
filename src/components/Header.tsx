import React, { useState, useEffect, useRef } from 'react';
import {
  Church,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
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
  Cloud,
  Check,
  AlertCircle,
  Loader2,
  Crown,
} from 'lucide-react';
import { ActiveTab, FechamentoCulto, ConfigIgreja, User } from '../types';
import { formatCurrency, calcularResumoLancamentos } from '../utils/calculations';
import { isSubscriptionActive } from '../services/treasuryService';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  fechamentoAtual: FechamentoCulto;
  configIgreja: ConfigIgreja;
  onOpenPrintModal: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onManualSave?: () => void;
  onOpenSubscriptionModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fechamentoAtual,
  configIgreja,
  onOpenPrintModal,
  currentUser,
  onLogout,
  syncStatus = 'idle',
  onManualSave,
  onOpenSubscriptionModal,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSubscribed = isSubscriptionActive(currentUser);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

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
      <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 md:gap-6">
          {/* ===================================================
              1. MARCA, LOGO E DADOS DO CULTO (ESQUERDA)
              =================================================== */}
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => handleSelectTab('fechamento')}
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-all overflow-hidden"
              title="Ir para o Fechamento de Caixa"
            >
              {configIgreja.logoUrl ? (
                <img
                  src={configIgreja.logoUrl}
                  alt="Logo da Igreja"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Church className="w-5 h-5 text-slate-950" />
              )}
            </button>

            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => handleSelectTab('fechamento')}
                  className="font-bold text-xs sm:text-sm md:text-base text-white tracking-tight leading-tight truncate hover:text-amber-400 text-left transition-colors cursor-pointer max-w-[150px] xs:max-w-[220px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[650px]"
                  title={configIgreja.nomeIgreja || 'Tesouraria da Igreja'}
                >
                  {configIgreja.nomeIgreja || 'Tesouraria da Igreja'}
                </button>

                <span
                  className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1 border shrink-0 ${
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

              <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                <span className="font-medium text-slate-300 truncate max-w-[120px] sm:max-w-[200px]">
                  {fechamentoAtual.tipoCulto || 'Culto Geral'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="shrink-0">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* ===================================================
              2. RESUMO FINANCEIRO COMPACTO (TABLET / DESKTOP)
              =================================================== */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 bg-slate-950/90 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs shrink-0 shadow-inner">
            {/* ENTRADAS */}
            <div className="flex items-center gap-1.5" title="Total de Entradas">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-semibold block leading-none">
                  Entradas
                </span>
                <span className="font-bold font-mono text-emerald-400 text-xs lg:text-sm">
                  {formatCurrency(resumo.totalEntradas)}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

            {/* SAÍDAS */}
            <div className="flex items-center gap-1.5" title="Total de Saídas">
              <div className="p-1 rounded-md bg-rose-500/10 text-rose-400">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-semibold block leading-none">
                  Saídas
                </span>
                <span className="font-bold font-mono text-rose-400 text-xs lg:text-sm">
                  {formatCurrency(resumo.totalSaidas)}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

            {/* SALDO */}
            <div className="flex items-center gap-1.5" title="Saldo Líquido">
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-semibold block leading-none">
                  Saldo
                </span>
                <span className="font-bold font-mono text-amber-300 text-xs lg:text-sm">
                  {formatCurrency(resumo.saldoLiquido)}
                </span>
              </div>
            </div>
          </div>

          {/* ===================================================
              3. AÇÕES RÁPIDAS & MENU MOBILE (DIREITA)
              =================================================== */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* BOTÃO / BADGE DE ASSINATURA PRO */}
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer border ${
                  isSubscribed
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                    : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border-amber-500/50 shadow-amber-500/10 animate-pulse'
                }`}
                title={isSubscribed ? 'Assinatura Pro Ativa (Ver Detalhes)' : 'Assinar Plano Mensal Pro'}
              >
                <Crown className={`w-3.5 h-3.5 ${isSubscribed ? 'text-emerald-400' : 'text-amber-400 fill-amber-400'}`} />
                <span className="hidden sm:inline">
                  {isSubscribed ? 'Pro Ativo' : 'Seja Pro'}
                </span>
              </button>
            )}

            {/* INDICADOR DE SINCRONIZAÇÃO EM NUVEM */}
            {onManualSave && (
              <button
                type="button"
                onClick={onManualSave}
                disabled={syncStatus === 'saving'}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                  syncStatus === 'saving'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : syncStatus === 'saved'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : syncStatus === 'error'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
                title="Salvar alterações na nuvem"
              >
                {syncStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Salvando...</span>
                  </>
                ) : syncStatus === 'saved' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salvo na Nuvem</span>
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Erro ao Salvar</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden md:inline">Salvar</span>
                  </>
                )}
              </button>
            )}

            {/* BOTÃO IMPRIMIR / PDF */}
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Baixar Recibo em PDF / Imprimir Ata"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 hidden xs:inline" />
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">PDF / Imprimir</span>
            </button>

            {/* BOTÃO LOGOUT */}
            {currentUser && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer active:scale-95"
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}

            {/* BOTÃO HAMBÚRGUER MOBILE */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 active:scale-95 cursor-pointer"
              title={isMobileMenuOpen ? 'Fechar Menu' : 'Abrir Menu de Navegação'}
              aria-label={isMobileMenuOpen ? 'Fechar Menu' : 'Abrir Menu de Navegação'}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-amber-400" /> : <Menu className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* ===================================================
            5. MENU EXPANSÍVEL MOBILE (DRAWER COM BACKDROP)
            =================================================== */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop que escurece o fundo e fecha ao clicar */}
            <div
              className="lg:hidden fixed inset-0 top-16 bg-slate-950/70 backdrop-blur-sm z-30 animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Painel do menu */}
            <div
              ref={menuRef}
              className="lg:hidden relative z-40 bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                <span>Navegação Rápida</span>
                <span className="text-amber-400 font-mono">Gestão Eclesiástica</span>
              </div>

              {/* Resumo Financeiro Mobile no Menu */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 block">Entradas</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {formatCurrency(resumo.totalEntradas)}
                  </span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Saídas</span>
                  <span className="text-xs font-bold font-mono text-rose-400">
                    {formatCurrency(resumo.totalSaidas)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Saldo</span>
                  <span className="text-xs font-bold font-mono text-amber-300">
                    {formatCurrency(resumo.saldoLiquido)}
                  </span>
                </div>
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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/25 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </header>
    </>
  );
};

