import React, { useState, useRef } from 'react';
import { Lancamento, ConfigIgreja } from '../types';
import {
  getWhatsAppShareUrl,
  formatReceiptDisplay,
  formatReceiptNumberDigits,
  formatPhoneDisplay,
  formatDateBR,
  buildOfficialWhatsAppReceiptMessage,
} from '../utils/receiptHelper';
import { downloadOrShareReceiptPdf } from '../services/receiptPdfService';
import { generateAndShareReceipt } from '../services/receiptImageService';
import {
  CheckCircle2,
  Download,
  Copy,
  Check,
  X,
  MessageCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Printer,
  Church,
} from 'lucide-react';

interface ReceiptSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  config: ConfigIgreja;
  churchId?: string;
  pastorName?: string;
  tesoureiroName?: string;
  onPrintReceipt?: (lancamento: Lancamento) => void;
  onNewLancamento?: () => void;
}

export function ReceiptSuccessModal({
  isOpen,
  onClose,
  lancamento,
  config,
  pastorName,
  tesoureiroName,
  onPrintReceipt,
  onNewLancamento,
}: ReceiptSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const receiptCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !lancamento) return null;

  const receiptDigits = formatReceiptNumberDigits(lancamento.receiptNumber);
  const receiptDisplay = formatReceiptDisplay(lancamento.receiptNumber);
  const churchName = config.nomeIgreja || 'ABS CHURCH';
  const contributorName = lancamento.contributorName || lancamento.nomePessoa || 'Contribuinte';
  const phone = lancamento.contributorPhone;
  const valor = lancamento.valor || 0;
  const dataOperacao = lancamento.data || new Date().toISOString().split('T')[0];

  const formattedValor = valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // Mensagem 100% limpa, sem URLs de storage
  const activeWhatsAppMessage = buildOfficialWhatsAppReceiptMessage({
    receiptNumber: receiptDigits,
    churchName,
    contributorName,
  });

  const whatsappUrl = getWhatsAppShareUrl(phone, activeWhatsAppMessage);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(activeWhatsAppMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = activeWhatsAppMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptCardRef.current || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      await generateAndShareReceipt({
        element: receiptCardRef.current,
        receiptNumber: receiptDigits,
        churchName: churchName,
        contributorName: contributorName,
        backgroundColor: '#090d16',
      });
    } catch (err) {
      console.error('Erro ao gerar recibo:', err);
      try {
        await downloadOrShareReceiptPdf({
          lancamento,
          config,
          pastorName,
          tesoureiroName,
        });
      } catch (pdfErr) {
        console.error('Erro no fallback do recibo:', pdfErr);
        alert('Não foi possível gerar o recibo. Tente novamente ou use o envio por WhatsApp.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleConcluir = () => {
    onClose();
    if (onNewLancamento) {
      onNewLancamento();
    }
  };

  const resolvedPastor = pastorName || config.pastorPresidente || 'Pastor Responsável';
  const resolvedTesoureiro = tesoureiroName || config.tesoureiroPadrao || 'Tesouraria Oficial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-slate-100 max-h-[95vh] overflow-y-auto">
        {/* Botão Fechar X */}
        <button
          onClick={handleConcluir}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Concluir e fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone e Cabeçalho de Sucesso */}
        <div className="text-center space-y-1 pt-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Lançamento Gravado com Sucesso!
          </h3>
          <p className="text-xs text-slate-400">
            Recibo oficial Nº <span className="text-amber-400 font-mono font-bold">{receiptDisplay}</span> emitido
          </p>
        </div>

        {/* CARTÃO VISUAL DO RECIBO */}
        <div className="p-1 bg-gradient-to-b from-amber-500/20 via-emerald-500/15 to-slate-950 rounded-2xl">
          <div
            ref={receiptCardRef}
            id="receipt-official-card"
            className="bg-[#090d16] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 text-slate-100 shadow-xl"
            style={{ fontFamily: 'sans-serif' }}
          >
            {/* Topo do Recibo com Brasão / Nome da Igreja */}
            <div className="text-center pb-3 border-b border-dashed border-slate-700/80 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Church className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-white uppercase tracking-tight">
                  {churchName}
                </h4>
              </div>
              {config.cnpj && (
                <p className="text-[10px] text-slate-400 font-mono">CNPJ: {config.cnpj}</p>
              )}
              {config.cidadeUF && (
                <p className="text-[10px] text-slate-400">{config.cidadeUF}</p>
              )}
              <div className="pt-1.5 flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 font-mono font-bold text-xs text-amber-300 rounded-full shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  RECIBO OFICIAL Nº {receiptDisplay}
                </span>
              </div>
            </div>

            {/* Dados do Contribuinte e Transação */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 font-medium">Contribuinte:</span>
                <span className="font-bold text-white text-right truncate max-w-[240px]">
                  {contributorName}
                </span>
              </div>

              {phone && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {formatPhoneDisplay(phone)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Finalidade / Tipo:</span>
                <span className="font-semibold text-amber-300 uppercase">
                  {lancamento.categoria === 'dizimo' ? 'Dízimo' : lancamento.categoria.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Forma de Pagamento:</span>
                <span className="font-medium text-slate-200 uppercase">
                  {lancamento.formaPagamento}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Data da Operação:</span>
                <span className="font-mono text-slate-300">{formatDateBR(dataOperacao)}</span>
              </div>

              {/* Destaque do Valor */}
              <div className="pt-2.5 mt-2 border-t border-slate-800 flex justify-between items-center bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Valor Total:
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {formattedValor}
                </span>
              </div>
            </div>

            {/* Mensagem Bíblica */}
            <div className="pt-1 text-center text-[10px] text-slate-400 italic space-y-0.5 border-t border-slate-800/80">
              <p className="font-medium text-slate-300">
                "Agradecemos a sua fidelidade e contribuição com a obra do Senhor!"
              </p>
              <p className="text-[9px] text-slate-500">
                "Cada um contribua segundo propôs no seu coração..." (2 Co 9:7)
              </p>
            </div>

            {/* Assinaturas */}
            <div className="pt-3 border-t border-dashed border-slate-700/80 grid grid-cols-2 gap-3 text-center text-[9px] text-slate-400">
              <div>
                <div className="border-t border-slate-700 pt-1 mt-2">
                  <p className="font-semibold text-slate-200 truncate">{resolvedPastor}</p>
                  <p className="text-[8px] text-slate-500 uppercase">Pastor</p>
                </div>
              </div>
              <div>
                <div className="border-t border-slate-700 pt-1 mt-2">
                  <p className="font-semibold text-slate-200 truncate">{resolvedTesoureiro}</p>
                  <p className="text-[8px] text-slate-500 uppercase">Tesouraria</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO: 'Enviar via WhatsApp', 'Gerar Recibo (PDF)' e 'Concluir' */}
        <div className="space-y-2.5 pt-1">
          {/* 1. Botão Enviar via WhatsApp */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Enviar via WhatsApp</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 2. Botão Gerar Recibo (PDF) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-3 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Gerar Recibo (PDF)</span>
                </>
              )}
            </button>

            {/* 3. Botão Concluir */}
            <button
              type="button"
              onClick={handleConcluir}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Concluir</span>
            </button>
          </div>

          {/* Opções secundárias: Copiar texto da mensagem ou Imprimir Cupom */}
          <div className="flex items-center justify-center gap-4 pt-1 text-xs text-slate-400">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            {onPrintReceipt && (
              <>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPrintReceipt(lancamento);
                  }}
                  className="hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Imprimir Recibo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
