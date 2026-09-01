import React, { useState, useMemo } from 'react';
import { Lancamento, ConfigIgreja, Contributor } from '../types';
import {
  buildOfficialWhatsAppReceiptMessage,
  getWhatsAppShareUrl,
  formatReceiptDisplay,
  formatReceiptNumberDigits,
  formatPhoneDisplay,
  formatDateBR,
} from '../utils/receiptHelper';
import {
  Search,
  Receipt,
  Printer,
  Copy,
  Check,
  X,
  MessageCircle,
  ExternalLink,
  Calendar,
  Filter,
  User,
  Sparkles,
} from 'lucide-react';
import { SingleReceiptModal } from './SingleReceiptModal';

interface ReceiptsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamentos: Lancamento[];
  config: ConfigIgreja;
  pastorName?: string;
  tesoureiroName?: string;
}

export function ReceiptsSearchModal({
  isOpen,
  onClose,
  lancamentos,
  config,
  pastorName,
  tesoureiroName,
}: ReceiptsSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLancamentoForPrint, setSelectedLancamentoForPrint] = useState<Lancamento | null>(null);

  // Filtra apenas lançamentos de entrada e ordena de forma decrescente (mais recente ao mais antigo)
  const entriesWithReceipts = useMemo(() => {
    const list = lancamentos.filter((l) => {
      const isEntrada =
        l.tipo === 'entrada' ||
        String(l.tipo).toLowerCase().includes('entrada') ||
        String(l.tipo).toLowerCase().includes('dizimo') ||
        String(l.tipo).toLowerCase().includes('oferta');
      return isEntrada;
    });

    // Ordenação decrescente: maior número de recibo e data mais recente primeiro
    return [...list].sort((a, b) => {
      const numA = parseInt(String(a.receiptNumber || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.receiptNumber || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) {
        return numB - numA;
      }
      const dateA = a.data ? new Date(a.data).getTime() : 0;
      const dateB = b.data ? new Date(b.data).getTime() : 0;
      return dateB - dateA;
    });
  }, [lancamentos]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return entriesWithReceipts;

    return entriesWithReceipts.filter((l) => {
      const name = (l.contributorName || l.nomePessoa || '').toLowerCase();
      const phone = (l.contributorPhone || '').toLowerCase();
      const num = (l.receiptNumber || '').toLowerCase();
      const desc = (l.descricao || '').toLowerCase();
      const cat = (l.categoria || '').toLowerCase();

      return (
        name.includes(term) ||
        phone.includes(term) ||
        num.includes(term) ||
        desc.includes(term) ||
        cat.includes(term)
      );
    });
  }, [entriesWithReceipts, searchTerm]);

  if (!isOpen) return null;

  const handleCopyMessage = async (l: Lancamento) => {
    const msg = buildOfficialWhatsAppReceiptMessage({
      receiptNumber: formatReceiptNumberDigits(l.receiptNumber || '000001'),
      churchName: config.nomeIgreja || 'ABS CHURCH',
      contributorName: l.contributorName || l.nomePessoa || 'Contribuinte',
    });

    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(l.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Consulta e Reemissão de Recibos</span>
                  <span className="text-xs font-mono font-normal bg-slate-800 text-amber-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                    {entriesWithReceipts.length} recibos
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Localize recibos de dízimos e ofertas emitidos para envio via WhatsApp ou reimpressão
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o número do recibo (ex: 000102), nome do dizimista ou telefone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>

          {/* Lista de Recibos */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                <Receipt className="w-8 h-8 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-400">Nenhum recibo encontrado</p>
                <p>Verifique o termo pesquisado ou faça novos lançamentos de entradas.</p>
              </div>
            ) : (
              filtered.map((l) => {
                const receiptNum = formatReceiptDisplay(l.receiptNumber || '000001');
                const contributor = l.contributorName || l.nomePessoa || 'Contribuinte Não Identificado';
                const valorFormatted = Number(l.valor || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                });
                const msg = buildOfficialWhatsAppReceiptMessage({
                  receiptNumber: formatReceiptNumberDigits(l.receiptNumber || '000001'),
                  churchName: config.nomeIgreja || 'ABS CHURCH',
                  contributorName: contributor,
                });
                const waUrl = getWhatsAppShareUrl(l.contributorPhone, msg);

                return (
                  <div
                    key={l.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs rounded-lg">
                            {receiptNum}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 capitalize">
                            {l.categoria === 'dizimo' ? 'Dízimo' : l.categoria.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            • {formatDateBR(l.data)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-slate-100 text-sm">{contributor}</span>
                          {l.contributorPhone && (
                            <span className="text-xs text-emerald-400 font-mono">
                              ({formatPhoneDisplay(l.contributorPhone)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Valor Contribuído
                        </span>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          {valorFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Ações Rápidas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                      <span className="text-[11px] text-slate-400 capitalize font-mono">
                        Pagamento: <strong className="text-slate-200">{l.formaPagamento}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Enviar WhatsApp */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Reenviar WhatsApp</span>
                        </a>

                        {/* Imprimir */}
                        <button
                          type="button"
                          onClick={() => setSelectedLancamentoForPrint(l)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Imprimir</span>
                        </button>

                        {/* Copiar Texto */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(l)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
                          title="Copiar Mensagem"
                        >
                          {copiedId === l.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Impressão Individual se clicado */}
      {selectedLancamentoForPrint && (
        <SingleReceiptModal
          isOpen={Boolean(selectedLancamentoForPrint)}
          onClose={() => setSelectedLancamentoForPrint(null)}
          lancamento={selectedLancamentoForPrint}
          config={config}
          pastorName={pastorName}
          tesoureiroName={tesoureiroName}
        />
      )}
    </>
  );
}
