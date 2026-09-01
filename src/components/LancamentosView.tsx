import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Trash2,
  Check,
  User,
  Calendar,
  Clock,
  ArrowLeft,
  Coins,
  FileCheck,
  AlertTriangle,
  X,
  Loader2,
  AlertCircle,
  MessageCircle,
  Printer,
  Receipt,
  UserPlus,
  Phone,
  Sparkles,
} from 'lucide-react';

import {
  FechamentoCulto,
  Lancamento,
  TipoLancamento,
  CategoriaEntrada,
  CategoriaSaida,
  FormaPagamento,
  ActiveTab,
  User as UserType,
  ConfigIgreja,
  Contributor,
} from '../types';

import {
  formatCurrency,
} from '../utils/calculations';
import {
  deleteLancamento,
  fetchContributors,
  saveContributor,
  calculateNextReceiptNumber,
  getNextReceiptNumber,
  toSqlDate,
} from '../services/treasuryService';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  formatReceiptDisplay,
  formatPhoneInput,
  formatPhoneDisplay,
  buildWhatsAppReceiptMessage,
  getWhatsAppShareUrl,
  sanitizeContributorId,
  isValidUUID,
  insertLancamentoResilient,
} from '../utils/receiptHelper';
import { ReceiptSuccessModal } from './ReceiptSuccessModal';
import { SingleReceiptModal } from './SingleReceiptModal';

interface LancamentosViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>> | ((updater: (prev: FechamentoCulto) => FechamentoCulto) => void);
  onNavigate?: (tab: ActiveTab) => void;
  currentUser?: UserType | null;
  config?: ConfigIgreja;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  setSyncStatus?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export const LancamentosView: React.FC<LancamentosViewProps> = ({
  fechamento,
  setFechamento,
  onNavigate,
  currentUser,
  syncStatus,
  setSyncStatus,
  config = {
    nomeIgreja: 'ABS CHURCH',
    cnpj: '',
    cidadeUF: '',
    pastorPresidente: '',
    pastorLocal: '',
    tesoureiroPadrao: '',
    segundoTesoureiroPadrao: '',
    porcentagemMatriz: 20,
    aplicarRepasseMatriz: true,
    tipoBaseRepasseMatriz: 'todas',
    porcentagemPrebenda: 0,
    aplicarPrebenda: false,
    whatsappSuporte: '',
    emailSuporte: '',
    apkDownloadUrl: '',
  },
}) => {
  const [tipo, setTipo] = useState<TipoLancamento>('entrada');
  const [categoria, setCategoria] = useState<string>('dizimo');
  const [descricao, setDescricao] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');

  // Contribuintes / Dizimistas
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [contributorNameInput, setContributorNameInput] = useState('');
  const [contributorPhoneInput, setContributorPhoneInput] = useState('');
  const [showContributorDropdown, setShowContributorDropdown] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modais de Recibo
  const [successReceiptLancamento, setSuccessReceiptLancamento] = useState<Lancamento | null>(null);
  const [singleReceiptToView, setSingleReceiptToView] = useState<Lancamento | null>(null);

  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    categoriaLabel: string;
    valorFormatado: string;
    pendingLancamento: Lancamento | null;
  }>({
    isOpen: false,
    categoriaLabel: '',
    valorFormatado: '',
    pendingLancamento: null,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carrega lista de dizimistas/contribuintes cadastrados
  useEffect(() => {
    let isMounted = true;
    fetchContributors(currentUser?.id).then((res) => {
      if (isMounted && res.data) {
        setContributors(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Fecha dropdown de autocomplete se clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowContributorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const lancamentos: Lancamento[] = Array.isArray(fechamento.lancamentos)
    ? fechamento.lancamentos
    : [];

  const categoriasEntrada: { value: CategoriaEntrada; label: string }[] = [
    { value: 'dizimo', label: 'Dízimo do Membro' },
    { value: 'oferta_culto', label: 'Oferta do Culto' },
    { value: 'oferta_missoes', label: 'Oferta de Missões' },
    { value: 'oferta_especial', label: 'Oferta Especial / Projeto' },
    { value: 'doacao', label: 'Doação Direta' },
    { value: 'outros', label: 'Outras Entradas' },
  ];

  const categoriasSaida: { value: CategoriaSaida; label: string }[] = [
    { value: 'agua', label: 'Conta de Água' },
    { value: 'luz', label: 'Conta de Luz / Energia' },
    { value: 'internet', label: 'Conta de Internet / Telefone' },
    { value: 'alimentacao', label: 'Alimentação / Lanche' },
    { value: 'aluguel', label: 'Aluguel do Templo' },
    { value: 'manutencao', label: 'Manutenção / Limpeza' },
    { value: 'material_ebd', label: 'Material de EBD / Infantil' },
    { value: 'acao_social', label: 'Ação Social / Assistência' },
    { value: 'outros', label: 'Outras Despesas' },
  ];

  const getCategoryLabel = (cat?: string): string => {
    if (!cat) return 'Não informado';
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

  const handleChangeTipo = (novoTipo: TipoLancamento) => {
    setTipo(novoTipo);
    if (novoTipo === 'entrada') {
      setCategoria('dizimo');
    } else {
      setCategoria('agua');
    }
  };

  const parseValor = (value: string): number => {
    let normalized = value.trim();
    if (!normalized) return 0;

    if (normalized.includes('.') && normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }

    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const extractDateOnly = (dateStr?: string): string => {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    const ptMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ptMatch) {
      return `${ptMatch[3]}-${ptMatch[2].padStart(2, '0')}-${ptMatch[1].padStart(2, '0')}`;
    }
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    return trimmed.split(' ')[0] || '';
  };

  const handleSelectContributor = (c: Contributor) => {
    setSelectedContributor(c);
    setContributorNameInput(c.name);
    setContributorPhoneInput(c.phone ? formatPhoneDisplay(c.phone) : '');
    setShowContributorDropdown(false);
  };

  const handleNameInputChange = (val: string) => {
    setContributorNameInput(val);
    setSelectedContributor(null);
    setShowContributorDropdown(val.trim().length > 0);
  };

  const filteredContributors = contributors.filter((c) => {
    const term = contributorNameInput.trim().toLowerCase();
    if (!term) return false;
    return c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term));
  });

  const salvarLancamentoFinal = async (
    lancamentoToSave: Lancamento,
    options?: { numericReceiptNumber?: number | null }
  ) => {
    setIsSubmitting(true);

    // Caso de conta Demonstração
    if (currentUser?.isDemo) {
      setHasSaveError(false);
      setSaveErrorMessage(null);
      setSyncStatus?.('saved');
      setTimeout(() => setSyncStatus?.('idle'), 2500);

      setFechamento((prev) => ({
        ...prev,
        lancamentos: [
          lancamentoToSave,
          ...(Array.isArray(prev.lancamentos) ? prev.lancamentos : []),
        ],
      }));

      if (lancamentoToSave.tipo === 'entrada') {
        setSuccessReceiptLancamento(lancamentoToSave);
      }

      setDescricao('');
      setValorStr('');
      setContributorNameInput('');
      setContributorPhoneInput('');
      setSelectedContributor(null);
      setIsSubmitting(false);
      return;
    }

    const churchId = currentUser?.id || 'default-church';
    const fechamentoId = fechamento.id || 'fechamento-geral';

    const contributorNameClean = (lancamentoToSave.contributorName?.trim() || lancamentoToSave.nomePessoa?.trim()) || null;
    const contributorPhoneClean = lancamentoToSave.contributorPhone?.trim()
      ? lancamentoToSave.contributorPhone.replace(/\D/g, '') || null
      : null;
    // Garante que contributor_id seja exclusivamente um UUID válido ou null (NUNCA string vazia "" ou undefined)
    const contributorIdClean = sanitizeContributorId(lancamentoToSave.contributorId);

    const rawTipo = String(lancamentoToSave.tipo || '').toLowerCase().trim();
    const isSaida = rawTipo === 'saida' || rawTipo === 'saída' || rawTipo.includes('said') || rawTipo.includes('desp');
    const finalTipo = isSaida ? 'saida' : 'entrada';
    const finalCategoria = lancamentoToSave.categoria || (isSaida ? 'outros' : 'oferta_culto');

    let calculatedNumericReceipt: number | null = null;
    if (finalTipo === 'entrada') {
      if (options?.numericReceiptNumber !== undefined) {
        calculatedNumericReceipt = options.numericReceiptNumber;
      } else if (lancamentoToSave.receiptNumber) {
        const parsed = parseInt(String(lancamentoToSave.receiptNumber).replace(/\D/g, ''), 10);
        calculatedNumericReceipt = Number.isNaN(parsed) ? null : parsed;
      }
    }

    // 1. Mapeamento Exato da Tabela 'lancamentos' sem qualquer propriedade undefined
    const payload: Record<string, any> = {
      id: lancamentoToSave.id,
      church_id: churchId,
      user_id: churchId,
      fechamento_id: fechamentoId,
      categoria: finalCategoria,
      descricao: lancamentoToSave.descricao?.trim() || (isSaida ? 'Despesa / Saída' : 'Oferta / Entrada'),
      valor: Number(lancamentoToSave.valor) || 0,
      forma_pagamento: lancamentoToSave.formaPagamento || 'dinheiro',
      nome_pessoa: contributorNameClean,
      contributor_id: contributorIdClean,
      contributor_name: contributorNameClean,
      contributor_phone: contributorPhoneClean,
      receipt_number: calculatedNumericReceipt,
      data: toSqlDate(lancamentoToSave.data),
    };

    // Garante que NENHUM campo undefined seja enviado (substitui por null)
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        payload[key] = null;
      }
    });

    setSyncStatus?.('saving');

    // 2. Execução resiliente com tratamento automático de CHECK constraint (lancamentos_tipo_check) e colunas ausentes
    try {
      const res = await insertLancamentoResilient(payload, isSaida, finalCategoria, false);

      if (!res.success) {
        const error = res.error;
        console.error('ERRO SUPABASE:', error);
        alert(`Erro ao salvar no banco de dados (Supabase):\n${error?.message || 'Falha ao salvar lançamento.'}`);
        setHasSaveError(true);
        setSaveErrorMessage(error?.message || 'Erro ao salvar no Supabase.');
        setSyncStatus?.('error');
        setIsSubmitting(false);
        return;
      }

      // 4. Limpeza do Alerta de Erro - Registro salvo com sucesso!
      setHasSaveError(false);
      setSaveErrorMessage(null);
      setSyncStatus?.('saved');
      setTimeout(() => setSyncStatus?.('idle'), 2500);

      // Atualiza estado local da aplicação
      setFechamento((prev) => ({
        ...prev,
        lancamentos: [
          lancamentoToSave,
          ...(Array.isArray(prev.lancamentos) ? prev.lancamentos : []),
        ],
      }));

      // Se for entrada, abre o modal de sucesso com ações de WhatsApp e Impressão
      if (lancamentoToSave.tipo === 'entrada') {
        setSuccessReceiptLancamento(lancamentoToSave);
      }

      // Limpa campos do formulário
      setDescricao('');
      setValorStr('');
      setContributorNameInput('');
      setContributorPhoneInput('');
      setSelectedContributor(null);
    } catch (err: any) {
      console.error('ERRO SUPABASE:', err);
      const msg = err?.message || String(err);
      alert(`Erro inesperado ao salvar no Supabase:\n${msg}`);
      setHasSaveError(true);
      setSaveErrorMessage(msg);
      setSyncStatus?.('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLancamento = async (e: React.FormEvent) => {
    e.preventDefault();

    const valor = parseValor(valorStr);
    if (!Number.isFinite(valor) || valor <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const categoriaFinal =
      tipo === 'entrada'
        ? (categoria as CategoriaEntrada)
        : (categoria as CategoriaSaida);

    let assignedReceiptNumberStr: string | undefined = undefined;
    let numericReceiptNumber: number | null = null;
    let finalContributorId: string | undefined = selectedContributor?.id;
    const finalContributorName = contributorNameInput.trim() || undefined;
    const finalContributorPhone = contributorPhoneInput.trim()
      ? contributorPhoneInput.replace(/\D/g, '')
      : undefined;

    // 3. Invocação Sequencial do Número do Recibo EXCLUSIVAMENTE ao submeter formulário
    if (tipo === 'entrada') {
      numericReceiptNumber = await calculateNextReceiptNumber(currentUser?.id);
      assignedReceiptNumberStr = String(numericReceiptNumber).padStart(6, '0');

      // Se o usuário digitou um nome e não selecionou contribuinte existente, salva/atualiza o dizimista
      if (finalContributorName) {
        try {
          const resContr = await saveContributor(
            {
              id: selectedContributor?.id,
              name: finalContributorName,
              phone: finalContributorPhone,
            },
            currentUser?.id
          );
          if (resContr.data) {
            finalContributorId = resContr.data.id;
            // Atualiza lista local de contribuintes
            setContributors((prev) => {
              const existingIdx = prev.findIndex((c) => c.id === resContr.data?.id);
              if (existingIdx >= 0 && resContr.data) {
                const next = [...prev];
                next[existingIdx] = resContr.data;
                return next;
              }
              return resContr.data ? [resContr.data, ...prev] : prev;
            });
          }
        } catch (err) {
          console.warn('Aviso ao salvar contribuinte:', err);
        }
      }
    }

    const newLancamento: Lancamento = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tipo,
      categoria: categoriaFinal,
      descricao:
        descricao.trim() ||
        (tipo === 'entrada'
          ? categoriaFinal === 'dizimo'
            ? 'Dízimo do Membro'
            : 'Oferta / Doação'
          : 'Despesa / Saída'),
      valor,
      formaPagamento,
      nomePessoa: finalContributorName,
      data: formattedDate,
      contributorId: finalContributorId,
      contributorName: finalContributorName,
      contributorPhone: finalContributorPhone,
      receiptNumber: assignedReceiptNumberStr,
    };

    // Verificação de despesa duplicada no mesmo dia
    if (tipo === 'saida') {
      const currentDateKey =
        extractDateOnly(formattedDate) ||
        extractDateOnly(fechamento.data) ||
        extractDateOnly(new Date().toISOString());

      const isDuplicate = lancamentos.some((l) => {
        const isSaida =
          l.tipo === 'saida' ||
          String(l.tipo).toLowerCase().includes('saida') ||
          String(l.tipo).toLowerCase().includes('despesa');
        if (!isSaida) return false;

        const sameCategory =
          String(l.categoria).trim().toLowerCase() === String(categoriaFinal).trim().toLowerCase();
        if (!sameCategory) return false;

        const lValor = typeof l.valor === 'number' ? l.valor : Number(l.valor) || 0;
        const sameValue = Math.abs(lValor - valor) < 0.01;
        if (!sameValue) return false;

        const lDateKey = extractDateOnly(l.data);
        if (lDateKey && currentDateKey) {
          return lDateKey === currentDateKey;
        }
        return true;
      });

      if (isDuplicate) {
        setDuplicateModal({
          isOpen: true,
          categoriaLabel: getCategoryLabel(categoriaFinal),
          valorFormatado: formatCurrency(valor),
          pendingLancamento: newLancamento,
        });
        return;
      }
    }

    await salvarLancamentoFinal(newLancamento, { numericReceiptNumber });
  };

  const handleConfirmDuplicate = async () => {
    if (duplicateModal.pendingLancamento) {
      await salvarLancamentoFinal(duplicateModal.pendingLancamento);
    }
    setDuplicateModal({
      isOpen: false,
      categoriaLabel: '',
      valorFormatado: '',
      pendingLancamento: null,
    });
  };

  const handleCancelDuplicate = () => {
    setDuplicateModal({
      isOpen: false,
      categoriaLabel: '',
      valorFormatado: '',
      pendingLancamento: null,
    });
  };

  const handleDeleteLancamento = async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);
    setDeleteError(null);

    try {
      const res = await deleteLancamento(id, currentUser?.id);
      if (!res.success) {
        const errMsg = res.error || 'Erro ao excluir no Supabase.';
        setDeleteError(errMsg);
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
      const errMsg = err?.message || 'Falha ao excluir.';
      setDeleteError(errMsg);
      alert(`Erro: ${errMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredLancamentos = lancamentos.filter((l) => {
    const descricaoItem = String(l.descricao || '').toLowerCase();
    const nomePessoaItem = String(l.nomePessoa || l.contributorName || '').toLowerCase();
    const phoneItem = String(l.contributorPhone || '').toLowerCase();
    const receiptItem = String(l.receiptNumber || '').toLowerCase();
    const categoriaLancamento = String(l.categoria || '').toLowerCase();

    const matchesSearch =
      normalizedSearch === '' ||
      descricaoItem.includes(normalizedSearch) ||
      nomePessoaItem.includes(normalizedSearch) ||
      phoneItem.includes(normalizedSearch) ||
      receiptItem.includes(normalizedSearch) ||
      categoriaLancamento.includes(normalizedSearch);

    const matchesFilter =
      filterTipo === 'todos' ||
      (filterTipo === 'entradas' && l.tipo === 'entrada') ||
      (filterTipo === 'saidas' && l.tipo === 'saida') ||
      (filterTipo === 'dizimos' && l.categoria === 'dizimo') ||
      (filterTipo === 'ofertas' &&
        (l.categoria === 'oferta_culto' ||
          l.categoria === 'oferta_missoes' ||
          l.categoria === 'oferta_especial'));

    return matchesSearch && matchesFilter;
  });

  return (
    <div id="lancamentos-view-container" className="space-y-6 w-full">
      {/* Barra de Navegação Contextual */}
      {onNavigate && (
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto w-full">
          <button
            type="button"
            onClick={() => onNavigate('fechamento')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar ao Fechamento</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('contagem')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Contador de Cédulas</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          FORMULÁRIO DE LANÇAMENTO
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <PlusCircle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Lançamento Financeiro</span>
                {tipo === 'entrada' && (
                  <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs rounded-full">
                    Emissão de Recibo Oficial
                  </span>
                )}
              </h2>

              <p className="text-xs text-slate-400">
                {tipo === 'entrada'
                  ? 'Gera recibo sequencial oficial isolado da igreja e link direto para envio via WhatsApp.'
                  : 'Registre despesas e saídas com controle de duplicidade.'}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-emerald-400 font-semibold">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Data Automática</span>
          </div>
        </div>

        {/* Data e Recibo */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>
              Registro da Transação: <strong className="text-slate-100">{new Date().toLocaleDateString('pt-BR')} (Hoje)</strong>
            </span>
          </div>

          {tipo === 'entrada' && (
            <div className="flex items-center gap-1.5 text-amber-300 font-mono text-xs">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Numeração Sequencial Própria</span>
            </div>
          )}
        </div>

        <form onSubmit={handleAddLancamento} className="space-y-4">
          {/* Tipo Entrada / Saída */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => handleChangeTipo('entrada')}
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                tipo === 'entrada'
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Entrada (Dízimo / Oferta)</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeTipo('saida')}
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                tipo === 'saida'
                  ? 'bg-rose-600/20 border-rose-500/50 text-rose-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
              <span>Saída (Despesa)</span>
            </button>
          </div>

          {/* Grid de Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoria:
              </label>

              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
              >
                {tipo === 'entrada'
                  ? categoriasEntrada.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))
                  : categoriasSaida.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
              </select>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Valor (R$):
              </label>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                  R$
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={valorStr}
                  onChange={(e) => setValorStr(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Forma de pagamento */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Forma de Pagamento:
              </label>

              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
              >
                <option value="dinheiro">Espécie (Dinheiro Físico)</option>
                <option value="pix">PIX (Chave da Igreja)</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="transferencia">Transferência / Boleto</option>
              </select>
            </div>

            {/* Dizimista / Favorecido com Autocomplete inteligente */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>
                  {tipo === 'entrada' ? 'Dizimista / Contribuinte:' : 'Favorecido / Credor:'}
                </span>
                {tipo === 'entrada' && selectedContributor && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cadastrado
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={contributorNameInput}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                  onFocus={() => {
                    if (tipo === 'entrada' && contributorNameInput.trim().length > 0) {
                      setShowContributorDropdown(true);
                    }
                  }}
                  placeholder={
                    tipo === 'entrada'
                      ? 'Buscar ou digitar nome do membro...'
                      : 'Ex: Companhia de Energia / Pr. Marcos'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                {tipo === 'entrada' && contributors.length > 0 && !contributorNameInput && (
                  <button
                    type="button"
                    onClick={() => setShowContributorDropdown(!showContributorDropdown)}
                    className="absolute right-2 top-2 text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800"
                  >
                    Lista ({contributors.length})
                  </button>
                )}
              </div>

              {/* Dropdown de Sugestões e Autocomplete */}
              {showContributorDropdown && tipo === 'entrada' && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl z-40 max-h-52 overflow-y-auto divide-y divide-slate-900">
                  {(contributorNameInput.trim() ? filteredContributors : contributors).length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      Nenhum membro encontrado com este nome. Será registrado como novo!
                    </div>
                  ) : (
                    (contributorNameInput.trim() ? filteredContributors : contributors).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectContributor(c)}
                        className="w-full p-2.5 text-left hover:bg-slate-900 text-xs flex items-center justify-between text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-semibold">{c.name}</span>
                        </div>
                        {c.phone && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatPhoneDisplay(c.phone)}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Linha extra para Entrada: Telefone WhatsApp do Contribuinte e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tipo === 'entrada' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp do Contribuinte:</span>
                </label>

                <input
                  type="tel"
                  value={contributorPhoneInput}
                  onChange={(e) => setContributorPhoneInput(formatPhoneInput(e.target.value))}
                  placeholder="(11) 98888-7777"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <div className={tipo === 'entrada' ? 'sm:col-span-2' : 'sm:col-span-3'}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descrição / Observação do Lançamento:
              </label>

              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={
                  tipo === 'entrada'
                    ? 'Ex: Dízimo referente ao mês atual ou Oferta voluntária...'
                    : 'Ex: Reparo de fiação, lâmpadas ou material infantil...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Banner de Erro Explícito se houver falha de salvamento */}
          {hasSaveError && saveErrorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-200">Falha ao salvar no banco de dados (Supabase):</p>
                <p className="font-mono text-[11px] mt-0.5 text-rose-300 break-all">{saveErrorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHasSaveError(false);
                  setSaveErrorMessage(null);
                  setSyncStatus?.('idle');
                }}
                className="text-rose-400 hover:text-rose-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Botão de Envio / Confirmação */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                <span>Gravando no Banco de Dados...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>
                  {tipo === 'entrada'
                    ? 'Confirmar Entrada e Emitir Recibo'
                    : 'Confirmar Lançamento de Despesa'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* =========================================================
          FILTROS E LISTA DE LANÇAMENTOS
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por dizimista, nº de recibo, telefone ou descrição..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Filtros por Categoria/Tipo */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'entradas', label: 'Entradas' },
              { id: 'dizimos', label: 'Dízimos' },
              { id: 'ofertas', label: 'Ofertas' },
              { id: 'saidas', label: 'Saídas' },
            ].map((filtro) => (
              <button
                key={filtro.id}
                type="button"
                onClick={() => setFilterTipo(filtro.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterTipo === filtro.id
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================
            LISTAGEM: CARDS MOBILE
        ====================================================== */}
        <div className="block md:hidden space-y-3">
          {filteredLancamentos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
              Nenhum lançamento encontrado com os filtros aplicados.
            </div>
          ) : (
            filteredLancamentos.map((l) => {
              const tipoLancamento = l.tipo === 'saida' ? 'saida' : 'entrada';
              const valor = typeof l.valor === 'number' ? l.valor : Number(l.valor) || 0;
              const forma = l.formaPagamento || 'dinheiro';
              const receiptNum = l.receiptNumber ? formatReceiptDisplay(l.receiptNumber) : null;
              const contributorName = l.contributorName || l.nomePessoa;
              const waMsg = buildWhatsAppReceiptMessage({
                receiptNumber: l.receiptNumber || '000001',
                churchName: config.nomeIgreja || 'ABS CHURCH',
                contributorName: contributorName || 'Contribuinte',
                tipo: l.categoria === 'dizimo' ? 'DÍZIMO' : 'OFERTA',
                valor,
                dataHora: l.data,
              });
              const waUrl = getWhatsAppShareUrl(l.contributorPhone, waMsg);

              return (
                <div
                  key={l.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {receiptNum && (
                        <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-[10px] rounded-md">
                          {receiptNum}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          tipoLancamento === 'entrada'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {tipoLancamento === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                      <span className="font-semibold text-xs text-slate-200">
                        {getCategoryLabel(l.categoria)}
                      </span>
                    </div>

                    <span
                      className={`font-bold font-mono text-sm shrink-0 ${
                        tipoLancamento === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tipoLancamento === 'entrada' ? '+' : '-'} {formatCurrency(valor)}
                    </span>
                  </div>

                  {l.descricao && <p className="text-xs text-slate-300">{l.descricao}</p>}

                  {contributorName && (
                    <div className="text-xs text-amber-400/90 font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>{contributorName}</span>
                      {l.contributorPhone && (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          ({formatPhoneDisplay(l.contributorPhone)})
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{l.data || 'Hoje'}</span>
                      <span>•</span>
                      <span className="capitalize font-mono text-slate-400">
                        {String(forma).replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Enviar WhatsApp se for entrada */}
                      {tipoLancamento === 'entrada' && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 rounded-lg text-emerald-300 hover:text-white transition-colors cursor-pointer"
                          title="Enviar Recibo via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Imprimir Recibo se for entrada */}
                      {tipoLancamento === 'entrada' && (
                        <button
                          type="button"
                          onClick={() => setSingleReceiptToView(l)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-amber-400 transition-colors cursor-pointer"
                          title="Imprimir Recibo Individual"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteLancamento(l.id)}
                        disabled={deletingId === l.id}
                        className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 disabled:opacity-50 transition-colors cursor-pointer"
                        title="Remover lançamento"
                      >
                        {deletingId === l.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =====================================================
            LISTAGEM: TABELA DESKTOP
        ====================================================== */}
        <div className="hidden md:block overflow-x-auto scroll-touch">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Recibo / Tipo</th>
                <th className="p-3">Data Registrada</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Dizimista / Descrição</th>
                <th className="p-3">Forma Pagto</th>
                <th className="p-3 text-right">Valor (R$)</th>
                <th className="p-3 text-center">Ações / Recibo</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {filteredLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    Nenhum lançamento encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLancamentos.map((l) => {
                  const tipoLancamento = l.tipo === 'saida' ? 'saida' : 'entrada';
                  const valor = typeof l.valor === 'number' ? l.valor : Number(l.valor) || 0;
                  const forma = l.formaPagamento || 'dinheiro';
                  const receiptNum = l.receiptNumber ? formatReceiptDisplay(l.receiptNumber) : null;
                  const contributorName = l.contributorName || l.nomePessoa;
                  const waMsg = buildWhatsAppReceiptMessage({
                    receiptNumber: l.receiptNumber || '000001',
                    churchName: config.nomeIgreja || 'ABS CHURCH',
                    contributorName: contributorName || 'Contribuinte',
                    tipo: l.categoria === 'dizimo' ? 'DÍZIMO' : 'OFERTA',
                    valor,
                    dataHora: l.data,
                  });
                  const waUrl = getWhatsAppShareUrl(l.contributorPhone, waMsg);

                  return (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Recibo e Tipo */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          {receiptNum ? (
                            <button
                              type="button"
                              onClick={() => setSingleReceiptToView(l)}
                              className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-[11px] rounded-md hover:bg-amber-500/25 transition-colors cursor-pointer"
                              title="Visualizar Recibo"
                            >
                              {receiptNum}
                            </button>
                          ) : null}

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              tipoLancamento === 'entrada'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {tipoLancamento === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </div>
                      </td>

                      {/* Data */}
                      <td className="p-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        {l.data || 'Hoje'}
                      </td>

                      {/* Categoria */}
                      <td className="p-3 font-semibold text-slate-200">
                        {getCategoryLabel(l.categoria)}
                      </td>

                      {/* Descrição e Pessoa */}
                      <td className="p-3">
                        {contributorName && (
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{contributorName}</span>
                            {l.contributorPhone && (
                              <span className="text-[10px] text-emerald-400 font-mono font-normal">
                                ({formatPhoneDisplay(l.contributorPhone)})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-slate-300 text-xs mt-0.5">
                          {l.descricao || 'Sem descrição'}
                        </div>
                      </td>

                      {/* Forma */}
                      <td className="p-3 capitalize font-mono text-slate-400">
                        {String(forma).replace(/_/g, ' ')}
                      </td>

                      {/* Valor */}
                      <td
                        className={`p-3 text-right font-bold font-mono text-sm ${
                          tipoLancamento === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tipoLancamento === 'entrada' ? '+' : '-'} {formatCurrency(valor)}
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Enviar WhatsApp */}
                          {tipoLancamento === 'entrada' && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 rounded-lg text-emerald-300 hover:text-white transition-colors cursor-pointer"
                              title="Enviar Recibo via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Imprimir */}
                          {tipoLancamento === 'entrada' && (
                            <button
                              type="button"
                              onClick={() => setSingleReceiptToView(l)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-amber-400 transition-colors cursor-pointer"
                              title="Imprimir Recibo Individual"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteLancamento(l.id)}
                            disabled={deletingId === l.id}
                            className="p-1.5 hover:text-rose-400 text-slate-600 disabled:opacity-50 transition-colors cursor-pointer hover:bg-rose-500/10 rounded-lg"
                            title="Remover lançamento"
                          >
                            {deletingId === l.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Sucesso com Ações Imediatas (WhatsApp Oficial, Baixar PDF e Concluir) */}
      {successReceiptLancamento && (
        <ReceiptSuccessModal
          isOpen={Boolean(successReceiptLancamento)}
          onClose={() => setSuccessReceiptLancamento(null)}
          lancamento={successReceiptLancamento}
          config={config}
          churchId={currentUser?.id || fechamento.id}
          pastorName={fechamento.pastorName || fechamento.pastorLocal || config.pastorPresidente}
          tesoureiroName={fechamento.tesoureiro || config.tesoureiroPadrao}
          onPrintReceipt={(l) => setSingleReceiptToView(l)}
          onNewLancamento={() => {
            setDescricao('');
            setValorStr('');
            setContributorNameInput('');
            setContributorPhoneInput('');
            setSelectedContributor(null);
            setTipo('entrada');
            setCategoria('dizimo');
            setFormaPagamento('dinheiro');
          }}
        />
      )}

      {/* Modal de Impressão / Visualização Individual de Recibo */}
      {singleReceiptToView && (
        <SingleReceiptModal
          isOpen={Boolean(singleReceiptToView)}
          onClose={() => setSingleReceiptToView(null)}
          lancamento={singleReceiptToView}
          config={config}
          pastorName={fechamento.pastorName || fechamento.pastorLocal || config.pastorPresidente}
          tesoureiroName={fechamento.tesoureiro || config.tesoureiroPadrao}
        />
      )}

      {/* Modal de Detecção e Confirmação de Despesa Duplicada */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 relative">
            <button
              type="button"
              onClick={handleCancelDuplicate}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar e revisar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Despesa Já Registrada
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Aviso de Possível Duplicidade
                </span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed space-y-2">
              <p className="font-medium text-slate-200">
                Atenção: Já existe um lançamento registrado para <strong className="text-amber-400 font-bold">{duplicateModal.categoriaLabel}</strong> no valor de <strong className="text-amber-400 font-bold">{duplicateModal.valorFormatado}</strong> nesta mesma data. Deseja continuar e registrar novamente?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelDuplicate}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-slate-700 cursor-pointer text-center"
              >
                Cancelar / Revisar
              </button>

              <button
                type="button"
                onClick={handleConfirmDuplicate}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-600/20 cursor-pointer active:scale-95 text-center"
              >
                Sim, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
