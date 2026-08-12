import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Copy, Printer, Loader2, AlertCircle, Church } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FechamentoCulto } from '../types';
import { generateChurchReport } from '../services/api';

interface RelatorioIAViewProps {
  fechamento: FechamentoCulto;
  setFechamento: React.Dispatch<React.SetStateAction<FechamentoCulto>>;
}

export const RelatorioIAView: React.FC<RelatorioIAViewProps> = ({ fechamento, setFechamento }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGerarRelatorio = async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await generateChurchReport(fechamento);
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

  const handleCopy = () => {
    if (fechamento.relatorioIA) {
      navigator.clipboard.writeText(fechamento.relatorioIA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="relatorio-ia-container" className="flex flex-col min-h-full bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
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
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <Church className="w-4 h-4" />
                <span>Parecer Formal do Fechamento do Culto</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-200">
              <ReactMarkdown>{fechamento.relatorioIA}</ReactMarkdown>
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
