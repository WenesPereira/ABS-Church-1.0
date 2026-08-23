import React, { useState } from 'react';
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
} from '../types';

import {
  formatCurrency,
} from '../utils/calculations';
import { deleteLancamento } from '../services/treasuryService';

interface LancamentosViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
  onNavigate?: (tab: ActiveTab) => void;
  currentUser?: UserType | null;
}

export const LancamentosView: React.FC<LancamentosViewProps> = ({
  fechamento,
  setFechamento,
  onNavigate,
  currentUser,
}) => {
  const [tipo, setTipo] =
    useState<TipoLancamento>('entrada');

  const [categoria, setCategoria] =
    useState<string>('dizimo');

  const [descricao, setDescricao] =
    useState('');

  const [valorStr, setValorStr] =
    useState('');

  const [formaPagamento, setFormaPagamento] =
    useState<FormaPagamento>('dinheiro');

  const [nomePessoa, setNomePessoa] =
    useState('');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [filterTipo, setFilterTipo] =
    useState<string>('todos');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  /*
   * Proteção contra fechamento.lancamentos inexistente.
   */
  const lancamentos: Lancamento[] =
    Array.isArray(fechamento.lancamentos)
      ? fechamento.lancamentos
      : [];

  /*
   * Categorias de entrada.
   */
  const categoriasEntrada: {
    value: CategoriaEntrada;
    label: string;
  }[] = [
    {
      value: 'dizimo',
      label: 'Dízimo do Membro',
    },
    {
      value: 'oferta_culto',
      label: 'Oferta do Culto',
    },
    {
      value: 'oferta_missoes',
      label: 'Oferta de Missões',
    },
    {
      value: 'oferta_especial',
      label: 'Oferta Especial / Projeto',
    },
    {
      value: 'doacao',
      label: 'Doação Direta',
    },
    {
      value: 'outros',
      label: 'Outras Entradas',
    },
  ];

  /*
   * Categorias de saída.
   */
  const categoriasSaida: {
    value: CategoriaSaida;
    label: string;
  }[] = [
    {
      value: 'agua',
      label: 'Conta de Água',
    },
    {
      value: 'luz',
      label: 'Conta de Luz / Energia',
    },
    {
      value: 'internet',
      label: 'Conta de Internet / Telefone',
    },
    {
      value: 'alimentacao',
      label: 'Alimentação / Lanche',
    },
    {
      value: 'aluguel',
      label: 'Aluguel do Templo',
    },
    {
      value: 'manutencao',
      label: 'Manutenção / Limpeza',
    },
    {
      value: 'material_ebd',
      label: 'Material de EBD / Infantil',
    },
    {
      value: 'acao_social',
      label: 'Ação Social / Assistência',
    },
    {
      value: 'outros',
      label: 'Outras Despesas',
    },
  ];

  /*
   * Nome da categoria.
   */
  const getCategoryLabel = (
    cat?: string
  ): string => {
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

    return (
      labels[cat] ||
      cat.replace(/_/g, ' ')
    );
  };

  /*
   * Troca Entrada/Saída.
   *
   * Também troca automaticamente a categoria para uma categoria
   * válida do novo tipo.
   */
  const handleChangeTipo = (
    novoTipo: TipoLancamento
  ) => {
    setTipo(novoTipo);

    if (novoTipo === 'entrada') {
      setCategoria('dizimo');
    } else {
      setCategoria('agua');
    }
  };

  /*
   * Converte valores brasileiros:
   *
   * 1.000,50
   * 1000,50
   * 1000.50
   * 1000
   */
  const parseValor = (
    value: string
  ): number => {
    let normalized = value.trim();

    if (!normalized) {
      return 0;
    }

    /*
     * Se tiver ponto e vírgula:
     * 1.000,50 -> 1000.50
     */
    if (
      normalized.includes('.') &&
      normalized.includes(',')
    ) {
      normalized = normalized
        .replace(/\./g, '')
        .replace(',', '.');
    } else if (
      normalized.includes(',')
    ) {
      /*
       * 1000,50 -> 1000.50
       */
      normalized = normalized.replace(
        ',',
        '.'
      );
    }

    const numberValue =
      Number(normalized);

    return Number.isFinite(numberValue)
      ? numberValue
      : 0;
  };

  /*
   * Extrai a data limpa (YYYY-MM-DD) para conferência de mesmo dia
   */
  const extractDateOnly = (dateStr?: string): string => {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    const ptMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ptMatch) {
      const day = ptMatch[1].padStart(2, '0');
      const month = ptMatch[2].padStart(2, '0');
      const year = ptMatch[3];
      return `${year}-${month}-${day}`;
    }
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed.split(' ')[0] || '';
  };

  /*
   * Efetiva a gravação do lançamento no estado e dispara a sincronização
   */
  const salvarLancamentoFinal = (lancamentoToSave: Lancamento) => {
    setFechamento((prev) => ({
      ...prev,
      lancamentos: [
        lancamentoToSave,
        ...(Array.isArray(prev.lancamentos) ? prev.lancamentos : []),
      ],
    }));

    /*
     * Limpa somente os campos do formulário após gravação confirmada
     */
    setDescricao('');
    setValorStr('');
    setNomePessoa('');
  };

  /*
   * Adiciona lançamento com verificação prévia de despesa duplicada.
   */
  const handleAddLancamento = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const valor = parseValor(valorStr);

    if (
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      alert(
        'Por favor, informe um valor válido maior que zero.'
      );
      return;
    }

    const now = new Date();

    /*
     * Guardamos apresentação em pt-BR e data do registro.
     */
    const formattedDate =
      `${now.toLocaleDateString('pt-BR')} ` +
      `${now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const categoriaFinal =
      tipo === 'entrada'
        ? (categoria as CategoriaEntrada)
        : (categoria as CategoriaSaida);

    const newLancamento: Lancamento = {
      id:
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,

      tipo,

      categoria: categoriaFinal,

      descricao:
        descricao.trim() ||
        (
          tipo === 'entrada'
            ? 'Dízimo / Oferta / Doação'
            : 'Despesa / Saída'
        ),

      valor,

      formaPagamento,

      nomePessoa:
        nomePessoa.trim() || undefined,

      data: formattedDate,
    };

    // Verificação de despesa duplicada no mesmo dia com mesma categoria e mesmo valor
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
          String(l.categoria).trim().toLowerCase() ===
          String(categoriaFinal).trim().toLowerCase();

        if (!sameCategory) return false;

        const lValor =
          typeof l.valor === 'number'
            ? l.valor
            : Number(l.valor) || 0;

        const sameValue = Math.abs(lValor - valor) < 0.01;
        if (!sameValue) return false;

        const lDateKey = extractDateOnly(l.data);
        if (lDateKey && currentDateKey) {
          return lDateKey === currentDateKey;
        }
        return true;
      });

      if (isDuplicate) {
        // Exibe modal de confirmação sem excluir nem salvar automaticamente
        setDuplicateModal({
          isOpen: true,
          categoriaLabel: getCategoryLabel(categoriaFinal),
          valorFormatado: formatCurrency(valor),
          pendingLancamento: newLancamento,
        });
        return;
      }
    }

    // Salva diretamente caso não haja duplicidade
    salvarLancamentoFinal(newLancamento);
  };

  /*
   * Confirmar gravação da despesa duplicada
   */
  const handleConfirmDuplicate = () => {
    if (duplicateModal.pendingLancamento) {
      salvarLancamentoFinal(duplicateModal.pendingLancamento);
    }
    setDuplicateModal({
      isOpen: false,
      categoriaLabel: '',
      valorFormatado: '',
      pendingLancamento: null,
    });
  };

  /*
   * Cancelar e manter formulário aberto para revisão/correção
   */
  const handleCancelDuplicate = () => {
    setDuplicateModal({
      isOpen: false,
      categoriaLabel: '',
      valorFormatado: '',
      pendingLancamento: null,
    });
  };

  /*
   * Exclui lançamento com confirmação no banco de dados Supabase antes de remover da tela.
   */
  const handleDeleteLancamento = async (
    id: string
  ) => {
    if (deletingId) return;

    setDeletingId(id);
    setDeleteError(null);

    try {
      // 1. Executa a chamada assíncrona 'DELETE' no banco de dados do Supabase
      const res = await deleteLancamento(id, currentUser?.id);

      if (!res.success) {
        const errMsg = res.error || 'Erro de permissão ou regras de segurança (RLS) ao excluir no Supabase.';
        setDeleteError(errMsg);
        alert(`Não foi possível excluir o lançamento:\n${errMsg}`);
        return;
      }

      // 2. Confirmação garantida no banco de dados ANTES de atualizar a lista da tela
      setFechamento((prev) => ({
        ...prev,
        lancamentos:
          Array.isArray(prev.lancamentos)
            ? prev.lancamentos.filter(
                (l) => l.id !== id
              )
            : [],
      }));
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err);
      const errMsg = err?.message || 'Falha inesperada ao tentar excluir o lançamento.';
      setDeleteError(errMsg);
      alert(`Erro ao excluir lançamento: ${errMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * Busca e filtros.
   */
  const normalizedSearch =
    searchTerm
      .trim()
      .toLowerCase();

  const filteredLancamentos =
    lancamentos.filter((l) => {
      const descricao =
        String(l.descricao || '');

      const nomePessoa =
        String(l.nomePessoa || '');

      const categoriaLancamento =
        String(l.categoria || '');

      const matchesSearch =
        normalizedSearch === '' ||
        descricao
          .toLowerCase()
          .includes(normalizedSearch) ||
        nomePessoa
          .toLowerCase()
          .includes(normalizedSearch) ||
        categoriaLancamento
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesFilter =
        filterTipo === 'todos' ||
        (
          filterTipo === 'entradas' &&
          l.tipo === 'entrada'
        ) ||
        (
          filterTipo === 'saidas' &&
          l.tipo === 'saida'
        ) ||
        (
          filterTipo === 'dizimos' &&
          l.categoria === 'dizimo'
        ) ||
        (
          filterTipo === 'ofertas' &&
          (
            l.categoria === 'oferta_culto' ||
            l.categoria === 'oferta_missoes' ||
            l.categoria === 'oferta_especial'
          )
        );

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  return (
    <div
      id="lancamentos-view-container"
      className="space-y-6 w-full"
    >
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
          FORMULÁRIO
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <PlusCircle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Lançamento de Dízimos, Ofertas,
                Doações e Saídas
              </h2>

              <p className="text-xs text-slate-400">
                Data e hora do registro geradas
                automaticamente pelo sistema.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-emerald-400 font-semibold">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Data Automática</span>
          </div>
        </div>

        {/* Data */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />

            <span>
              Registro da Transação:{' '}
              <strong className="text-slate-100">
                Data e Hora Automáticas
              </strong>
            </span>
          </div>

          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
            {new Date().toLocaleDateString(
              'pt-BR'
            )}{' '}
            (Hoje)
          </span>
        </div>

        <form
          onSubmit={handleAddLancamento}
          className="space-y-4"
        >
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() =>
                handleChangeTipo('entrada')
              }
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                tipo === 'entrada'
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Entrada</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleChangeTipo('saida')
              }
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                tipo === 'saida'
                  ? 'bg-rose-600/20 border-rose-500/50 text-rose-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
              <span>Saída</span>
            </button>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoria:
              </label>

              <select
                value={categoria}
                onChange={(e) =>
                  setCategoria(
                    e.target.value
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
              >
                {tipo === 'entrada'
                  ? categoriasEntrada.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )
                  : categoriasSaida.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
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
                  onChange={(e) =>
                    setValorStr(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                onChange={(e) =>
                  setFormaPagamento(
                    e.target.value as FormaPagamento
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
              >
                <option value="dinheiro">
                  Espécie (Dinheiro Físico)
                </option>

                <option value="pix">
                  PIX (Chave da Igreja)
                </option>

                <option value="cartao_debito">
                  Cartão de Débito
                </option>

                <option value="cartao_credito">
                  Cartão de Crédito
                </option>

                <option value="transferencia">
                  Transferência / Boleto
                </option>
              </select>
            </div>

            {/* Pessoa */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {tipo === 'entrada'
                  ? 'Nome do Dizimista (Opcional):'
                  : 'Favorecido / Credor:'}
              </label>

              <input
                type="text"
                value={nomePessoa}
                onChange={(e) =>
                  setNomePessoa(
                    e.target.value
                  )
                }
                placeholder={
                  tipo === 'entrada'
                    ? 'Ex: Irmão João Silva'
                    : 'Ex: Pr. Misael'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descrição / Observação do Lançamento:
            </label>

            <input
              type="text"
              value={descricao}
              onChange={(e) =>
                setDescricao(
                  e.target.value
                )
              }
              placeholder="Ex: Dízimo referente ao mês de Agosto ou Oferta voluntária..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Confirmar */}
          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Check className="w-4 h-4 text-slate-950" />

            <span>
              Confirmar Lançamento no Caixa do Culto
            </span>
          </button>
        </form>
      </div>

      {/* =========================================================
          FILTROS E LISTA
      ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
              placeholder="Buscar por dizimista, descrição ou categoria..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                id: 'todos',
                label: 'Todos',
              },
              {
                id: 'entradas',
                label: 'Entradas',
              },
              {
                id: 'dizimos',
                label: 'Dízimos',
              },
              {
                id: 'ofertas',
                label: 'Ofertas',
              },
              {
                id: 'saidas',
                label: 'Saídas',
              },
            ].map((filtro) => (
              <button
                type="button"
                key={filtro.id}
                onClick={() =>
                  setFilterTipo(
                    filtro.id
                  )
                }
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
            LISTAGEM / TABELA RESPONSIVA
        ====================================================== */}
        {/* Visualização em Cartões para Mobile */}
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

              return (
                <div
                  key={l.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
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

                  {l.descricao && (
                    <p className="text-xs text-slate-300">
                      {l.descricao}
                    </p>
                  )}

                  {l.nomePessoa && (
                    <div className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                      <User className="w-3 h-3 shrink-0" />
                      <span>{l.nomePessoa}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{l.data || 'Data não informada'}</span>
                      <span>•</span>
                      <span className="capitalize font-mono text-slate-400">
                        {String(forma).replace(/_/g, ' ')}
                      </span>
                    </div>

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
              );
            })
          )}
        </div>

        {/* Visualização em Tabela para Tablets e Desktops */}
        <div className="hidden md:block overflow-x-auto scroll-touch">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">
                  Tipo
                </th>

                <th className="p-3">
                  Data Registrada
                </th>

                <th className="p-3">
                  Categoria
                </th>

                <th className="p-3">
                  Descrição / Pessoa
                </th>

                <th className="p-3">
                  Forma Pagto
                </th>

                <th className="p-3 text-right">
                  Valor (R$)
                </th>

                <th className="p-3 text-center">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {filteredLancamentos.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-500 text-xs"
                  >
                    Nenhum lançamento encontrado
                    com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLancamentos.map(
                  (l) => {
                    const tipoLancamento =
                      l.tipo === 'saida'
                        ? 'saida'
                        : 'entrada';

                    const valor =
                      typeof l.valor ===
                      'number'
                        ? l.valor
                        : Number(l.valor) || 0;

                    const forma =
                      l.formaPagamento ||
                      'dinheiro';

                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Tipo */}
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              tipoLancamento ===
                              'entrada'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {tipoLancamento ===
                            'entrada'
                              ? 'Entrada'
                              : 'Saída'}
                          </span>
                        </td>

                        {/* Data */}
                        <td className="p-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                          {l.data ||
                            'Data não informada'}
                        </td>

                        {/* Categoria */}
                        <td className="p-3 font-semibold text-slate-200">
                          {getCategoryLabel(
                            l.categoria
                          )}
                        </td>

                        {/* Descrição */}
                        <td className="p-3">
                          <div className="font-medium text-slate-100">
                            {l.descricao ||
                              'Sem descrição'}
                          </div>

                          {l.nomePessoa && (
                            <div className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" />

                              <span>
                                {l.nomePessoa}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Forma */}
                        <td className="p-3 capitalize font-mono text-slate-400">
                          {String(forma).replace(
                            /_/g,
                            ' '
                          )}
                        </td>

                        {/* Valor */}
                        <td
                          className={`p-3 text-right font-bold font-mono text-sm ${
                            tipoLancamento ===
                            'entrada'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tipoLancamento ===
                          'entrada'
                            ? '+'
                            : '-'}{' '}
                          {formatCurrency(valor)}
                        </td>

                        {/* Ação */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteLancamento(
                                l.id
                              )
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
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

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