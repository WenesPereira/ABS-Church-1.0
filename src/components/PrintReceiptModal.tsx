import React from 'react';
import { Printer, X, Church, CheckCircle, FileText, Check, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FechamentoCulto, ConfigIgreja, CategoriaEntrada } from '../types';
import {
  formatCurrency,
  calcularResumoLancamentos,
  calcularTotalContagem,
  ALL_ENTRADA_CATEGORIES,
  CATEGORIA_ENTRADA_LABELS,
} from '../utils/calculations';

interface PrintReceiptModalProps {
  fechamento: FechamentoCulto;
  config: ConfigIgreja;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ fechamento, config, onClose }) => {
  const [exibirDizimistas, setExibirDizimistas] = React.useState<boolean>(true);
  const [aplicarRepasse, setAplicarRepasse] = React.useState<boolean>(fechamento.aplicarRepasseMatriz ?? true);
  const [aplicarPrebenda, setAplicarPrebenda] = React.useState<boolean>(fechamento.aplicarPrebenda ?? false);
  const [tipoBase, setTipoBase] = React.useState<'todas' | 'selecionadas'>(fechamento.tipoBaseRepasseMatriz || 'todas');
  const [catsRepasse, setCatsRepasse] = React.useState<CategoriaEntrada[]>(
    fechamento.categoriasRepasseMatriz || ALL_ENTRADA_CATEGORIES
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState<boolean>(false);

  const porcentagemPrebenda = fechamento.porcentagemPrebenda ?? config.porcentagemPrebenda ?? 0;
  const porcentagemMatriz = fechamento.porcentagemMatriz ?? config.porcentagemMatriz ?? 20;

  const resumo = calcularResumoLancamentos(
    fechamento.lancamentos, 
    porcentagemMatriz,
    aplicarRepasse,
    tipoBase,
    catsRepasse,
    porcentagemPrebenda,
    aplicarPrebenda
  );
  const totalContagem = calcularTotalContagem(fechamento.contagemDinheiro);
  const diferenca = totalContagem - resumo.totalDinheiro;

  const handleToggleCategoria = (cat: CategoriaEntrada) => {
    if (catsRepasse.includes(cat)) {
      const updated = catsRepasse.filter((c) => c !== cat);
      setCatsRepasse(updated);
      setTipoBase('selecionadas');
    } else {
      const updated = [...catsRepasse, cat];
      setCatsRepasse(updated);
      if (updated.length === ALL_ENTRADA_CATEGORIES.length) {
        setTipoBase('todas');
      } else {
        setTipoBase('selecionadas');
      }
    }
  };

  const handleSelectTodaEntrada = () => {
    setTipoBase('todas');
    setCatsRepasse(ALL_ENTRADA_CATEGORIES);
  };

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      dizimo: 'Dízimo do Membro',
      oferta_culto: 'Oferta do Culto',
      oferta_missoes: 'Oferta de Missões',
      oferta_especial: 'Oferta Especial',
      doacao: 'Doação Direta',
      agua: 'Conta de Água',
      luz: 'Conta de Luz',
      internet: 'Conta de Internet',
      alimentacao: 'Alimentação / Lanche',
      aluguel: 'Aluguel do Templo',
      manutencao: 'Manutenção / Limpeza',
      material_ebd: 'Material EBD',
      acao_social: 'Ação Social',
      outros: 'Outros',
    };
    return labels[cat] || cat.replace(/_/g, ' ');
  };

  const getValidSignerName = (value?: string, placeholder?: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (placeholder && trimmed.toLowerCase() === placeholder.toLowerCase()) return '';
    return trimmed;
  };

  const pastorPresidenteAssinatura = getValidSignerName(fechamento.pastorPresidente || config.pastorPresidente, 'Pastor Presidente');
  const tesoureiroAssinatura = getValidSignerName(fechamento.tesoureiro || config.tesoureiroPadrao, 'Tesoureiro Principal');
  const pastorLocalAssinatura = getValidSignerName(fechamento.pastorLocal || config.pastorLocal, 'Pastor Local');

  const saidaLancamentos = fechamento.lancamentos.filter((l) => l.tipo === 'saida');
  const dizimoLancamentos = fechamento.lancamentos.filter((l) => l.tipo === 'entrada' && l.categoria === 'dizimo');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-receipt');
    if (!element) return;

    setIsGeneratingPdf(true);

    // Save original styles for restoration
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalMinWidth = element.style.minWidth;

    try {
      // Force fixed A4 pixel width (210mm equivalent at 96dpi) during capture
      element.style.width = '794px';
      element.style.minWidth = '794px';
      element.style.maxWidth = '794px';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1024,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 8; // 8mm margin
      const maxWidth = pdfWidth - margin * 2; // 194mm
      const maxHeight = pdfHeight - margin * 2; // 281mm

      // Calculate dimensions so it fits on 1 SINGLE A4 page without spilling over
      let imgWidth = maxWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      const xOffset = (pdfWidth - imgWidth) / 2;

      pdf.addImage(imgData, 'JPEG', xOffset, margin, imgWidth, imgHeight);

      const dataFormatted = fechamento.data
        ? fechamento.data
        : new Date().toISOString().split('T')[0];

      pdf.save(`Relatorio_Tesouraria_${dataFormatted}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF com html2canvas e jsPDF:', err);
      window.print();
    } finally {
      // Restore original responsiveness
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      element.style.maxWidth = originalMaxWidth;
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-4 md:p-6 flex justify-center items-start scroll-touch">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-6 shadow-2xl relative text-slate-100 my-4 sm:my-8">
        {/* Modal Header Actions (Not Printed) */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Printer className="w-4 h-4" />
            <span>Comprovante Oficial para Impressão e Arquivo</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors">
              <input
                type="checkbox"
                checked={aplicarRepasse}
                onChange={(e) => setAplicarRepasse(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <span>Repasse Matriz ({porcentagemMatriz}%)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors">
              <input
                type="checkbox"
                checked={aplicarPrebenda}
                onChange={(e) => setAplicarPrebenda(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <span>Prebenda Pastoral ({porcentagemPrebenda}%)</span>
            </label>

            {dizimoLancamentos.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors">
                <input
                  type="checkbox"
                  checked={exibirDizimistas}
                  onChange={(e) => setExibirDizimistas(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>Exibir nomes dos dizimistas</span>
              </label>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {aplicarRepasse && (
            <div className="w-full pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-purple-300">Composição do Repasse p/ Matriz:</span>
              <button
                type="button"
                onClick={handleSelectTodaEntrada}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                  tipoBase === 'todas'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                ★ Toda a Entrada
              </button>
              {ALL_ENTRADA_CATEGORIES.map((cat) => {
                const isSel = tipoBase === 'todas' || catsRepasse.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategoria(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-purple-950 text-purple-200 border-purple-500/80 shadow-sm'
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span>{isSel ? '✓' : '○'} {CATEGORIA_ENTRADA_LABELS[cat]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* PRINTABLE RECEIPT CONTENT (Styling optimized for both screen and paper) */}
        <div id="printable-receipt" className="bg-white text-slate-900 p-6 rounded-2xl space-y-6 text-xs font-sans border border-slate-300 shadow-inner">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h2 className="text-base font-black uppercase tracking-wide text-slate-900">
              {config.nomeIgreja || 'Igreja Evangélica'}
            </h2>
            {config.cnpj && <p className="text-[10px] text-slate-600 font-mono">CNPJ: {config.cnpj}</p>}
            <p className="text-[11px] font-semibold text-slate-700">
              ATA DE FECHAMENTO DE CAIXA DE CULTO — TESOURARIA
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-3 rounded-lg border border-slate-300 text-[11px]">
            <div>
              <p><strong>Registro:</strong> Fechamento de Caixa por Período</p>
              <p>
                <strong>Período:</strong>{' '}
                {fechamento.dataInicio ? new Date(fechamento.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : ''}{' '}
                a {fechamento.dataFim || fechamento.data ? new Date((fechamento.dataFim || fechamento.data) + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
              </p>
              {fechamento.qtdMembros ? <p><strong>Membros Presentes:</strong> {fechamento.qtdMembros}</p> : null}
            </div>
            <div>
              <p><strong>Pastor Presidente:</strong> {pastorPresidenteAssinatura || 'Não Informado'}</p>
              <p><strong>Tesoureiro:</strong> {tesoureiroAssinatura || 'Não Informado'}</p>
              <p><strong>Pastor Local:</strong> {pastorLocalAssinatura || 'Não Informado'}</p>
            </div>
          </div>

          {/* Summary Financial Table */}
          <div>
            <h3 className="font-bold text-[11px] uppercase border-b border-slate-400 pb-1 mb-2 text-slate-800">
              1. Resumo da Arrecadação e Despesas
            </h3>
            <table className="w-full text-left border-collapse text-[11px]">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1 font-semibold">Total de Dízimos Arrecadados:</td>
                  <td className="py-1 text-right font-mono font-bold text-emerald-700">{formatCurrency(resumo.totalDizimos)}</td>
                </tr>

                {exibirDizimistas && dizimoLancamentos.length > 0 && (
                  <tr className="border-b border-slate-300 bg-emerald-50/70">
                    <td colSpan={2} className="py-2 px-2">
                      <p className="font-bold text-emerald-900 text-[10px] uppercase mb-1 flex items-center justify-between">
                        <span>Relação e Nomes dos Dizimistas ({dizimoLancamentos.length}):</span>
                        <span className="font-mono text-emerald-800 font-bold">Total: {formatCurrency(resumo.totalDizimos)}</span>
                      </p>
                      <div className="space-y-1 divide-y divide-emerald-200/60">
                        {dizimoLancamentos.map((dizimo) => (
                          <div key={dizimo.id} className="pt-1 flex justify-between items-center text-[10px] text-emerald-950">
                            <span>
                              • <strong>{dizimo.nomePessoa || 'Dizimista Anônimo / Não Identificado'}</strong>
                              {dizimo.descricao && dizimo.descricao.toLowerCase() !== 'dízimo' && dizimo.descricao.toLowerCase() !== 'dizimo' ? ` (${dizimo.descricao})` : ''}
                              <span className="text-[9px] text-slate-500 ml-1 font-mono">[{dizimo.formaPagamento.toUpperCase()}]</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-800 ml-2 shrink-0">{formatCurrency(dizimo.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                <tr className="border-b border-slate-200">
                  <td className="py-1">Total de Ofertas (Culto/Missões):</td>
                  <td className="py-1 text-right font-mono font-bold text-blue-700">{formatCurrency(resumo.totalOfertasCulto + resumo.totalOfertasMissoes)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1">Total Entradas (PIX/Banco):</td>
                  <td className="py-1 text-right font-mono text-slate-700">{formatCurrency(resumo.totalPix + resumo.totalTransferencia)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1">Total Entradas (Espécie/Dinheiro Físico):</td>
                  <td className="py-1 text-right font-mono text-slate-700">{formatCurrency(resumo.totalDinheiro)}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                  <td className="py-1.5">TOTAL BRUTO DE ENTRADAS:</td>
                  <td className="py-1.5 text-right font-mono text-emerald-800 text-xs">{formatCurrency(resumo.totalEntradas)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1 text-rose-700 font-semibold">(-) Total de Saídas / Despesas Efetivadas:</td>
                  <td className="py-1 text-right font-mono font-bold text-rose-700">-{formatCurrency(resumo.totalSaidas)}</td>
                </tr>

                {saidaLancamentos.length > 0 && (
                  <tr className="border-b border-slate-300 bg-rose-50/70">
                    <td colSpan={2} className="py-2 px-2">
                      <p className="font-bold text-rose-900 text-[10px] uppercase mb-1 flex items-center justify-between">
                        <span>Discriminação Detalhada das Saídas ({saidaLancamentos.length}):</span>
                        <span className="font-mono text-rose-700 font-bold">Total: -{formatCurrency(resumo.totalSaidas)}</span>
                      </p>
                      <div className="space-y-1 divide-y divide-rose-200/60">
                        {saidaLancamentos.map((saida) => (
                          <div key={saida.id} className="pt-1 flex justify-between items-center text-[10px] text-rose-950">
                            <span>
                              • <strong>{getCategoryLabel(saida.categoria)}</strong>
                              {saida.descricao ? ` — ${saida.descricao}` : ''}
                              {saida.nomePessoa ? ` (${saida.nomePessoa})` : ''}
                              <span className="text-[9px] text-slate-500 ml-1">[{saida.formaPagamento.toUpperCase()}]</span>
                            </span>
                            <span className="font-mono font-bold text-rose-800 ml-2 shrink-0">-{formatCurrency(saida.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                  <td className="py-1.5 px-1">SALDO LÍQUIDO OPERACIONAL (Entradas - Saídas):</td>
                  <td className="py-1.5 px-1 text-right font-mono text-sm text-slate-900">{formatCurrency(resumo.saldoLiquido)}</td>
                </tr>

                {resumo.aplicarRepasseMatriz && (
                  <tr className="border-t border-purple-200 bg-purple-50/70 font-semibold text-purple-950">
                    <td className="py-1.5 px-1">
                      <div>
                        (-) Repasse para a Matriz / Sede ({resumo.porcentagemMatriz}%):
                        <span className="block text-[9px] text-purple-800 font-normal">
                          Base: {tipoBase === 'todas' || catsRepasse.length === ALL_ENTRADA_CATEGORIES.length ? 'Toda a Entrada' : catsRepasse.map(c => CATEGORIA_ENTRADA_LABELS[c]).join(' + ')} ({formatCurrency(resumo.baseCalculoMatriz)})
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono font-bold text-purple-900">
                      -{formatCurrency(resumo.valorMatriz)}
                    </td>
                  </tr>
                )}

                {resumo.aplicarPrebenda && (
                  <tr className="border-t border-amber-200 bg-amber-50/70 font-semibold text-amber-950">
                    <td className="py-1.5 px-1">
                      <div>
                        (-) Prebenda Pastoral ({resumo.porcentagemPrebenda}%):
                        <span className="block text-[9px] text-amber-800 font-normal">
                          Beneficiário: {fechamento.pastorLocal || fechamento.pastorPresidente || 'Pastor Titular'} (Base: {formatCurrency(resumo.totalEntradas)})
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono font-bold text-amber-900">
                      -{formatCurrency(resumo.valorPrebenda)}
                    </td>
                  </tr>
                )}

                <tr className="bg-emerald-100 font-black border-t-2 border-slate-900 text-emerald-950">
                  <td className="py-2 px-1">
                    <div>
                      <span>SALDO DISPONÍVEL EM CAIXA LOCAL:</span>
                      <span className="block text-[9px] text-emerald-800 font-mono font-normal">
                        Fórmula: Entradas - Saídas {resumo.aplicarRepasseMatriz ? '- Repasse Matriz ' : ''}{resumo.aplicarPrebenda ? '- Prebenda Pastoral' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-right font-mono text-sm text-emerald-900">
                    {formatCurrency(resumo.saldoDisponivel)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Physical Cash Verification */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1 text-[10px]">
            <p className="font-bold uppercase text-slate-800">Conferência de Espécie na Mesa da Tesouraria:</p>
            <div className="flex justify-between font-mono">
              <span>Dinheiro Lançado: {formatCurrency(resumo.totalDinheiro)}</span>
              <span>Dinheiro Contado: {formatCurrency(totalContagem)}</span>
              <span>Diferença: {formatCurrency(diferenca)}</span>
            </div>
          </div>

          {/* Signatures Line */}
          <div className="pt-10 grid grid-cols-3 gap-4 text-center text-[10px] border-t border-slate-300">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold min-h-[1.4rem] text-slate-900">
                {pastorPresidenteAssinatura || ''}
              </div>
              <p className="text-slate-700 font-medium">Pastor Presidente</p>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold min-h-[1.4rem] text-slate-900">
                {tesoureiroAssinatura || ''}
              </div>
              <p className="text-slate-700 font-medium">Tesoureiro</p>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold min-h-[1.4rem] text-slate-900">
                {pastorLocalAssinatura || ''}
              </div>
              <p className="text-slate-700 font-medium">Pastor Local</p>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-200">
            Documento emitido pelo Sistema de Tesouraria em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Sticky/Fixed Modal Action Footer (Not Printed) */}
        <div className="print:hidden pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 font-medium text-center sm:text-left">
            Escolha como deseja obter o recibo oficial:
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>BAIXAR EM PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
