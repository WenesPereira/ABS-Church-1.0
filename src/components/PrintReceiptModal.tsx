import React from 'react';
import { Printer, X, Church, CheckCircle, FileText } from 'lucide-react';
import { FechamentoCulto, ConfigIgreja } from '../types';
import { formatCurrency, calcularResumoLancamentos, calcularTotalContagem } from '../utils/calculations';

interface PrintReceiptModalProps {
  fechamento: FechamentoCulto;
  config: ConfigIgreja;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ fechamento, config, onClose }) => {
  const [exibirDizimistas, setExibirDizimistas] = React.useState<boolean>(true);
  const [aplicarRepasse, setAplicarRepasse] = React.useState<boolean>(fechamento.aplicarRepasseMatriz ?? true);

  const resumo = calcularResumoLancamentos(
    fechamento.lancamentos, 
    fechamento.porcentagemMatriz ?? config.porcentagemMatriz ?? 20,
    aplicarRepasse
  );
  const totalContagem = calcularTotalContagem(fechamento.contagemDinheiro);
  const diferenca = totalContagem - resumo.totalDinheiro;

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

  const saidaLancamentos = fechamento.lancamentos.filter((l) => l.tipo === 'saida');
  const dizimoLancamentos = fechamento.lancamentos.filter((l) => l.tipo === 'entrada' && l.categoria === 'dizimo');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-slate-100 my-8">
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
              <span>Repasse p/ Matriz ({fechamento.porcentagemMatriz ?? config.porcentagemMatriz ?? 20}%)</span>
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
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
              <p><strong>Pastor Presidente:</strong> {fechamento.pastorPresidente || config.pastorPresidente || 'N/I'}</p>
              <p><strong>Tesoureiro:</strong> {fechamento.tesoureiro || config.tesoureiroPadrao || 'N/I'}</p>
              <p><strong>Pastor Local:</strong> {fechamento.pastorLocal || config.pastorLocal || 'N/I'}</p>
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
                <tr className="bg-amber-100 font-bold border-t-2 border-slate-900">
                  <td className="py-1.5 px-1">SALDO LÍQUIDO DO CULTO:</td>
                  <td className="py-1.5 px-1 text-right font-mono text-sm text-slate-900">{formatCurrency(resumo.saldoLiquido)}</td>
                </tr>
                {resumo.aplicarRepasseMatriz ? (
                  <>
                    <tr className="border-t border-purple-300 bg-purple-50 font-bold text-purple-950">
                      <td className="py-1.5 px-1">
                        (-) Repasse para a Matriz / Sede ({resumo.porcentagemMatriz}% das Entradas):
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-bold text-purple-900">
                        -{formatCurrency(resumo.valorMatriz)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-100 font-black border-t-2 border-slate-900 text-emerald-950">
                      <td className="py-2 px-1">SALDO REMANESCENTE DA CONGREGAÇÃO:</td>
                      <td className="py-2 px-1 text-right font-mono text-sm text-emerald-900">{formatCurrency(resumo.saldoCongregacao)}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="border-t border-slate-300 bg-slate-50 text-slate-600 font-semibold italic">
                      <td className="py-1 px-1">
                        Repasse para a Matriz / Sede:
                      </td>
                      <td className="py-1 px-1 text-right font-mono text-slate-500">
                        ISENTO / NÃO APLICADO (0%)
                      </td>
                    </tr>
                    <tr className="bg-emerald-100 font-black border-t-2 border-slate-900 text-emerald-950">
                      <td className="py-2 px-1">SALDO TOTAL DA CONGREGAÇÃO:</td>
                      <td className="py-2 px-1 text-right font-mono text-sm text-emerald-900">{formatCurrency(resumo.saldoLiquido)}</td>
                    </tr>
                  </>
                )}
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
              <div className="border-t border-slate-800 pt-1 font-bold">
                {fechamento.pastorPresidente || config.pastorPresidente || 'Pastor Presidente'}
              </div>
              <p className="text-slate-600">Pastor Presidente</p>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                {fechamento.tesoureiro || config.tesoureiroPadrao || 'Tesoureiro'}
              </div>
              <p className="text-slate-600">Tesoureiro</p>
            </div>
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                {fechamento.pastorLocal || config.pastorLocal || 'Pastor Local'}
              </div>
              <p className="text-slate-600">Pastor Local</p>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-200">
            Documento emitido pelo Sistema de Tesouraria em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  );
};
