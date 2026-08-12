import React, { useState } from 'react';
import {
  Church,
  Calendar,
  Clock,
  UserCheck,
  Users,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Coins,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  FileText,
  CreditCard,
  QrCode,
  Wallet,
  Building2,
  Check,
} from 'lucide-react';
import { FechamentoCulto, Lancamento, CategoriaEntrada } from '../types';
import {
  formatCurrency,
  calcularResumoLancamentos,
  calcularTotalContagem,
  CULTOS_LIST,
  ALL_ENTRADA_CATEGORIES,
  CATEGORIA_ENTRADA_LABELS,
} from '../utils/calculations';

interface FechamentoAtualViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
  onGoToLancamentos: () => void;
  onGoToContagem: () => void;
  onGoToRelatorioIA: () => void;
  onOpenPrintModal: () => void;
}

export const FechamentoAtualView: React.FC<FechamentoAtualViewProps> = ({
  fechamento,
  setFechamento,
  onGoToLancamentos,
  onGoToContagem,
  onGoToRelatorioIA,
  onOpenPrintModal,
}) => {
  const tipoBase = fechamento.tipoBaseRepasseMatriz || 'todas';
  const catsRepasse = fechamento.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES;

  const resumo = calcularResumoLancamentos(
    fechamento.lancamentos, 
    fechamento.porcentagemMatriz ?? 20,
    fechamento.aplicarRepasseMatriz ?? true,
    tipoBase,
    catsRepasse
  );
  const totalContagemFisica = calcularTotalContagem(fechamento.contagemDinheiro);
  const diferencaCaixaDinheiro = totalContagemFisica - resumo.totalDinheiro;

  const handleUpdateMeta = (field: keyof FechamentoCulto, value: any) => {
    setFechamento((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleCategoriaRepasse = (cat: CategoriaEntrada) => {
    const current = fechamento.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES;
    let updated: CategoriaEntrada[];
    if (current.includes(cat)) {
      updated = current.filter((c) => c !== cat);
    } else {
      updated = [...current, cat];
    }
    handleUpdateMeta('categoriasRepasseMatriz', updated);
    if (updated.length === ALL_ENTRADA_CATEGORIES.length) {
      handleUpdateMeta('tipoBaseRepasseMatriz', 'todas');
    } else {
      handleUpdateMeta('tipoBaseRepasseMatriz', 'selecionadas');
    }
  };

  const handleSelectTodaEntrada = () => {
    handleUpdateMeta('tipoBaseRepasseMatriz', 'todas');
    handleUpdateMeta('categoriasRepasseMatriz', ALL_ENTRADA_CATEGORIES);
  };

  const handleToggleStatus = () => {
    const newStatus = fechamento.status === 'aberto' ? 'fechado' : 'aberto';
    setFechamento((prev) => ({
      ...prev,
      status: newStatus,
      fechadoEm: newStatus === 'fechado' ? new Date().toISOString() : undefined,
    }));
  };

  const handleDeleteLancamento = (id: string) => {
    setFechamento((prev) => ({
      ...prev,
      lancamentos: prev.lancamentos.filter((l) => l.id !== id),
    }));
  };

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      dizimo: 'Dízimo do Membro',
      oferta_culto: 'Oferta do Culto',
      oferta_missoes: 'Oferta de Missões',
      oferta_especial: 'Oferta Especial',
      doacao: 'Doação Direta',
      agua: 'Conta de Água',
      luz: 'Conta de Luz / Energia',
      internet: 'Internet / Telefone',
      alimentacao: 'Alimentação / Lanche',
      aluguel: 'Aluguel do Templo',
      manutencao: 'Manutenção / Limpeza',
      material_ebd: 'Material EBD',
      acao_social: 'Ação Social',
      outros: 'Outros',
    };
    return labels[cat] || cat.replace(/_/g, ' ');
  };

  return (
    <div id="fechamento-atual-container" className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Culto Information Header / Meta Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Church className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Ata de Fechamento de Caixa</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Período: {fechamento.dataInicio ? new Date(fechamento.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : ''} até {fechamento.dataFim || fechamento.data ? new Date((fechamento.dataFim || fechamento.data) + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lançamento e fechamento consolidado por período selecioando.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                fechamento.status === 'fechado'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/20'
              }`}
            >
              {fechamento.status === 'fechado' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Encerrado (Clique para Reabrir)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Em Aberto (Encerrar Caixa)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Grid for Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Data de Início</span>
              <span className="text-[9px] text-amber-400 font-bold">PERÍODO</span>
            </label>
            <input
              type="date"
              value={fechamento.dataInicio || fechamento.data}
              onChange={(e) => {
                const val = e.target.value;
                setFechamento((prev) => ({
                  ...prev,
                  dataInicio: val,
                }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Data Final (Até Hoje)</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">HOJE</span>
            </label>
            <input
              type="date"
              value={fechamento.dataFim || fechamento.data}
              onChange={(e) => {
                const val = e.target.value;
                setFechamento((prev) => ({
                  ...prev,
                  dataFim: val,
                  data: val, // Sync data as end date
                }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Pastor Presidente
            </label>
            <input
              type="text"
              value={fechamento.pastorPresidente || ''}
              onChange={(e) => handleUpdateMeta('pastorPresidente', e.target.value)}
              placeholder="Ex: Pr. Carlos Silva"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Tesoureiro Responsável
            </label>
            <input
              type="text"
              value={fechamento.tesoureiro || ''}
              onChange={(e) => handleUpdateMeta('tesoureiro', e.target.value)}
              placeholder="Nome do tesoureiro"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Pastor Local
            </label>
            <input
              type="text"
              value={fechamento.pastorLocal || ''}
              onChange={(e) => handleUpdateMeta('pastorLocal', e.target.value)}
              placeholder="Ex: Pr. Roberto Santos"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Qtd. Membros
            </label>
            <input
              type="number"
              value={fechamento.qtdMembros || ''}
              onChange={(e) => handleUpdateMeta('qtdMembros', parseInt(e.target.value) || 0)}
              placeholder="Ex: 150"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Repasse Matriz</span>
              <span className="text-[9px] text-purple-300 font-bold font-mono">
                {resumo.aplicarRepasseMatriz ? formatCurrency(resumo.valorMatriz) : 'ISENTO'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fechamento.aplicarRepasseMatriz ?? true}
                  onChange={(e) => handleUpdateMeta('aplicarRepasseMatriz', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  disabled={!(fechamento.aplicarRepasseMatriz ?? true)}
                  value={fechamento.porcentagemMatriz ?? 20}
                  onChange={(e) => handleUpdateMeta('porcentagemMatriz', parseFloat(e.target.value) || 0)}
                  placeholder="20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 pr-7 text-xs text-purple-300 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-40"
                />
                <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Totals Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entradas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entradas</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(resumo.totalEntradas)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Dízimos: <strong className="text-slate-200">{formatCurrency(resumo.totalDizimos)}</strong>
            </p>
          </div>
        </div>

        {/* Total Ofertas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ofertas</span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-blue-300">
              {formatCurrency(resumo.totalOfertasCulto + resumo.totalOfertasMissoes + resumo.totalOutrasEntradas)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Culto: <strong className="text-slate-200">{formatCurrency(resumo.totalOfertasCulto)}</strong> | Missões: <strong className="text-slate-200">{formatCurrency(resumo.totalOfertasMissoes)}</strong>
            </p>
          </div>
        </div>

        {/* Total Saídas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Saídas / Despesas</span>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-rose-400">{formatCurrency(resumo.totalSaidas)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Pagamentos realizados durante o culto
            </p>
          </div>
        </div>

        {/* Saldo Líquido do Culto */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Saldo do Culto</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-amber-300">{formatCurrency(resumo.saldoLiquido)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Pix/Banco: <strong className="text-slate-200">{formatCurrency(resumo.totalPix + resumo.totalTransferencia)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Card Repasse para a Matriz (Sede) */}
      <div className={`border rounded-3xl p-5 shadow-xl flex flex-col space-y-4 transition-all ${
        resumo.aplicarRepasseMatriz
          ? 'bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/30 border-purple-500/40'
          : 'bg-slate-900/80 border-slate-800 opacity-90'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl shrink-0 ${
              resumo.aplicarRepasseMatriz
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Repasse para a Matriz / Sede</span>
                {resumo.aplicarRepasseMatriz ? (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold border border-purple-500/30">
                    {resumo.porcentagemMatriz}% sobre Base ({formatCurrency(resumo.baseCalculoMatriz)})
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold border border-slate-700">
                    DESATIVADO / ISENTO NESTE CULTO
                  </span>
                )}
              </h4>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                {resumo.aplicarRepasseMatriz ? (
                  <>
                    <span>Base do Repasse: <strong className="text-slate-100 font-mono text-xs">{formatCurrency(resumo.baseCalculoMatriz)}</strong></span>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <span>Valor à Sede: <strong className="text-purple-300 font-mono text-sm font-black">{formatCurrency(resumo.valorMatriz)}</strong></span>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <span>Saldo Congregação: <strong className="text-emerald-400 font-mono text-sm font-black">{formatCurrency(resumo.saldoCongregacao)}</strong></span>
                  </>
                ) : (
                  <span>Sem repasse para a matriz. Saldo Total da Congregação: <strong className="text-emerald-400 font-mono text-sm font-black">{formatCurrency(resumo.saldoLiquido)}</strong></span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
            <button
              onClick={() => handleUpdateMeta('aplicarRepasseMatriz', !resumo.aplicarRepasseMatriz)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                resumo.aplicarRepasseMatriz
                  ? 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {resumo.aplicarRepasseMatriz ? 'Repasse Ativado (Clique p/ Desativar)' : 'Repasse Desativado (Clique p/ Ativar)'}
            </button>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {resumo.aplicarRepasseMatriz ? `Envio p/ Matriz (${resumo.porcentagemMatriz}%)` : 'Envio p/ Matriz'}
              </span>
              <span className={`text-xl font-black font-mono ${resumo.aplicarRepasseMatriz ? 'text-purple-300' : 'text-slate-500'}`}>
                {resumo.aplicarRepasseMatriz ? formatCurrency(resumo.valorMatriz) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Selection for Matrix Repasse */}
        {resumo.aplicarRepasseMatriz && (
          <div className="pt-3 border-t border-purple-500/20 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-purple-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span>Categorias de Entrada que compõem o Repasse à Matriz:</span>
              </span>
              <button
                onClick={handleSelectTodaEntrada}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  (fechamento.tipoBaseRepasseMatriz || 'todas') === 'todas'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                ★ Selecionar Toda a Entrada (100%)
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_ENTRADA_CATEGORIES.map((cat) => {
                const isSelected = (fechamento.tipoBaseRepasseMatriz || 'todas') === 'todas' || (fechamento.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES).includes(cat);
                const label = CATEGORIA_ENTRADA_LABELS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => handleToggleCategoriaRepasse(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-900/60 border-purple-500/70 text-purple-200 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-purple-500 text-white font-black' : 'border border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Physical Cash vs System Balance Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Conferência de Caixa em Espécie (Dinheiro Físico)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                Math.abs(diferencaCaixaDinheiro) < 0.01
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {Math.abs(diferencaCaixaDinheiro) < 0.01 ? 'Caixa Bateu Exato' : diferencaCaixaDinheiro > 0 ? 'Sobra de Caixa' : 'Falta de Caixa'}
              </span>
            </h4>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
              <span>Lançado em Dinheiro: <strong className="text-slate-200 font-mono">{formatCurrency(resumo.totalDinheiro)}</strong></span>
              <span>Contado na Calculadora: <strong className="text-amber-300 font-mono">{formatCurrency(totalContagemFisica)}</strong></span>
              {Math.abs(diferencaCaixaDinheiro) >= 0.01 && (
                <span className={diferencaCaixaDinheiro > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  Diferença: {formatCurrency(diferencaCaixaDinheiro)}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onGoToContagem}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Abrir Contador de Cédulas</span>
        </button>
      </div>

      {/* Lançamentos do Culto Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Dízimos, Ofertas e Despesas Registradas ({fechamento.lancamentos.length})</span>
            </h3>
            <p className="text-xs text-slate-400">Detalhamento individual das entradas e saídas do culto.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGoToLancamentos}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Dízimo / Oferta</span>
            </button>
          </div>
        </div>

        {fechamento.lancamentos.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-6">
            <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-xs font-medium">Nenhum dízimo ou oferta lançado neste culto ainda.</p>
            <button
              onClick={onGoToLancamentos}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Realizar Primeiro Lançamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Descrição / Dizimista</th>
                  <th className="p-3">Forma Pagto.</th>
                  <th className="p-3 text-right">Valor (R$)</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {fechamento.lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        l.tipo === 'entrada'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-200">
                      {getCategoryLabel(l.categoria)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-100">{l.descricao}</div>
                      {l.nomePessoa && (
                        <div className="text-[10px] text-amber-400/90 font-medium">
                          Contribuição de: {l.nomePessoa}
                        </div>
                      )}
                    </td>
                    <td className="p-3 capitalize font-mono text-slate-400">
                      {l.formaPagamento.replace('_', ' ')}
                    </td>
                    <td className={`p-3 text-right font-bold font-mono ${
                      l.tipo === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {l.tipo === 'entrada' ? '+' : '-'} {formatCurrency(l.valor)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteLancamento(l.id)}
                        className="p-1 hover:text-rose-400 text-slate-600 transition-colors"
                        title="Remover lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick AI & Printing Tools Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Gerar Parecer da Tesouraria com IA</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Crie um resumo executivo formatado para o Pastor e conselho de membros.
            </p>
          </div>
          <button
            onClick={onGoToRelatorioIA}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer shrink-0"
          >
            Gerar com IA
          </button>
        </div>

        <div className="bg-gradient-to-r from-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Recibo de Fechamento</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Comprovante físico para arquivamento na pasta financeira da igreja.
            </p>
          </div>
          <button
            onClick={onOpenPrintModal}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-600/20 cursor-pointer shrink-0"
          >
            Imprimir Recibo
          </button>
        </div>
      </div>
    </div>
  );
};
