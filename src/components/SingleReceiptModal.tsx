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
import {
  downloadOrShareReceiptPdf,
} from '../services/receiptPdfService';
import {
  generateAndShareReceipt,
} from '../services/receiptImageService';
import {
  Printer,
  Copy,
  Check,
  X,
  MessageCircle,
  ExternalLink,
  ScrollText,
  Download,
  Loader2,
} from 'lucide-react';

interface SingleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  config: ConfigIgreja;
  pastorName?: string;
  tesoureiroName?: string;
}

export function SingleReceiptModal({
  isOpen,
  onClose,
  lancamento,
  config,
  pastorName,
  tesoureiroName,
}: SingleReceiptModalProps) {
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('thermal');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !lancamento) return null;

  const receiptNum = formatReceiptDisplay(lancamento.receiptNumber || '000001');
  const receiptDigits = formatReceiptNumberDigits(lancamento.receiptNumber);
  const churchName = config.nomeIgreja || 'ABS CHURCH';
  const contributorName = lancamento.contributorName || lancamento.nomePessoa || 'Contribuinte';
  const phone = lancamento.contributorPhone;
  const valor = lancamento.valor || 0;
  const data = lancamento.data || new Date().toISOString().split('T')[0];

  const formattedValor = valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const message = buildOfficialWhatsAppReceiptMessage({
    receiptNumber: receiptDigits,
    churchName,
    contributorName,
  });

  const whatsappUrl = getWhatsAppShareUrl(phone, message);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      await generateAndShareReceipt({
        element: printRef.current,
        receiptNumber: receiptDigits,
        churchName: churchName,
        contributorName: contributorName,
        backgroundColor: '#ffffff',
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
        alert("Não foi possível gerar o recibo diretamente. Você também pode usar a opção 'Enviar via WhatsApp'.");
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 text-slate-100 max-h-[95vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Recibo Individual de Contribuição
              </h3>
              <p className="text-xs text-slate-400">
                Nº Sequencial: <span className="text-amber-400 font-mono font-bold">{receiptNum}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Formato */}
            <div className="hidden sm:flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  printMode === 'thermal'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cupom Térmico (80mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('a4')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  printMode === 'a4'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Recibo A4
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO (Folha Branca / Estilo Cupom Térmico ou A4) */}
        <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800 flex justify-center">
          <div
            ref={printRef}
            id="print-single-receipt-area"
            className={`bg-white text-black p-5 sm:p-6 rounded-lg shadow-lg font-sans transition-all ${
              printMode === 'thermal'
                ? 'w-full max-w-[340px] text-xs leading-tight'
                : 'w-full max-w-lg text-sm leading-normal border border-gray-300'
            }`}
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Cabeçalho da Igreja */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400 space-y-1">
              <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-tight">
                {churchName}
              </h4>
              {config.cnpj && <p className="text-[10px] text-gray-700">CNPJ: {config.cnpj}</p>}
              {config.cidadeUF && <p className="text-[10px] text-gray-700">{config.cidadeUF}</p>}
              <div className="pt-1">
                <span className="inline-block px-2 py-0.5 bg-gray-200 font-mono font-bold text-xs rounded border border-gray-400">
                  RECIBO Nº {receiptNum}
                </span>
              </div>
            </div>

            {/* Corpo do Recibo */}
            <div className="py-3 space-y-2 border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Contribuinte:</span>
                <span className="font-bold text-right">{contributorName}</span>
              </div>

              {phone && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-600">WhatsApp:</span>
                  <span className="font-mono">{formatPhoneDisplay(phone)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Finalidade / Tipo:</span>
                <span className="font-bold uppercase">
                  {lancamento.categoria === 'dizimo' ? 'DÍZIMO' : lancamento.categoria.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Forma de Pagamento:</span>
                <span className="font-semibold uppercase">{lancamento.formaPagamento}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Data da Operação:</span>
                <span className="font-mono">{formatDateBR(data)}</span>
              </div>

              <div className="pt-2 flex justify-between items-center text-sm sm:text-base font-extrabold border-t border-gray-200">
                <span>VALOR TOTAL:</span>
                <span className="text-base sm:text-lg font-mono">{formattedValor}</span>
              </div>
            </div>

            {/* Mensagem Eclesiástica */}
            <div className="pt-3 pb-2 text-center text-[10px] sm:text-xs text-gray-700 italic space-y-1">
              <p className="font-medium">
                "Agradecemos a sua fidelidade e contribuição com a obra do Senhor!"
              </p>
              <p className="text-[9px] text-gray-500">
                "Cada um contribua segundo propôs no seu coração..." (2 Co 9:7)
              </p>
            </div>

            {/* Assinaturas */}
            <div className="pt-4 border-t border-dashed border-gray-400 grid grid-cols-2 gap-2 text-center text-[9px] text-gray-700">
              <div>
                <div className="border-t border-gray-400 pt-1 mt-4">
                  <p className="font-semibold truncate">{pastorName || config.pastorPresidente || 'Pastor Responsável'}</p>
                  <p className="text-[8px] text-gray-500">Pastor</p>
                </div>
              </div>
              <div>
                <div className="border-t border-gray-400 pt-1 mt-4">
                  <p className="font-semibold truncate">{tesoureiroName || config.tesoureiroPadrao || 'Tesouraria'}</p>
                  <p className="text-[8px] text-gray-500">Tesouraria</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação: WhatsApp, Gerar Recibo (PDF) e Imprimir */}
        <div className="space-y-3 pt-2">
          {/* Enviar WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Enviar via WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Gerar Recibo (PDF) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
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

            {/* Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Imprimir</span>
            </button>
          </div>

          {/* Opção secundária: Copiar Texto da Mensagem */}
          <div className="flex items-center justify-center pt-1 text-xs text-slate-400">
            <button
              type="button"
              onClick={handleCopy}
              className="hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Texto Copiado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto da Mensagem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
