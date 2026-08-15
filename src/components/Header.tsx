import React from 'react';
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
  ShieldAlert,
  CheckCircle2,
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

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* ===================================================
            MARCA E INFORMAÇÕES DO CULTO
            =================================================== */}
        <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('fechamento')}
              className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Ir para o Fechamento de Caixa"
            >
              <Church className="w-5 h-5 text-slate-950" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-sm sm:text-base md:text-lg text-white tracking-tight leading-tight truncate">
                  {configIgreja.nomeIgreja || 'Tesouraria da Igreja'}
                </h1>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1 border shrink-0 ${
                    isClosed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isClosed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Encerrado
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Em Aberto
                    </>
                  )}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="font-medium text-slate-300">
                  {fechamentoAtual.tipoCulto || 'Culto Geral'}
                </span>
                <span>•</span>
                <span>Data: {formattedDate}</span>
                {fechamentoAtual.hora && (
                  <>
                    <span>•</span>
                    <span>{fechamentoAtual.hora}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick logout / user avatar on small screens */}
          {currentUser && (
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenPrintModal}
                className="p-2 rounded-lg bg-slate-800 text-amber-400 border border-slate-700 active:scale-95"
                title="Imprimir / PDF"
              >
                <Printer className="w-4 h-4" />
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 active:scale-95"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ===================================================
            TOTAIS CONSOLIDADOS DO CAIXA
            =================================================== */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shrink-0 overflow-x-auto">
          {/* ENTRADAS */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 font-semibold block leading-none">
                Entradas
              </span>
              <span className="font-bold font-mono text-emerald-400 text-xs sm:text-sm">
                {formatCurrency(resumo.totalEntradas)}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-800 shrink-0" />

          {/* SAÍDAS */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 font-semibold block leading-none">
                Saídas
              </span>
              <span className="font-bold font-mono text-rose-400 text-xs sm:text-sm">
                {formatCurrency(resumo.totalSaidas)}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-800 shrink-0" />

          {/* SALDO LÍQUIDO */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 font-semibold block leading-none">
                Saldo
              </span>
              <span className="font-bold font-mono text-amber-300 text-xs sm:text-sm">
                {formatCurrency(resumo.saldoLiquido)}
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================
            BOTÕES DE AÇÃO RÁPIDA (DESKTOP)
            =================================================== */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Baixar Recibo em PDF / Imprimir Ata"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF / Imprimir</span>
          </button>

          <button
            type="button"
            onClick={onNovoFechamento}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            title="Iniciar Novo Fechamento de Caixa"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
            <span>Novo Caixa</span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold max-w-[120px] truncate">{currentUser.nome}</span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer active:scale-95"
                  title="Sair do sistema / Fazer Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
