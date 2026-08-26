import React, { useState } from 'react';
import {
  Church,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Download,
  FileText,
  Wallet,
  Building2,
  Check,
  Loader2,
} from 'lucide-react';

import {
  FechamentoCulto,
  CategoriaEntrada,
  ContagemDinheiro,
  User as UserType,
} from '../types';

import {
  formatCurrency,
  calcularResumoLancamentos,
  calcularTotalContagem,
  ALL_ENTRADA_CATEGORIES,
  CATEGORIA_ENTRADA_LABELS,
} from '../utils/calculations';
import { deleteLancamento, isSuperAdmin } from '../services/treasuryService';

interface FechamentoAtualViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
  onGoToLancamentos: () => void;
  onGoToContagem: () => void;
  onGoToRelatorioIA: () => void;
  onOpenPrintModal: () => void;
  currentUser?: UserType | null;
  onOpenSubscriptionModal?: () => void;
}

export const FechamentoAtualView: React.FC<FechamentoAtualViewProps> = ({
  fechamento,
  setFechamento,
  onGoToLancamentos,
  onGoToContagem,
  onGoToRelatorioIA,
  onOpenPrintModal,
  currentUser,
  onOpenSubscriptionModal,
}) => {
  /*
   * Proteções para dados antigos/incompletos.
   * Isso evita erros caso algum campo esteja ausente no localStorage.
   */
  const lancamentos = Array.isArray(fechamento.lancamentos)
    ? fechamento.lancamentos
    : [];

  const contagemDinheiro: ContagemDinheiro =
    fechamento.contagemDinheiro && typeof fechamento.contagemDinheiro === 'object' && !Array.isArray(fechamento.contagemDinheiro)
      ? fechamento.contagemDinheiro
      : {
          c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, c5: 0, c2: 0,
          m100: 0, m050: 0, m025: 0, m010: 0, m005: 0,
        };

  const tipoBase = fechamento.tipoBaseRepasseMatriz || 'todas';

  const catsRepasse: CategoriaEntrada[] =
    Array.isArray(fechamento.categoriasRepasseMatriz)
      ? fechamento.categoriasRepasseMatriz
      : [...ALL_ENTRADA_CATEGORIES];

  const porcentagemMatriz =
    typeof fechamento.porcentagemMatriz === 'number'
      ? fechamento.porcentagemMatriz
      : 20;

  const aplicarRepasseMatriz =
    fechamento.aplicarRepasseMatriz ?? true;

  const porcentagemPrebenda =
    typeof fechamento.porcentagemPrebenda === 'number'
      ? fechamento.porcentagemPrebenda
      : 0;

  const aplicarPrebenda =
    fechamento.aplicarPrebenda ?? false;

  const tipoBasePrebenda = fechamento.tipoBasePrebenda || 'todas';

  const catsPrebenda: CategoriaEntrada[] =
    Array.isArray(fechamento.categoriasPrebenda)
      ? fechamento.categoriasPrebenda
      : [...ALL_ENTRADA_CATEGORIES];

  const deduzirMatrizBasePrebenda =
    fechamento.deduzirMatrizBasePrebenda ?? false;

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resumo = calcularResumoLancamentos(
    lancamentos,
    porcentagemMatriz,
    aplicarRepasseMatriz,
    tipoBase,
    catsRepasse,
    porcentagemPrebenda,
    aplicarPrebenda,
    tipoBasePrebenda,
    catsPrebenda,
    deduzirMatrizBasePrebenda
  );

  const totalContagemFisica = calcularTotalContagem(contagemDinheiro);

  const diferencaCaixaDinheiro =
    totalContagemFisica - (resumo.totalDinheiro || 0);

  /*
   * Atualiza qualquer campo do fechamento.
   */
  const handleUpdateMeta = <
    K extends keyof FechamentoCulto
  >(
    field: K,
    value: FechamentoCulto[K]
  ) => {
    setFechamento((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /*
   * Alterna uma categoria do repasse.
   *
   * IMPORTANTE:
   * Quando estava em "todas", fazemos uma cópia real da lista antes
   * de remover uma categoria. Isso evita alterações acidentais no array
   * constante ALL_ENTRADA_CATEGORIES.
   */
  const handleToggleCategoriaRepasse = (
    cat: CategoriaEntrada
  ) => {
    const current: CategoriaEntrada[] =
      tipoBase === 'todas'
        ? [...ALL_ENTRADA_CATEGORIES]
        : [...catsRepasse];

    const exists = current.includes(cat);

    const updated = exists
      ? current.filter((item) => item !== cat)
      : [...current, cat];

    setFechamento((prev) => ({
      ...prev,
      categoriasRepasseMatriz: updated,
      tipoBaseRepasseMatriz:
        updated.length === ALL_ENTRADA_CATEGORIES.length
          ? 'todas'
          : 'selecionadas',
    }));
  };

  /*
   * Seleciona todas as categorias para o Repasse da Matriz.
   */
  const handleSelectTodaEntrada = () => {
    setFechamento((prev) => ({
      ...prev,
      tipoBaseRepasseMatriz: 'todas',
      categoriasRepasseMatriz: [...ALL_ENTRADA_CATEGORIES],
    }));
  };

  /*
   * Alterna uma categoria da Prebenda Pastoral.
   */
  const handleToggleCategoriaPrebenda = (
    cat: CategoriaEntrada
  ) => {
    const current: CategoriaEntrada[] =
      tipoBasePrebenda === 'todas'
        ? [...ALL_ENTRADA_CATEGORIES]
        : [...catsPrebenda];

    const exists = current.includes(cat);

    const updated = exists
      ? current.filter((item) => item !== cat)
      : [...current, cat];

    setFechamento((prev) => ({
      ...prev,
      categoriasPrebenda: updated,
      tipoBasePrebenda:
        updated.length === ALL_ENTRADA_CATEGORIES.length
          ? 'todas'
          : 'selecionadas',
    }));
  };

  /*
   * Seleciona todas as categorias para a Prebenda Pastoral.
   */
  const handleSelectTodaEntradaPrebenda = () => {
    setFechamento((prev) => ({
      ...prev,
      tipoBasePrebenda: 'todas',
      categoriasPrebenda: [...ALL_ENTRADA_CATEGORIES],
    }));
  };

  /*
   * Abre/fecha o caixa.
   */
  const handleToggleStatus = () => {
    setFechamento((prev) => {
      const novoStatus =
        prev.status === 'aberto'
          ? 'fechado'
          : 'aberto';

      return {
        ...prev,
        status: novoStatus,
        fechadoEm:
          novoStatus === 'fechado'
            ? new Date().toISOString()
            : undefined,
      };
    });
  };

  /*
   * Exclui lançamento com confirmação no banco de dados Supabase antes de atualizar a tela.
   */
  const handleDeleteLancamento = async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);

    try {
      const res = await deleteLancamento(id, currentUser?.id);

      if (!res.success) {
        const errMsg = res.error || 'Erro de permissão ou regras de segurança (RLS) ao excluir no Supabase.';
        alert(`Não foi possível excluir o lançamento:\n${errMsg}`);
        return;
      }

      setFechamento((prev) => ({
        ...prev,
        lancamentos: Array.isArray(prev.lancamentos)
          ? prev.lancamentos.filter((l) => l.id !== id)
          : [],
      }));
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err);
      const errMsg = err?.message || 'Falha inesperada ao tentar excluir o lançamento.';
      alert(`Erro ao excluir lançamento: ${errMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * Rótulo das categorias.
   */
  const getCategoryLabel = (cat?: string): string => {
    if (!cat) {
      return 'Não informado';
    }

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

  /*
   * Formatação segura de datas.
   */
  const formatDate = (value?: string) => {
    if (!value) {
      return '';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('pt-BR');
  };

  const dataInicio =
    fechamento.dataInicio || fechamento.data || '';

  const dataFim =
    fechamento.dataFim || fechamento.data || '';

  /*
   * Lógica de cálculo e badge da Assinatura no Header
   */
  const expiresAt = currentUser?.subscriptionExpiresAt;
  const isSuper = isSuperAdmin(currentUser);
  const isDemo = currentUser?.isDemo === true;

  const renderSubscriptionBadge = () => {
    if (isSuper || isDemo || expiresAt === 'Vitalício / Isento') {
      return (
        <div
          id="subscription-status-badge"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shadow-sm select-none"
          title="Conta com acesso vitalício ilimitado liberado"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Plano Ativo • Vitalício</span>
        </div>
      );
    }

    if (!expiresAt) {
      return (
        <div
          id="subscription-status-badge"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/90 text-emerald-300 border border-emerald-500/30 shadow-sm select-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Plano Ativo</span>
        </div>
      );
    }

    const expDate = new Date(expiresAt);
    const isDateValid = !Number.isNaN(expDate.getTime());

    if (!isDateValid) {
      return (
        <div
          id="subscription-status-badge"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/90 text-emerald-300 border border-emerald-500/30 shadow-sm select-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Plano Ativo • {expiresAt}</span>
        </div>
      );
    }

    const formattedDate = expDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diasRestantes > 7) {
      return (
        <div
          id="subscription-status-badge"
          title={`Sua assinatura está ativa e vence em ${formattedDate}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/90 text-emerald-300 border border-emerald-500/30 shadow-sm select-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Plano Ativo • Vence em {formattedDate}</span>
        </div>
      );
    }

    if (diasRestantes <= 7 && diasRestantes > 0) {
      return (
        <button
          id="subscription-status-badge"
          type="button"
          onClick={onOpenSubscriptionModal}
          title={`Sua assinatura vence em ${diasRestantes} dia(s) (${formattedDate}). Clique para renovar.`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm hover:bg-amber-500/25 transition-all cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Sua assinatura vence em {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}</span>
        </button>
      );
    }

    return (
      <button
        id="subscription-status-badge"
        type="button"
        onClick={onOpenSubscriptionModal}
        title="Sua assinatura expirou. Clique para renovar seu acesso."
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm hover:bg-rose-500/30 transition-all cursor-pointer animate-pulse"
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Assinatura Expirada • Renovar</span>
      </button>
    );
  };

  return (
    <div
      id="fechamento-atual-container"
      className="space-y-6 w-full"
    >
      {/* =========================================================
          CABEÇALHO / DADOS DO CULTO
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Church className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Ata de Fechamento de Caixa</span>

                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Período:{' '}
                  {formatDate(dataInicio)}
                  {' até '}
                  {formatDate(dataFim)}
                </span>
              </h2>

              <p className="text-xs text-slate-400">
                Lançamento e fechamento consolidado por período selecionado.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Badge de Status da Assinatura */}
            {renderSubscriptionBadge()}

            {/* Botão de Encerramento/Abertura de Caixa */}
            <button
              type="button"
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

        {/* =========================================================
            METADADOS / FORMULÁRIO DA ATA (REORGANIZADO EM 2 LINHAS)
        ========================================================== */}
        <div className="pt-4 space-y-4">
          {/* LINHA 1: Filtros Temporais e Configurações Financeiras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-end">
            {/* Data inicial */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
                  Data de Início
                </span>
                <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold font-mono border border-amber-500/30 shrink-0">
                  PERÍODO
                </span>
              </div>

              <input
                type="date"
                value={fechamento.dataInicio || fechamento.data || ''}
                onChange={(e) => {
                  const value = e.target.value;

                  setFechamento((prev) => ({
                    ...prev,
                    dataInicio: value,
                  }));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
              />
            </div>

            {/* Data final */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Data Final
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30 shrink-0">
                  FINAL
                </span>
              </div>

              <input
                type="date"
                value={fechamento.dataFim || fechamento.data || ''}
                onChange={(e) => {
                  const value = e.target.value;

                  setFechamento((prev) => ({
                    ...prev,
                    dataFim: value,
                    data: value,
                  }));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
              />
            </div>

            {/* Qtd. Membros */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Qtd. Membros
                </span>
              </div>

              <input
                type="number"
                min="0"
                value={fechamento.qtdMembros ?? ''}
                onChange={(e) =>
                  handleUpdateMeta(
                    'qtdMembros',
                    Number(e.target.value) || 0
                  )
                }
                placeholder="Ex: 150"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            {/* Repasse Matriz */}
            <div className="flex flex-col justify-end bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Repasse Matriz
                </span>

                <span className="text-[9px] text-purple-300 font-bold font-mono">
                  {resumo.aplicarRepasseMatriz
                    ? formatCurrency(resumo.valorMatriz)
                    : 'ISENTO'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aplicarRepasseMatriz}
                    onChange={(e) =>
                      handleUpdateMeta(
                        'aplicarRepasseMatriz',
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />

                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 shrink-0" />
                </label>

                <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-purple-500">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={!aplicarRepasseMatriz}
                    value={porcentagemMatriz}
                    onChange={(e) => {
                      const value = Number(e.target.value);

                      handleUpdateMeta(
                        'porcentagemMatriz',
                        Number.isFinite(value)
                          ? Math.min(100, Math.max(0, value))
                          : 0
                      );
                    }}
                    className="w-12 sm:w-14 bg-transparent text-xs text-purple-300 font-bold font-mono focus:outline-none disabled:opacity-40"
                  />

                  <span className="text-xs font-bold text-slate-400 select-none ml-1">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Prebenda Pastoral */}
            <div className="flex flex-col justify-end bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Prebenda Pastoral
                </span>

                <span className="text-[9px] text-amber-300 font-bold font-mono">
                  {resumo.aplicarPrebenda
                    ? formatCurrency(resumo.valorPrebenda)
                    : 'NÃO DEDUZIR'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aplicarPrebenda}
                    onChange={(e) =>
                      handleUpdateMeta(
                        'aplicarPrebenda',
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />

                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 shrink-0" />
                </label>

                <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-amber-500">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={!aplicarPrebenda}
                    value={porcentagemPrebenda}
                    onChange={(e) => {
                      const value = Number(e.target.value);

                      handleUpdateMeta(
                        'porcentagemPrebenda',
                        Number.isFinite(value)
                          ? Math.min(100, Math.max(0, value))
                          : 0
                      );
                    }}
                    className="w-12 sm:w-14 bg-transparent text-xs text-amber-300 font-bold font-mono focus:outline-none disabled:opacity-40"
                  />

                  <span className="text-xs font-bold text-slate-400 select-none ml-1">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LINHA 2: Responsáveis e Nomes Longos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-4 items-end pt-1">
            {/* Pastor Presidente */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Pastor Presidente
                </span>
              </div>

              <input
                type="text"
                value={fechamento.pastorPresidente || ''}
                onChange={(e) =>
                  handleUpdateMeta(
                    'pastorPresidente',
                    e.target.value
                  )
                }
                placeholder="Ex: Pr. Carlos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Tesoureiro Responsável */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Tesoureiro Responsável
                </span>
              </div>

              <input
                type="text"
                value={fechamento.tesoureiro || ''}
                onChange={(e) =>
                  handleUpdateMeta(
                    'tesoureiro',
                    e.target.value
                  )
                }
                placeholder="Nome do tesoureiro"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Pastor Local */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center mb-1.5 min-h-[1.25rem]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Pastor Local
                </span>
              </div>

              <input
                type="text"
                value={fechamento.pastorLocal || ''}
                onChange={(e) =>
                  handleUpdateMeta(
                    'pastorLocal',
                    e.target.value
                  )
                }
                placeholder="Ex: Pr. Roberto"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CARDS DE TOTAIS (CLIQUE PARA VER / LANÇAR)
      ========================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas */}
        <button
          type="button"
          onClick={onGoToLancamentos}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-2 relative overflow-hidden text-left transition-all group cursor-pointer active:scale-[0.99]"
          title="Ver e lançar entradas / dízimos"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-300 transition-colors">
              Total Entradas
            </span>

            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(resumo.totalEntradas)}
            </h3>

            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Dízimos:{' '}
                <strong className="text-slate-200">
                  {formatCurrency(resumo.totalDizimos)}
                </strong>
              </span>
              <span className="text-[10px] text-emerald-400/80 font-medium group-hover:underline">
                Ver detalhes →
              </span>
            </p>
          </div>
        </button>

        {/* Ofertas */}
        <button
          type="button"
          onClick={onGoToLancamentos}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-2 text-left transition-all group cursor-pointer active:scale-[0.99]"
          title="Ver e lançar ofertas"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-300 transition-colors">
              Total Ofertas
            </span>

            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black font-mono text-blue-300">
              {formatCurrency(
                (resumo.totalOfertasCulto || 0) +
                (resumo.totalOfertasMissoes || 0) +
                (resumo.totalOutrasEntradas || 0)
              )}
            </h3>

            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Culto: <strong className="text-slate-200">{formatCurrency(resumo.totalOfertasCulto)}</strong>
                {' | '}
                Missões: <strong className="text-slate-200">{formatCurrency(resumo.totalOfertasMissoes)}</strong>
              </span>
              <span className="text-[10px] text-blue-400/80 font-medium group-hover:underline">
                Ver →
              </span>
            </p>
          </div>
        </button>

        {/* Saídas */}
        <button
          type="button"
          onClick={onGoToLancamentos}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-2 text-left transition-all group cursor-pointer active:scale-[0.99]"
          title="Ver e lançar saídas / despesas"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-rose-300 transition-colors">
              Total Saídas / Despesas
            </span>

            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black font-mono text-rose-400">
              {formatCurrency(resumo.totalSaidas)}
            </h3>

            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Pagamentos realizados no período</span>
              <span className="text-[10px] text-rose-400/80 font-medium group-hover:underline">
                Lançar saída →
              </span>
            </p>
          </div>
        </button>

        {/* Saldo Disponível */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Saldo Disponível em Caixa
            </span>

            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black font-mono text-amber-300">
              {formatCurrency(resumo.saldoDisponivel)}
            </h3>

            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>
                Líquido Bruto:{' '}
                <strong className="text-slate-200">
                  {formatCurrency(resumo.saldoLiquido)}
                </strong>
              </span>
              {(resumo.aplicarRepasseMatriz || resumo.aplicarPrebenda) && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                  Deduções Aplicadas
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          REPASSE MATRIZ & PREBENDA PASTORAL (DEDUÇÕES)
      ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 1: Repasse para a Matriz / Sede */}
        <div
          className={`border rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
            resumo.aplicarRepasseMatriz
              ? 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/40'
              : 'bg-slate-900/80 border-slate-800 opacity-90'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  resumo.aplicarRepasseMatriz
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                <Building2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>Repasse Matriz / Sede</span>
                  {aplicarRepasseMatriz ? (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30 font-mono">
                      {porcentagemMatriz}%
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold border border-slate-700">
                      ISENTO
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Repasse institucional obrigatório ou estatutário da congregação.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleUpdateMeta(
                  'aplicarRepasseMatriz',
                  !resumo.aplicarRepasseMatriz
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                resumo.aplicarRepasseMatriz
                  ? 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {resumo.aplicarRepasseMatriz ? 'Ativo' : 'Desativado'}
            </button>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5 text-xs text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Base de Cálculo:</span>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(resumo.baseCalculoMatriz)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Valor à Matriz:
              </span>
              <span
                className={`text-xl font-black font-mono ${
                  resumo.aplicarRepasseMatriz ? 'text-purple-300' : 'text-slate-500'
                }`}
              >
                {resumo.aplicarRepasseMatriz
                  ? formatCurrency(resumo.valorMatriz)
                  : 'R$ 0,00'}
              </span>
            </div>
          </div>

          {/* Categorias */}
          {resumo.aplicarRepasseMatriz && (
            <div className="pt-2 border-t border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">
                  Categorias do Repasse:
                </span>
                <button
                  type="button"
                  onClick={handleSelectTodaEntrada}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                    tipoBase === 'todas'
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  ★ Toda Entrada
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ALL_ENTRADA_CATEGORIES.map((cat) => {
                  const isSelected =
                    tipoBase === 'todas' ||
                    catsRepasse.includes(cat);

                  const label =
                    CATEGORIA_ENTRADA_LABELS[cat] ||
                    getCategoryLabel(cat);

                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() =>
                        handleToggleCategoriaRepasse(cat)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-900/60 border-purple-500/70 text-purple-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[9px]">{isSelected ? '✓' : '○'}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bloco 2: Prebenda Pastoral */}
        <div
          className={`border rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
            resumo.aplicarPrebenda
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
              : 'bg-slate-900/80 border-slate-800 opacity-90'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  resumo.aplicarPrebenda
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                <Wallet className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>Prebenda Pastoral</span>
                  {resumo.aplicarPrebenda ? (
                    <>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30 font-mono">
                        {resumo.porcentagemPrebenda}% da Base
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                        deduzirMatrizBasePrebenda
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {deduzirMatrizBasePrebenda ? 'Líquido da Matriz' : 'Cálculo Bruto'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold border border-slate-700">
                      NÃO DEDUZIR
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Proventos ministeriais / sustento pastoral descontados do saldo local.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleUpdateMeta(
                  'aplicarPrebenda',
                  !resumo.aplicarPrebenda
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                resumo.aplicarPrebenda
                  ? 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {resumo.aplicarPrebenda ? 'Ativo' : 'Desativado'}
            </button>
          </div>

          {/* Box de Base de Cálculo e Valor */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs text-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Base de Cálculo:
              </span>
              <span className="font-mono font-bold text-slate-200 text-sm">
                {formatCurrency(resumo.baseCalculoPrebenda)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {deduzirMatrizBasePrebenda
                  ? `(Entradas: ${formatCurrency(resumo.baseEntradasPrebenda)} - Matriz: ${formatCurrency(resumo.valorMatriz)})`
                  : `(Entradas Selecionadas: ${formatCurrency(resumo.baseEntradasPrebenda)})`}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Valor da Prebenda:
              </span>
              <span
                className={`text-xl font-black font-mono ${
                  resumo.aplicarPrebenda ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                {resumo.aplicarPrebenda
                  ? formatCurrency(resumo.valorPrebenda)
                  : 'R$ 0,00'}
              </span>
            </div>
          </div>

          {/* Opções e Configuração Dinâmica de Cálculo da Prebenda */}
          {resumo.aplicarPrebenda && (
            <div className="pt-2 border-t border-amber-500/20 space-y-3">
              {/* Toggle de Dedução do Repasse da Matriz */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200 block">
                    Deduzir valor da Matriz da base de cálculo
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {deduzirMatrizBasePrebenda
                      ? 'Base Líquida: subtrai o repasse da matriz antes de aplicar a %'
                      : 'Base Bruta: calcula a % diretamente sobre as entradas selecionadas'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={deduzirMatrizBasePrebenda}
                    onChange={(e) =>
                      handleUpdateMeta(
                        'deduzirMatrizBasePrebenda',
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shrink-0" />
                </label>
              </div>

              {/* Categorias da Prebenda */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                    Categorias da Prebenda:
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectTodaEntradaPrebenda}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                      tipoBasePrebenda === 'todas'
                        ? 'bg-amber-600 text-white border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    ★ Toda Entrada
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ALL_ENTRADA_CATEGORIES.map((cat) => {
                    const isSelected =
                      tipoBasePrebenda === 'todas' ||
                      catsPrebenda.includes(cat);

                    const label =
                      CATEGORIA_ENTRADA_LABELS[cat] ||
                      getCategoryLabel(cat);

                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() =>
                          handleToggleCategoriaPrebenda(cat)
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-900/60 border-amber-500/70 text-amber-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-[9px]">{isSelected ? '✓' : '○'}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-amber-500/20 text-xs text-slate-400 flex items-center justify-between">
            <span>Pastor Beneficiário:</span>
            <span className="font-bold text-slate-200">
              {fechamento.pastorLocal || fechamento.pastorPresidente || 'Pastor Titular'}
            </span>
          </div>
        </div>
      </div>

      {/* Resumo da Fórmula de Saldo Disponível em Caixa Local */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Demonstrativo de Saldo Disponível em Caixa Local
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Fórmula Oficial
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            [ Saldo Disponível = Entradas ({formatCurrency(resumo.totalEntradas)}) - Saídas ({formatCurrency(resumo.totalSaidas)})
            {resumo.aplicarRepasseMatriz ? ` - Repasse Matriz (${formatCurrency(resumo.valorMatriz)})` : ''}
            {resumo.aplicarPrebenda ? ` - Prebenda Pastoral (${formatCurrency(resumo.valorPrebenda)})` : ''} ]
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Saldo Líquido Disponível
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(resumo.saldoDisponivel)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          CONFERÊNCIA DO DINHEIRO
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Coins className="w-6 h-6" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span>
                Conferência de Caixa em Espécie
              </span>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  Math.abs(diferencaCaixaDinheiro) < 0.01
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {Math.abs(diferencaCaixaDinheiro) < 0.01
                  ? 'Caixa Bateu Exato'
                  : diferencaCaixaDinheiro > 0
                    ? 'Sobra de Caixa'
                    : 'Falta de Caixa'}
              </span>
            </h4>

            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
              <span>
                Lançado em Dinheiro:{' '}
                <strong className="text-slate-200 font-mono">
                  {formatCurrency(resumo.totalDinheiro)}
                </strong>
              </span>

              <span>
                Contado:{' '}
                <strong className="text-amber-300 font-mono">
                  {formatCurrency(totalContagemFisica)}
                </strong>
              </span>

              {Math.abs(diferencaCaixaDinheiro) >= 0.01 && (
                <span
                  className={
                    diferencaCaixaDinheiro > 0
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  Diferença:{' '}
                  {formatCurrency(diferencaCaixaDinheiro)}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToContagem}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Abrir Contador de Cédulas</span>
        </button>
      </div>

      {/* =========================================================
          LANÇAMENTOS
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>
                Dízimos, Ofertas e Despesas Registradas (
                {lancamentos.length})
              </span>
            </h3>

            <p className="text-xs text-slate-400">
              Detalhamento individual das entradas e saídas.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToLancamentos}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Dízimo / Oferta</span>
          </button>
        </div>

        {lancamentos.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-6">
            <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />

            <p className="text-slate-400 text-xs font-medium">
              Nenhum lançamento registrado neste período.
            </p>

            <button
              type="button"
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
                  <th className="p-3">Descrição / Pessoa</th>
                  <th className="p-3">Forma Pagto.</th>
                  <th className="p-3 text-right">Valor (R$)</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {lancamentos.map((l) => {
                  const tipoLancamento =
                    l.tipo === 'saida'
                      ? 'saida'
                      : 'entrada';

                  const valor =
                    typeof l.valor === 'number'
                      ? l.valor
                      : Number(l.valor) || 0;

                  const formaPagamento =
                    l.formaPagamento || 'dinheiro';

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            tipoLancamento === 'entrada'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {tipoLancamento === 'entrada'
                            ? 'Entrada'
                            : 'Saída'}
                        </span>
                      </td>

                      <td className="p-3 font-semibold text-slate-200">
                        {getCategoryLabel(l.categoria)}
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-100">
                          {l.descricao || 'Sem descrição'}
                        </div>

                        {l.nomePessoa && (
                          <div className="text-[10px] text-amber-400/90 font-medium">
                            Pessoa: {l.nomePessoa}
                          </div>
                        )}
                      </td>

                      <td className="p-3 capitalize font-mono text-slate-400">
                        {String(formaPagamento).replace(
                          /_/g,
                          ' '
                        )}
                      </td>

                      <td
                        className={`p-3 text-right font-bold font-mono ${
                          tipoLancamento === 'entrada'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {tipoLancamento === 'entrada'
                          ? '+'
                          : '-'}{' '}
                        {formatCurrency(valor)}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteLancamento(l.id)
                          }
                          disabled={deletingId === l.id}
                          className="p-1 hover:text-rose-400 text-slate-600 disabled:opacity-50 transition-colors cursor-pointer"
                          title="Remover lançamento"
                        >
                          {deletingId === l.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================
          IA / PDF
      ========================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Gerar Parecer da Tesouraria com IA</span>
            </h4>

            <p className="text-xs text-slate-400 mt-1">
              Crie um resumo executivo formatado para o Pastor e conselho.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToRelatorioIA}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer shrink-0"
          >
            Gerar com IA
          </button>
        </div>

        <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-emerald-950/30 border border-emerald-500/30 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Baixar PDF ou Imprimir Recibo</span>
            </h4>

            <p className="text-xs text-slate-400 mt-1">
              Gere o PDF oficial ou imprima a ata física.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Baixar PDF / Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};