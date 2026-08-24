import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Copy, Printer, Loader2, AlertCircle, Church, Download, ArrowLeft, Coins, Crown, Lock, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { FechamentoCulto, ActiveTab, User, ConfigIgreja } from '../types';
import { generateChurchReport } from '../services/api';
import { isSubscriptionActive, getMercadoPagoSubscriptionUrl } from '../services/treasuryService';

interface RelatorioIAViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
  onNavigate?: (tab: ActiveTab) => void;
  onOpenPrintModal?: () => void;
  currentUser?: User | null;
  onOpenSubscriptionModal?: () => void;
  config?: ConfigIgreja;
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
  config,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSubscribed = isSubscriptionActive(currentUser);

  const getValidSignerName = (value?: string, placeholder?: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (placeholder && trimmed.toLowerCase() === placeholder.toLowerCase()) return '';
    return trimmed;
  };

  const churchName = config?.nomeIgreja || fechamento.nomeIgreja || currentUser?.nomeIgreja || 'ABS CHURCH';
  const cnpjNumber = config?.cnpj;
  const pastorPresidenteAssinatura = getValidSignerName(fechamento.pastorPresidente || config?.pastorPresidente, 'Pastor Presidente');
  const tesoureiroAssinatura = getValidSignerName(fechamento.tesoureiro || config?.tesoureiroPadrao, 'Tesoureiro Principal');
  const pastorLocalAssinatura = getValidSignerName(fechamento.pastorLocal || config?.pastorLocal, 'Pastor Local');

  const handleDownloadPdf = async () => {
    const element = document.getElementById('ai-report-printable-card');
    if (!element) return;

    setIsGeneratingPdf(true);
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    const originalMaxWidth = element.style.maxWidth;
    const originalBoxSizing = element.style.boxSizing;

    try {
      element.style.width = '794px';
      element.style.minWidth = '794px';
      element.style.maxWidth = '794px';
      element.style.boxSizing = 'border-box';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1024,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          try {
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach((style) => {
              if (style.textContent && style.textContent.includes('oklch')) {
                style.textContent = style.textContent.replace(/oklch\([^)]+\)/gi, (match) => {
                  try {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 1;
                    tempCanvas.height = 1;
                    const ctx = tempCanvas.getContext('2d');
                    if (ctx) {
                      ctx.fillStyle = '#ffffff';
                      ctx.fillStyle = match;
                      ctx.fillRect(0, 0, 1, 1);
                      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
                      return a === 255
                        ? `rgb(${r}, ${g}, ${b})`
                        : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
                    }
                  } catch {
                    // ignore
                  }
                  return '#000000';
                });
              }
            });
          } catch (e) {
            console.warn('Sanitizing oklch warning:', e);
          }
        },
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

      if (imgHeight <= maxHeight) {
        const xOffset = (pdfWidth - imgWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, margin, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;
        const xOffset = (pdfWidth - imgWidth) / 2;

        pdf.addImage(imgData, 'JPEG', xOffset, position, imgWidth, imgHeight);
        heightLeft -= maxHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', xOffset, position, imgWidth, imgHeight);
          heightLeft -= maxHeight;
        }
      }

      const dataFormatted = fechamento.data
        ? fechamento.data
        : new Date().toISOString().split('T')[0];

      pdf.save(`Relatorio_IA_Tesouraria_${dataFormatted}.pdf`);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      window.print();
    } finally {
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.boxSizing = originalBoxSizing;
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
      const rawReport = await generateChurchReport({
        ...fechamento,
        nomeIgreja: churchName,
      });
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
    <div id="relatorio-ia-container" className="space-y-6 w-full print:p-0 print:m-0">
      {/* Barra de Navegação Contextual (Não impressa) */}
      {onNavigate && (
        <div className="print:hidden flex items-center justify-between gap-3 max-w-5xl mx-auto w-full">
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

      {/* Subscription Lock Warning if not subscribed (Não impresso) */}
      {!isSubscribed && (
        <div className="print:hidden bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full">
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

      {/* Banner de Ação (Não impresso) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto w-full">
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
        <div className="print:hidden bg-rose-950/50 border border-rose-500/50 p-4 rounded-2xl text-xs text-rose-300 flex items-center gap-3 max-w-5xl mx-auto w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Report Body */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl max-w-5xl mx-auto w-full min-h-[400px] print:bg-transparent print:border-none print:shadow-none print:p-0">
        {fechamento.relatorioIA ? (
          <div className="space-y-6">
            {/* Header com botões de ação na tela (Não impresso) */}
            <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
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

            {/* DOCUMENTO FORMAL UNIFORMIZADO PARA TELA, IMPRESSÃO E PDF */}
            <div
              id="ai-report-printable-card"
              className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl space-y-6 text-xs font-sans border border-slate-300 shadow-inner w-full max-w-full box-border print:p-2 print:border-none print:shadow-none print:rounded-none"
            >
              {/* 1. CABEÇALHO CENTRALIZADO */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1.5 print-avoid-break">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900">
                  {churchName}
                </h2>
                {cnpjNumber && (
                  <p className="text-[10px] text-slate-600 font-mono tracking-normal">
                    CNPJ: {cnpjNumber}
                  </p>
                )}
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide pt-0.5">
                  RELATÓRIO OFICIAL DA TESOURARIA — PARECER DE AUDITORIA COM IA
                </p>
                <p className="text-[11px] font-medium text-slate-600">
                  <strong>Período:</strong>{' '}
                  {fechamento.dataInicio ? new Date(fechamento.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : ''}{' '}
                  a {fechamento.dataFim || fechamento.data ? new Date((fechamento.dataFim || fechamento.data) + 'T00:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                  {fechamento.qtdMembros ? ` • Membros Presentes: ${fechamento.qtdMembros}` : ''}
                </p>
              </div>

              {/* 2. CONTEÚDO DO PARECER DA IA (Markdown formatado para leitura oficial) */}
              <div id="ai-report-content" className="prose prose-slate max-w-none text-xs md:text-sm leading-relaxed text-slate-800 space-y-4">
                <ReactMarkdown>{currentReportText}</ReactMarkdown>
              </div>

              {/* 3. ASSINATURAS EXCLUSIVAMENTE NO FINAL DO RELATÓRIO (RODAPÉ) */}
              <div className="pt-14 pb-2 border-t border-slate-300 print-avoid-break mt-8">
                <div className={`grid gap-8 text-center text-[10px] ${
                  pastorPresidenteAssinatura && pastorLocalAssinatura && pastorPresidenteAssinatura !== pastorLocalAssinatura
                    ? 'grid-cols-3'
                    : 'grid-cols-2'
                }`}>
                  <div>
                    <div className="border-t-2 border-slate-800 pt-1.5 font-bold min-h-[1.6rem] text-slate-900 text-xs">
                      {tesoureiroAssinatura || 'Tesoureiro'}
                    </div>
                    <p className="text-slate-700 font-semibold uppercase tracking-wider text-[9px]">Tesoureiro Responsável</p>
                  </div>

                  {pastorPresidenteAssinatura && pastorLocalAssinatura && pastorPresidenteAssinatura !== pastorLocalAssinatura ? (
                    <>
                      <div>
                        <div className="border-t-2 border-slate-800 pt-1.5 font-bold min-h-[1.6rem] text-slate-900 text-xs">
                          {pastorLocalAssinatura}
                        </div>
                        <p className="text-slate-700 font-semibold uppercase tracking-wider text-[9px]">Pastor Local / Titular</p>
                      </div>
                      <div>
                        <div className="border-t-2 border-slate-800 pt-1.5 font-bold min-h-[1.6rem] text-slate-900 text-xs">
                          {pastorPresidenteAssinatura}
                        </div>
                        <p className="text-slate-700 font-semibold uppercase tracking-wider text-[9px]">Pastor Presidente</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="border-t-2 border-slate-800 pt-1.5 font-bold min-h-[1.6rem] text-slate-900 text-xs">
                        {pastorLocalAssinatura || pastorPresidenteAssinatura || 'Pastor Responsável'}
                      </div>
                      <p className="text-slate-700 font-semibold uppercase tracking-wider text-[9px]">
                        {pastorPresidenteAssinatura && !pastorLocalAssinatura ? 'Pastor Presidente' : 'Pastor Responsável'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 pt-3 border-t border-slate-200">
                Documento e Parecer emitidos pelo Sistema Oficial de Tesouraria em {new Date().toLocaleString('pt-BR')}
              </div>
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

