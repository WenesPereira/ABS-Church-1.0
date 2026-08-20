import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Copy, Printer, Loader2, AlertCircle, Church, Download, ArrowLeft, Coins, Crown, Lock, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FechamentoCulto, ActiveTab, User } from '../types';
import { generateChurchReport } from '../services/api';
import { isSubscriptionActive, getMercadoPagoSubscriptionUrl } from '../services/treasuryService';

interface RelatorioIAViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
  onNavigate?: (tab: ActiveTab) => void;
  onOpenPrintModal?: () => void;
  currentUser?: User | null;
  onOpenSubscriptionModal?: () => void;
}

export function sanitizeReportText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Exgressamos/gi, 'Expressamos')
    .replace(/Orientação Auditiva/gi, 'Orientação de Auditoria')
    .replace(/Orientacao Auditiva/gi, 'Orientação de Auditoria')
    .replace(/orientação auditiva/gi, 'orientação de auditoria')
    .replace(/orientacao auditiva/gi, 'orientação de auditoria')
    .replace(/inconsciência/gi, 'inconsistência')
    .replace(/inconsciencia/gi, 'inconsistência')
    .replace(/Inconsciência/gi, 'Inconsistência')
    .replace(/Inconsciencia/gi, 'Inconsistência');
}

export const RelatorioIAView: React.FC<RelatorioIAViewProps> = ({
  fechamento,
  setFechamento,
  onNavigate,
  onOpenPrintModal,
  currentUser,
  onOpenSubscriptionModal,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSubscribed = isSubscriptionActive(currentUser);

  const handleDownloadPdf = async () => {
    const element = document.getElementById('ai-report-content');
    if (!element) return;

    setIsGeneratingPdf(true);
    const originalWidth = element.style.width;
    try {
      element.style.width = '794px';
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1024,
        backgroundColor: '#020617',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 10; // 10mm margin
      const maxWidth = pdfWidth - margin * 2; // 190mm
      const maxHeight = pdfHeight - margin * 2; // 277mm

      let imgWidth = maxWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      const xOffset = (pdfWidth - imgWidth) / 2;

      pdf.addImage(imgData, 'JPEG', xOffset, margin, imgWidth, imgHeight);

      pdf.save(`Relatorio_IA_Tesouraria_${fechamento.data || 'culto'}.pdf`);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      window.print();
    } finally {
      element.style.width = originalWidth;
      setIsGeneratingPdf(false);
    }
  };

  const handleGerarRelatorio = async () => {
    if (!isSubscribed) {
      if (onOpenSubscriptionModal) {
        onOpenSubscriptionModal();
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rawReport = await generateChurchReport(fechamento);
      const report = sanitizeReportText(rawReport);
      setFechamento((prev) => ({
        ...prev,
        relatorioIA: report,
      }));
    } catch (err: any) {
      setError(err.message || 'Falha ao se comunicar com a IA para gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const currentReportText = sanitizeReportText(fechamento.relatorioIA || '');

  const handleCopy = () => {
    if (currentReportText) {
      navigator.clipboard.writeText(currentReportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="relatorio-ia-container" className="space-y-6 w-full">
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

          {onOpenPrintModal && (
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Imprimir Ata / Recibo</span>
            </button>
          )}
        </div>
      )}

      {/* Subscription Lock Warning if not subscribed */}
      {!isSubscribed && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Crown className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Recurso Exclusivo Pro
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                Desbloqueie a Análise Financeira por Inteligência Artificial
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Assine o plano mensal do Tesouraria Pro para gerar pareceres formais e análises detalhadas com IA.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <Crown className="w-4 h-4 fill-current" />
            <span>Assinar Plano Mensal</span>
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Relatório da Tesouraria com IA Gemini</h2>
            <p className="text-xs text-slate-400">
              Gerador automático de parecer e ata financeira formal para leitura no culto de membros ou envio pastoral.
            </p>
          </div>
        </div>

        <button
          onClick={handleGerarRelatorio}
          disabled={loading}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Analisando Caixa do Culto...</span>
            </>
          ) : !isSubscribed ? (
            <>
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Desbloquear com Pro</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span>{fechamento.relatorioIA ? 'Regerar Relatório IA' : 'Gerar Relatório Completo'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-500/50 p-4 rounded-2xl text-xs text-rose-300 flex items-center gap-3 max-w-5xl mx-auto w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Report Body */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-5xl mx-auto w-full min-h-[400px]">
        {fechamento.relatorioIA ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <Church className="w-4 h-4" />
                <span>Parecer Formal do Fechamento do Culto</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>Baixar PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            <div id="ai-report-content" className="prose prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-200 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              <ReactMarkdown>{currentReportText}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 space-y-3">
            <Sparkles className="w-12 h-12 text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Nenhum relatório gerado ainda para este culto</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Clique no botão "Gerar Relatório Completo" acima para que a inteligência artificial analise a distribuição de dízimos, ofertas, conferência de notas e crie uma ata completa para a igreja.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
